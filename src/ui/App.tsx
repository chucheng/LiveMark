import { onMount, onCleanup, createSignal, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createEditor, type EditorInstance, type CursorPosition } from "../editor/editor";
import { documentState } from "../state/document";
import { uiState } from "../state/ui";
import { themeState } from "../state/theme";
import { preferencesState } from "../state/preferences";
import {
  openFile,
  saveFile,
  saveAsFile,
  newFile,
  loadFile,
  setEditorRef,
  onFileChange,
  confirmUnsavedChanges,
  silentSave,
} from "../commands/file-commands";
import {
  exportHTML,
  exportPDF,
  copyAsHTML,
  copyAsMarkdown,
  setExportEditorRef,
} from "../commands/export-commands";
import { registerAllCommands } from "../commands/all-commands";
import StatusBar, { type CursorInfo } from "./StatusBar";
import CommandPalette from "./CommandPalette";
import FindReplace from "./FindReplace";
import SourceView from "./SourceView";
import AboutModal from "./AboutModal";
import ReviewPanel from "./ReviewPanel";
import { buildSyncMap, pmPosToMdLine, mdLineToPmPos } from "./scroll-sync";
import type { EditorView } from "prosemirror-view";

/**
 * Get the markdown line number (fractional) at the top of the editor viewport.
 */
function getEditorTopLine(view: EditorView, scroller: HTMLElement): number {
  const rect = scroller.getBoundingClientRect();
  const pos = view.posAtCoords({ left: rect.left + 20, top: rect.top + 4 });
  if (!pos) return 0;

  const map = buildSyncMap(view.state.doc);
  return pmPosToMdLine(map, pos.pos);
}

/**
 * Scroll the editor so a given markdown line number is at the top.
 */
function scrollEditorToLine(view: EditorView, scroller: HTMLElement, mdLine: number): void {
  const doc = view.state.doc;
  const map = buildSyncMap(doc);
  if (map.length === 0) return;

  const targetPos = mdLineToPmPos(map, mdLine, doc.content.size);

  try {
    const coords = view.coordsAtPos(targetPos);
    const scrollerRect = scroller.getBoundingClientRect();
    scroller.scrollTop = coords.top - scrollerRect.top + scroller.scrollTop;
  } catch {
    // ignore
  }
}

export default function App() {
  let editorRef!: HTMLDivElement;
  let editor: EditorInstance | undefined;
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  let autoSaveFadeTimer: ReturnType<typeof setTimeout> | null = null;
  const AUTO_SAVE_DELAY = 30_000;
  const [wordCount, setWordCount] = createSignal(0);
  const [cursorInfo, setCursorInfo] = createSignal<CursorInfo>({
    line: 1,
    col: 1,
    selected: 0,
  });
  const [syncLine, setSyncLine] = createSignal(0);
  const [autoSaveStatus, setAutoSaveStatus] = createSignal("");

  function resetAutoSaveTimer() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    if (!preferencesState.autoSave()) return;
    autoSaveTimer = setTimeout(async () => {
      const saved = await silentSave();
      if (saved) {
        setAutoSaveStatus("Auto-saved");
        if (autoSaveFadeTimer) clearTimeout(autoSaveFadeTimer);
        autoSaveFadeTimer = setTimeout(() => setAutoSaveStatus(""), 2000);
      }
    }, AUTO_SAVE_DELAY);
  }

  function countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
  }

  function handleKeydown(e: KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;

    if (e.key === "o") {
      e.preventDefault();
      openFile();
    } else if (e.key === "s" && e.shiftKey) {
      e.preventDefault();
      saveAsFile();
    } else if (e.key === "s" && !e.shiftKey) {
      e.preventDefault();
      saveFile();
    } else if (e.key === "n") {
      e.preventDefault();
      newFile();
    } else if (e.key === "E" && e.shiftKey) {
      e.preventDefault();
      exportHTML();
    } else if (e.key === "p" && e.shiftKey) {
      // Cmd+Shift+P → command palette
      e.preventDefault();
      uiState.togglePalette();
    } else if (e.key === "p" && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      exportPDF();
    } else if (e.key === "C" && e.shiftKey && !e.altKey) {
      e.preventDefault();
      copyAsHTML();
    } else if (e.key === "c" && e.altKey) {
      e.preventDefault();
      copyAsMarkdown();
    } else if (e.key === "T" && e.shiftKey) {
      e.preventDefault();
      themeState.cycleTheme();
      preferencesState.savePreferences();
    } else if (e.key === "/" && !e.shiftKey) {
      e.preventDefault();
      const editorScroller = editor?.view.dom.closest(".lm-editor-wrapper") as HTMLElement | null;
      if (uiState.isSourceView()) {
        // Source → Editor: syncLine is kept up-to-date by SourceView's onScroll
        uiState.toggleSourceView();
        requestAnimationFrame(() => {
          if (editor && editorScroller) {
            scrollEditorToLine(editor.view, editorScroller, syncLine());
          }
        });
      } else {
        // Editor → Source: find which markdown line is at the top of the viewport
        if (editor && editorScroller) {
          setSyncLine(getEditorTopLine(editor.view, editorScroller));
        }
        uiState.toggleSourceView();
      }
    } else if (e.key === "f" && !e.shiftKey) {
      e.preventDefault();
      uiState.toggleFind();
    } else if (e.key === "F" && e.shiftKey) {
      e.preventDefault();
      preferencesState.toggleFocusMode();
    } else if (e.key === "R" && e.shiftKey) {
      e.preventDefault();
      uiState.toggleReview();
    }
  }

  let unlistenClose: (() => void) | undefined;

  onMount(() => {
    // Register all commands for the palette
    registerAllCommands();

    // Create editor synchronously — must happen before any async work
    editor = createEditor(editorRef, {
      onChange(doc) {
        documentState.setDirty();
        const text = doc.textContent;
        setWordCount(countWords(text));
        resetAutoSaveTimer();
      },
      onSelectionChange(pos) {
        setCursorInfo(pos);
      },
    });

    setEditorRef(editor);
    setExportEditorRef(editor);
    onFileChange(() => setSyncLine(0));

    // Initial word count
    const text = editor.getDoc().textContent;
    setWordCount(countWords(text));
    editor.view.focus();

    // Global keyboard shortcuts for file operations
    window.addEventListener("keydown", handleKeydown);

    // Async initialization (preferences, CLI file, close handler)
    (async () => {
      await preferencesState.loadPreferences();

      // Check for CLI-provided file path
      try {
        const initialFile = await invoke<string | null>("get_initial_file");
        if (initialFile) {
          await loadFile(initialFile);
        }
      } catch {
        // No initial file — start with empty editor
      }

      // Window close handler — prompt for unsaved changes
      const appWindow = getCurrentWindow();
      unlistenClose = await appWindow.onCloseRequested(async (event) => {
        if (documentState.isModified()) {
          const canClose = await confirmUnsavedChanges();
          if (!canClose) {
            event.preventDefault();
          }
        }
      });
    })();
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeydown);
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    if (autoSaveFadeTimer) clearTimeout(autoSaveFadeTimer);
    unlistenClose?.();
    editor?.destroy();
  });

  return (
    <div class="lm-app">
      <div class="lm-titlebar">
        <div class="lm-titlebar-traffic-light-spacer" />
        <span class="lm-titlebar-title">
          {documentState.fileName()}
          {documentState.isModified() ? " ●" : ""}
        </span>
      </div>

      <div class="lm-main-area">
        <div
          class="lm-editor-wrapper"
          classList={{
            "lm-focus-mode": preferencesState.focusMode(),
            "lm-hidden": uiState.isSourceView(),
          }}
        >
          <Show when={uiState.isFindOpen()}>
            <FindReplace view={() => editor?.view} />
          </Show>
          <div ref={editorRef} class="lm-editor-mount" />
        </div>
        <Show when={uiState.isSourceView()}>
          <SourceView markdown={() => editor?.getMarkdown() ?? ""} initialLine={syncLine} onTopLineChange={setSyncLine} />
        </Show>

        <Show when={uiState.isReviewOpen()}>
          <ReviewPanel view={() => editor?.view} />
        </Show>
      </div>

      <Show when={uiState.isPaletteOpen()}>
        <CommandPalette />
      </Show>

      <Show when={uiState.isAboutOpen()}>
        <AboutModal />
      </Show>

      <StatusBar wordCount={wordCount} cursorInfo={cursorInfo} autoSaveStatus={autoSaveStatus} />
    </div>
  );
}

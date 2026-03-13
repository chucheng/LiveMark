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
  const [markdown, setMarkdown] = createSignal("");
  const [contentFraction, setContentFraction] = createSignal(0);
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
      if (uiState.isSourceView()) {
        // Switching back to editor — scroll to matching content position
        uiState.toggleSourceView();
        requestAnimationFrame(() => {
          if (!editor) return;
          const view = editor.view;
          const docSize = view.state.doc.content.size;
          if (docSize <= 0) return;
          const targetPos = Math.min(
            Math.floor(contentFraction() * docSize),
            docSize - 1
          );
          // Clamp to a valid position
          const resolvedPos = Math.max(0, targetPos);
          try {
            const coords = view.coordsAtPos(resolvedPos);
            const pm = view.dom as HTMLElement;
            const editorRect = pm.getBoundingClientRect();
            pm.scrollTop += coords.top - editorRect.top;
          } catch {
            // Fallback: use fraction-based scroll
            const pm = view.dom as HTMLElement;
            pm.scrollTop = contentFraction() * (pm.scrollHeight - pm.clientHeight);
          }
        });
      } else {
        // Switching to source view — compute content fraction from viewport top
        if (editor) {
          const view = editor.view;
          const pm = view.dom as HTMLElement;
          const rect = pm.getBoundingClientRect();
          const topPos = view.posAtCoords({ left: rect.left + 1, top: rect.top + 1 });
          const docSize = view.state.doc.content.size;
          if (topPos && docSize > 0) {
            setContentFraction(Math.min(1, Math.max(0, topPos.pos / docSize)));
          } else {
            setContentFraction(0);
          }
        }
        setMarkdown(editor?.getMarkdown() ?? "");
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
      const unlisten = await appWindow.onCloseRequested(async (event) => {
        if (documentState.isModified()) {
          const canClose = await confirmUnsavedChanges();
          if (!canClose) {
            event.preventDefault();
          }
        }
      });

      onCleanup(() => {
        unlisten();
      });
    })();
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeydown);
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    if (autoSaveFadeTimer) clearTimeout(autoSaveFadeTimer);
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
          <SourceView markdown={() => editor?.getMarkdown() ?? ""} contentFraction={contentFraction} onContentFractionChange={setContentFraction} />
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

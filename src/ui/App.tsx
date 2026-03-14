import { onMount, onCleanup, createSignal, createEffect, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { createEditor, type EditorInstance } from "../editor/editor";
import { documentState } from "../state/document";
import { tabsState } from "../state/tabs";
import { uiState } from "../state/ui";
import { themeState } from "../state/theme";
import { preferencesState } from "../state/preferences";
import {
  openFile,
  openFileInTab,
  saveFile,
  saveAsFile,
  newFile,
  setEditorRef,
  onFileChange,
  onTabSwitch,
  closeActiveTab,
  closeTabById,
  confirmAllUnsavedChanges,
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
import TabBar from "./TabBar";
import Sidebar from "./Sidebar";
import BlockContextMenu from "./BlockContextMenu";
import BlockTypePicker from "./BlockTypePicker";
import MindMap from "./MindMap";
import { fileTreeState } from "../state/filetree";
import { startFileWatch, stopFileWatch } from "../state/file-watch";
import { buildSyncMap, pmPosToMdLine, mdLineToPmPos } from "./scroll-sync";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { EditorView } from "prosemirror-view";

function getEditorTopLine(view: EditorView, scroller: HTMLElement): number {
  const scrollerRect = scroller.getBoundingClientRect();
  const editorRect = view.dom.getBoundingClientRect();
  const pos = view.posAtCoords({ left: editorRect.left + 20, top: scrollerRect.top + 4 });
  if (!pos) return 0;
  const map = buildSyncMap(view.state.doc);
  return pmPosToMdLine(map, pos.pos);
}

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
  let tabSwitching = false;
  const AUTO_SAVE_DELAY = 30_000;
  const [wordCount, setWordCount] = createSignal(0);
  const [cursorInfo, setCursorInfo] = createSignal<CursorInfo>({
    line: 1,
    col: 1,
    selected: 0,
  });
  const [syncLine, setSyncLine] = createSignal(0);
  const [autoSaveStatus, setAutoSaveStatus] = createSignal("");
  /** Format a file path for the title bar — abbreviate home dir with ~/ */
  function displayPath(): string {
    const fp = documentState.filePath();
    if (!fp) return "Untitled";
    const home = "/Users/" + fp.split("/")[2];
    if (fp.startsWith(home + "/")) {
      return "~/" + fp.slice(home.length + 1);
    }
    return fp;
  }

  createEffect(() => {
    const fs = preferencesState.fontSize();
    const cw = preferencesState.contentWidth();
    document.documentElement.style.setProperty("--lm-font-size", fs + "px");
    document.documentElement.style.setProperty("--lm-content-width", (cw * fs / 16) + "px");
  });

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

  function updateWordCount() {
    if (!editor) return;
    const text = editor.getDoc().textContent;
    setWordCount(countWords(text));
  }

  /**
   * Restore editor state when switching to a tab.
   */
  async function restoreTabState() {
    if (!editor) return;
    const tab = tabsState.activeTab();
    if (!tab) return;

    if (tab.editorState) {
      // Restore the saved editor state
      editor.view.updateState(tab.editorState);
      // Restore scroll position after state update
      const scroller = editor.view.dom.closest(".lm-editor-wrapper") as HTMLElement | null;
      if (scroller) {
        requestAnimationFrame(() => {
          scroller.scrollTop = tab.scrollPosition;
        });
      }
    } else if (tab.filePath) {
      // Tab has a file but no saved editor state — reload from disk
      try {
        const content = await invoke<string>("read_file", { path: tab.filePath });
        editor.setMarkdown(content);
      } catch {
        // File may have been deleted — show empty
        editor.setMarkdown("");
      }
    } else {
      // New untitled tab
      editor.setMarkdown("");
    }

    updateWordCount();
    editor.view.focus();
  }

  async function handleTabSwitch() {
    if (tabSwitching) return;
    tabSwitching = true;
    try {
      await restoreTabState();
    } finally {
      tabSwitching = false;
    }
  }

  async function handleCloseTab(tabId: string) {
    if (!editor) return;

    // Snapshot current tab before any operations
    const scroller = editor.view.dom.closest(".lm-editor-wrapper") as HTMLElement | null;
    tabsState.snapshotActiveTab(editor.view, scroller);

    await closeTabById(tabId);
  }

  async function handleOpenFolder() {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: "Open Folder",
    });
    if (selected) {
      await fileTreeState.openFolder(selected);
    }
  }

  function handleSwitchTab(tabId: string) {
    if (!editor) return;
    const scroller = editor.view.dom.closest(".lm-editor-wrapper") as HTMLElement | null;
    tabsState.snapshotActiveTab(editor.view, scroller);
    tabsState.switchTab(tabId);
    handleTabSwitch();
  }

  function handleSidebarFileClick(path: string) {
    openFileInTab(path);
  }

  function handleKeydown(e: KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;

    if (e.key === "o" && e.shiftKey) {
      // Cmd+Shift+O — open folder
      e.preventDefault();
      handleOpenFolder();
      return;
    } else if (e.key === "o") {
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
    } else if (e.key === "w") {
      e.preventDefault();
      closeActiveTab();
    } else if (e.key === "E" && e.shiftKey) {
      e.preventDefault();
      exportHTML();
    } else if (e.key === "p" && e.shiftKey) {
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
    } else if (e.key === "t" && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      uiState.toggleMindMap();
    } else if (e.key === "T" && e.shiftKey) {
      e.preventDefault();
      themeState.cycleTheme();
      preferencesState.savePreferences();
    } else if (e.key === "/" && !e.shiftKey) {
      e.preventDefault();
      const editorScroller = editor?.view.dom.closest(".lm-editor-wrapper") as HTMLElement | null;
      if (uiState.isSourceView()) {
        uiState.toggleSourceView();
        requestAnimationFrame(() => {
          if (editor && editorScroller) {
            scrollEditorToLine(editor.view, editorScroller, syncLine());
          }
        });
      } else {
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
    } else if (e.key === "=" || e.key === "+") {
      e.preventDefault();
      preferencesState.zoomIn();
    } else if (e.key === "-") {
      e.preventDefault();
      preferencesState.zoomOut();
    } else if (e.key === "0" && !e.shiftKey) {
      e.preventDefault();
      preferencesState.resetZoom();
    } else if (e.key === "\\") {
      // Cmd+\ — toggle sidebar
      e.preventDefault();
      fileTreeState.toggleSidebar();
    } else if (e.key === "[" && e.shiftKey) {
      // Cmd+Shift+[ — previous tab
      e.preventDefault();
      if (editor) {
        const scroller = editor.view.dom.closest(".lm-editor-wrapper") as HTMLElement | null;
        tabsState.snapshotActiveTab(editor.view, scroller);
      }
      tabsState.switchTabRelative(-1);
      handleTabSwitch();
    } else if (e.key === "]" && e.shiftKey) {
      // Cmd+Shift+] — next tab
      e.preventDefault();
      if (editor) {
        const scroller = editor.view.dom.closest(".lm-editor-wrapper") as HTMLElement | null;
        tabsState.snapshotActiveTab(editor.view, scroller);
      }
      tabsState.switchTabRelative(1);
      handleTabSwitch();
    } else if (/^[1-9]$/.test(e.key) && !e.shiftKey && !e.altKey) {
      // Cmd+1-9 — switch to tab by index
      e.preventDefault();
      const idx = parseInt(e.key) - 1;
      if (idx < tabsState.tabs().length) {
        if (editor) {
          const scroller = editor.view.dom.closest(".lm-editor-wrapper") as HTMLElement | null;
          tabsState.snapshotActiveTab(editor.view, scroller);
        }
        tabsState.switchTabByIndex(idx);
        handleTabSwitch();
      }
    }
  }

  let unlistenClose: (() => void) | undefined;
  let unlistenResize: (() => void) | undefined;
  let unlistenOpenFiles: (() => void) | undefined;
  let chromeHideTimer: ReturnType<typeof setTimeout> | null = null;
  let chromeLeaveTimer: ReturnType<typeof setTimeout> | null = null;

  async function checkFullscreen() {
    const fs = await getCurrentWindow().isFullscreen();
    uiState.setFullscreen(fs);
    if (!fs) uiState.showChrome();
  }

  function handleMouseMove(e: MouseEvent) {
    if (!uiState.isFullscreen()) return;
    if (e.clientY < 5) {
      // Mouse at top edge — show chrome
      if (chromeLeaveTimer) { clearTimeout(chromeLeaveTimer); chromeLeaveTimer = null; }
      uiState.showChrome();
    }
  }

  function handleChromeMouseEnter() {
    if (chromeLeaveTimer) { clearTimeout(chromeLeaveTimer); chromeLeaveTimer = null; }
  }

  function handleChromeMouseLeave() {
    if (!uiState.isFullscreen()) return;
    chromeLeaveTimer = setTimeout(() => {
      uiState.hideChrome();
    }, 400);
  }

  function scheduleHideChrome() {
    if (!uiState.isFullscreen() || uiState.chromeHidden()) return;
    if (chromeHideTimer) clearTimeout(chromeHideTimer);
    chromeHideTimer = setTimeout(() => {
      uiState.hideChrome();
    }, 1500);
  }

  onMount(() => {
    registerAllCommands();

    // Only create an untitled tab if no tabs exist (avoid duplicates on HMR reload)
    if (tabsState.tabs().length === 0) {
      tabsState.createTab();
    }

    editor = createEditor(editorRef, {
      onChange(doc) {
        documentState.setDirty();
        const text = doc.textContent;
        setWordCount(countWords(text));
        resetAutoSaveTimer();
        scheduleHideChrome();
      },
      onSelectionChange(pos) {
        setCursorInfo(pos);
        scheduleHideChrome();
      },
    });

    setEditorRef(editor);
    setExportEditorRef(editor);
    onFileChange(() => setSyncLine(0));
    onTabSwitch(() => handleTabSwitch());

    // Restore active tab content (handles HMR reload where tabs persist but editor is new)
    if (tabsState.tabs().length > 0) {
      restoreTabState();
    }

    // Initial word count
    const text = editor.getDoc().textContent;
    setWordCount(countWords(text));
    editor.view.focus();

    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("mousemove", handleMouseMove);

    (async () => {
      await preferencesState.loadPreferences();

      // Fullscreen detection
      const appWindow = getCurrentWindow();
      await checkFullscreen();
      unlistenResize = await appWindow.onResized(() => checkFullscreen());

      try {
        const initialFiles = await invoke<string[]>("get_initial_files");
        for (const file of initialFiles) {
          await openFileInTab(file);
        }
      } catch {
        // No initial files
      }

      // Listen for files opened from a second instance (e.g. double-clicking
      // a .md file in Finder while the app is already running)
      unlistenOpenFiles = await listen<string[]>("open-files", async (event) => {
        for (const file of event.payload) {
          await openFileInTab(file);
        }
      });

      startFileWatch();

      unlistenClose = await appWindow.onCloseRequested(async (event) => {
        const canClose = await confirmAllUnsavedChanges();
        if (!canClose) {
          event.preventDefault();
        }
      });
    })();
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("mousemove", handleMouseMove);
    stopFileWatch();
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    if (autoSaveFadeTimer) clearTimeout(autoSaveFadeTimer);
    if (chromeHideTimer) clearTimeout(chromeHideTimer);
    if (chromeLeaveTimer) clearTimeout(chromeLeaveTimer);
    unlistenClose?.();
    unlistenResize?.();
    unlistenOpenFiles?.();
    editor?.destroy();
  });

  return (
    <div
      class="lm-app"
      classList={{
        "lm-fullscreen": uiState.isFullscreen(),
        "lm-chrome-hidden": uiState.isFullscreen() && uiState.chromeHidden(),
      }}
    >
      <div
        class="lm-chrome"
        onMouseEnter={handleChromeMouseEnter}
        onMouseLeave={handleChromeMouseLeave}
      >
        <div class="lm-titlebar">
          <div class="lm-titlebar-traffic-light-spacer" />
          <span class="lm-titlebar-title">
            {displayPath()}
            {documentState.isModified() ? " ●" : ""}
          </span>
          <div class="lm-titlebar-traffic-light-spacer" />
        </div>

        <TabBar onCloseTab={handleCloseTab} onSwitchTab={handleSwitchTab} />
      </div>

      <div class="lm-main-area">
        <Sidebar onFileClick={handleSidebarFileClick} />
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

      <Show when={uiState.isMindMapOpen()}>
        <MindMap view={() => editor?.view} onClose={() => uiState.setMindMapOpen(false)} />
      </Show>

      <BlockContextMenu view={() => editor?.view} />
      <BlockTypePicker view={() => editor?.view} />

      <StatusBar wordCount={wordCount} cursorInfo={cursorInfo} autoSaveStatus={autoSaveStatus} />
    </div>
  );
}

import { onMount, onCleanup, createSignal } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createEditor, type EditorInstance } from "../editor/editor";
import { documentState } from "../state/document";
import {
  openFile,
  saveFile,
  saveAsFile,
  newFile,
  loadFile,
  setEditorRef,
  confirmUnsavedChanges,
} from "../commands/file-commands";
import {
  exportHTML,
  exportPDF,
  copyAsHTML,
  copyAsMarkdown,
  setExportEditorRef,
} from "../commands/export-commands";

export default function App() {
  let editorRef!: HTMLDivElement;
  let editor: EditorInstance | undefined;
  const [wordCount, setWordCount] = createSignal(0);

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
    } else if (e.key === "s") {
      e.preventDefault();
      saveFile();
    } else if (e.key === "n") {
      e.preventDefault();
      newFile();
    } else if (e.key === "E" && e.shiftKey) {
      e.preventDefault();
      exportHTML();
    } else if (e.key === "p" && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      exportPDF();
    } else if (e.key === "C" && e.shiftKey && !e.altKey) {
      e.preventDefault();
      copyAsHTML();
    } else if (e.key === "c" && e.altKey) {
      e.preventDefault();
      copyAsMarkdown();
    }
  }

  onMount(async () => {
    editor = createEditor(editorRef, {
      onChange(doc) {
        documentState.setDirty();
        const text = doc.textContent;
        setWordCount(countWords(text));
      },
    });

    setEditorRef(editor);
    setExportEditorRef(editor);

    // Check for CLI-provided file path
    try {
      const initialFile = await invoke<string | null>("get_initial_file");
      if (initialFile) {
        await loadFile(initialFile);
      }
    } catch {
      // No initial file — start with empty editor
    }

    // Initial word count
    const text = editor.getDoc().textContent;
    setWordCount(countWords(text));
    editor.view.focus();

    // Global keyboard shortcuts for file operations
    window.addEventListener("keydown", handleKeydown);

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
  });

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeydown);
    editor?.destroy();
  });

  return (
    <div class="lm-app">
      <div class="lm-titlebar">
        <span class="lm-titlebar-title">
          LiveMark — {documentState.fileName()}
          {documentState.isModified() ? " ●" : ""}
        </span>
      </div>
      <div class="lm-editor-wrapper">
        <div ref={editorRef} />
      </div>
      <div class="lm-statusbar">
        <span>{wordCount()} words</span>
      </div>
    </div>
  );
}

import { invoke } from "@tauri-apps/api/core";
import { open, save, message } from "@tauri-apps/plugin-dialog";
import { documentState } from "../state/document";
import type { EditorInstance } from "../editor/editor";

const MD_FILTERS = [
  { name: "Markdown", extensions: ["md", "markdown"] },
  { name: "Text", extensions: ["txt"] },
  { name: "All Files", extensions: ["*"] },
];

let editorRef: EditorInstance | null = null;

export function setEditorRef(editor: EditorInstance) {
  editorRef = editor;
}

export async function openFile() {
  if (!(await confirmUnsavedChanges())) return;

  const selected = await open({
    multiple: false,
    filters: MD_FILTERS,
  });

  if (!selected) return;

  await loadFile(selected);
}

export async function loadFile(path: string) {
  try {
    const content = await invoke<string>("read_file", { path });
    if (!editorRef) return;

    editorRef.setMarkdown(content);
    documentState.setFilePath(path);
    documentState.setClean();
  } catch (err) {
    await message(`Failed to open file:\n${err}`, {
      title: "Open Error",
      kind: "error",
    });
  }
}

export async function saveFile() {
  if (!editorRef) return;

  const path = documentState.filePath();
  if (path) {
    try {
      const content = editorRef.getMarkdown();
      await invoke("write_file", { path, content });
      documentState.setClean();
    } catch (err) {
      await message(`Failed to save file:\n${err}`, {
        title: "Save Error",
        kind: "error",
      });
    }
  } else {
    await saveAsFile();
  }
}

export async function saveAsFile() {
  if (!editorRef) return;

  const selected = await save({
    filters: MD_FILTERS,
    defaultPath: documentState.fileName(),
  });

  if (!selected) return;

  try {
    const content = editorRef.getMarkdown();
    await invoke("write_file", { path: selected, content });
    documentState.setFilePath(selected);
    documentState.setClean();
  } catch (err) {
    await message(`Failed to save file:\n${err}`, {
      title: "Save Error",
      kind: "error",
    });
  }
}

export async function newFile() {
  if (!(await confirmUnsavedChanges())) return;
  if (!editorRef) return;

  editorRef.setMarkdown("");
  documentState.reset();
}

/**
 * Returns true if it's safe to proceed (saved, discarded, or not dirty).
 * Returns false if the user cancelled.
 */
export async function confirmUnsavedChanges(): Promise<boolean> {
  if (!documentState.isModified()) return true;

  const result = await message(
    `"${documentState.fileName()}" has unsaved changes. Do you want to save before continuing?`,
    {
      title: "Unsaved Changes",
      kind: "warning",
      buttons: {
        yes: "Save",
        no: "Don't Save",
        cancel: "Cancel",
      },
    }
  );

  if (result === "Yes") {
    await saveFile();
    return true;
  }

  if (result === "No") {
    // Proceed without saving
    return true;
  }

  // Cancel or closed dialog
  return false;
}

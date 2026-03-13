import { invoke } from "@tauri-apps/api/core";
import { open, save, message } from "@tauri-apps/plugin-dialog";
import { documentState } from "../state/document";
import { tabsState } from "../state/tabs";
import type { EditorInstance } from "../editor/editor";

const MD_FILTERS = [
  { name: "Markdown", extensions: ["md", "markdown"] },
  { name: "Text", extensions: ["txt"] },
  { name: "All Files", extensions: ["*"] },
];

/** Extensions we can safely open as plain text in the editor. */
const OPENABLE_EXTENSIONS = new Set([
  "md", "markdown", "txt", "text",
  "html", "htm",
  "css", "js", "ts", "jsx", "tsx",
  "json", "yaml", "yml", "toml", "xml", "csv", "tsv",
  "sh", "bash", "zsh", "fish",
  "py", "rb", "rs", "go", "java", "c", "cpp", "h", "hpp",
  "swift", "kt", "lua", "r", "sql", "graphql",
  "env", "ini", "cfg", "conf", "log",
  "gitignore", "gitattributes", "editorconfig",
  "dockerfile", "makefile",
]);

/** Check if a file path can be opened as text. */
function isOpenableFile(path: string): boolean {
  const name = path.split("/").pop()?.toLowerCase() ?? "";
  // Dotfiles without extensions (e.g. .gitignore, .editorconfig)
  if (name.startsWith(".") && !name.includes(".", 1)) {
    const bare = name.slice(1);
    return OPENABLE_EXTENSIONS.has(bare);
  }
  // Files without extension — treat as plain text
  if (!name.includes(".")) return true;
  const ext = name.split(".").pop() ?? "";
  return OPENABLE_EXTENSIONS.has(ext);
}

export { isOpenableFile };

let editorRef: EditorInstance | null = null;
let onFileChangeCallback: (() => void) | null = null;
let onTabSwitchCallback: (() => void) | null = null;

export function setEditorRef(editor: EditorInstance) {
  editorRef = editor;
}

export function onFileChange(cb: () => void) {
  onFileChangeCallback = cb;
}

export function onTabSwitch(cb: () => void) {
  onTabSwitchCallback = cb;
}

export async function openFile() {
  const selected = await open({
    multiple: false,
    filters: MD_FILTERS,
  });

  if (!selected) return;

  await openFileInTab(selected);
}

/**
 * Open a file in a tab. If already open, switch to it.
 */
export async function openFileInTab(path: string) {
  // Check if already open
  const existing = tabsState.findTabByPath(path);
  if (existing) {
    tabsState.switchTab(existing.id);
    onTabSwitchCallback?.();
    return;
  }

  // Guard: only open text-based files
  if (!isOpenableFile(path)) {
    const name = path.split("/").pop() ?? path;
    await message(
      `"${name}" is not a supported text file and cannot be opened in the editor.`,
      { title: "Unsupported File", kind: "info" },
    );
    return;
  }

  try {
    const content = await invoke<string>("read_file", { path });
    if (!editorRef) return;

    // If current tab is untitled and unmodified, reuse it
    const active = tabsState.activeTab();
    if (active && !active.filePath && !active.isModified) {
      editorRef.setMarkdown(content);
      tabsState.setActiveFilePath(path);
      tabsState.setActiveClean();
      // Immediately snapshot so the tab has a saved editor state
      tabsState.snapshotActiveTab(editorRef.view, null);
      onFileChangeCallback?.();
      return;
    }

    // Snapshot current tab state
    const scroller = editorRef.view.dom.closest(".lm-editor-wrapper") as HTMLElement | null;
    tabsState.snapshotActiveTab(editorRef.view, scroller);

    // Create new tab
    tabsState.createTab(path);

    // Load content
    editorRef.setMarkdown(content);
    tabsState.setActiveClean();
    // Immediately snapshot so the tab has a saved editor state
    tabsState.snapshotActiveTab(editorRef.view, null);
    onFileChangeCallback?.();
  } catch (err) {
    const errStr = String(err);
    const msg = errStr.includes("valid UTF-8")
      ? `"${path.split("/").pop()}" appears to be a binary file and cannot be opened as text.`
      : `Failed to open file:\n${err}`;
    await message(msg, {
      title: "Open Error",
      kind: "error",
    });
  }
}

export async function loadFile(path: string) {
  try {
    const content = await invoke<string>("read_file", { path });
    if (!editorRef) return;

    editorRef.setMarkdown(content);
    documentState.setFilePath(path);
    documentState.setClean();
    // Snapshot immediately so the tab has a saved editor state
    tabsState.snapshotActiveTab(editorRef.view, null);
    onFileChangeCallback?.();
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

/** Silent save for auto-save — no error dialogs, returns success boolean. */
export async function silentSave(): Promise<boolean> {
  if (!editorRef) return false;
  const path = documentState.filePath();
  if (!path) return false;
  if (!documentState.isModified()) return false;
  try {
    const content = editorRef.getMarkdown();
    await invoke("write_file", { path, content });
    documentState.setClean();
    return true;
  } catch {
    return false;
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
  if (!editorRef) return;

  // If current tab is untitled and unmodified, just clear it
  const active = tabsState.activeTab();
  if (active && !active.filePath && !active.isModified) {
    editorRef.setMarkdown("");
    onFileChangeCallback?.();
    return;
  }

  // Snapshot current tab state
  const scroller = editorRef.view.dom.closest(".lm-editor-wrapper") as HTMLElement | null;
  tabsState.snapshotActiveTab(editorRef.view, scroller);

  // Create new tab
  tabsState.createTab();
  editorRef.setMarkdown("");
  onFileChangeCallback?.();
}

/**
 * Close the active tab. Prompts to save if modified.
 * Returns true if the tab was actually closed.
 */
export async function closeActiveTab(): Promise<boolean> {
  const active = tabsState.activeTab();
  if (!active) return false;

  if (active.isModified) {
    const canClose = await confirmUnsavedChanges();
    if (!canClose) return false;
  }

  return performCloseTab(active.id);
}

/**
 * Close a specific tab by ID. Prompts to save if modified.
 */
export async function closeTabById(tabId: string): Promise<boolean> {
  const tab = tabsState.tabs().find((t) => t.id === tabId);
  if (!tab) return false;

  if (tab.isModified) {
    // Switch to the tab first so the user can see what they're saving
    tabsState.switchTab(tabId);
    onTabSwitchCallback?.();
    const canClose = await confirmUnsavedChanges();
    if (!canClose) return false;
  }

  return performCloseTab(tabId);
}

function performCloseTab(tabId: string): boolean {
  if (!editorRef) return false;

  const newTab = tabsState.closeTab(tabId);

  if (newTab) {
    // Last tab was closed, new untitled created
    editorRef.setMarkdown("");
    onFileChangeCallback?.();
  } else {
    // Switched to an adjacent tab — restore its state
    onTabSwitchCallback?.();
  }

  return true;
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

  if (result === "Save") {
    await saveFile();
    return true;
  }

  if (result === "Don't Save") {
    return true;
  }

  return false;
}

/**
 * Check all tabs for unsaved changes before closing window.
 */
export async function confirmAllUnsavedChanges(): Promise<boolean> {
  const modifiedTabs = tabsState.tabs().filter((t) => t.isModified);
  if (modifiedTabs.length === 0) return true;

  if (modifiedTabs.length === 1) {
    tabsState.switchTab(modifiedTabs[0].id);
    onTabSwitchCallback?.();
    return confirmUnsavedChanges();
  }

  // Multiple unsaved tabs
  const result = await message(
    `You have ${modifiedTabs.length} unsaved files. Do you want to save all before closing?`,
    {
      title: "Unsaved Changes",
      kind: "warning",
      buttons: {
        yes: "Save All",
        no: "Don't Save",
        cancel: "Cancel",
      },
    }
  );

  if (result === "Save All") {
    for (const tab of modifiedTabs) {
      if (tab.filePath && editorRef) {
        // We need to serialize the tab's content
        // For the active tab, we can use the editor directly
        // For other tabs, their content is in the snapshotted state
        if (tab.id === tabsState.activeTabId()) {
          await saveFile();
        } else if (tab.editorState) {
          const { serializeMarkdown } = await import("../editor/markdown/serializer");
          const content = serializeMarkdown(tab.editorState.doc);
          try {
            await invoke("write_file", { path: tab.filePath, content });
            tabsState.updateTab(tab.id, { isModified: false });
          } catch {
            // Continue with other tabs
          }
        }
      }
    }
    return true;
  }

  if (result === "Don't Save") {
    return true;
  }

  return false;
}

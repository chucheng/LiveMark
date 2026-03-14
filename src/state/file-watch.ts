import { invoke } from "@tauri-apps/api/core";
import { message } from "@tauri-apps/plugin-dialog";
import { tabsState } from "./tabs";
import { getEditorRef } from "../commands/file-commands";

const lastKnownMtime = new Map<string, number>();

let pollTimer: ReturnType<typeof setInterval> | null = null;
let checking = false;

const POLL_INTERVAL = 3000;

/** Record the current mtime for a file path (call after read/write). */
export async function stampMtime(path: string): Promise<void> {
  try {
    const mtime = await invoke<number>("get_file_mtime", { path });
    lastKnownMtime.set(path, mtime);
  } catch {
    // File may not exist yet (save-as to new path) — ignore
  }
}

/** Remove tracking for a file path (call when tab closes). */
export function clearMtime(path: string): void {
  lastKnownMtime.delete(path);
}

/** Check all open tabs for external changes. */
async function checkForChanges(): Promise<void> {
  if (checking) return;
  checking = true;

  try {
    const allTabs = tabsState.tabs();
    for (const tab of allTabs) {
      if (!tab.filePath) continue;
      const stored = lastKnownMtime.get(tab.filePath);
      if (stored === undefined) continue;

      let diskMtime: number;
      try {
        diskMtime = await invoke<number>("get_file_mtime", { path: tab.filePath });
      } catch {
        // File deleted or inaccessible — skip
        continue;
      }

      if (diskMtime <= stored) continue;

      // External change detected
      const isActive = tab.id === tabsState.activeTabId();

      if (tab.isModified) {
        // Dirty buffer — prompt user
        await handleDirtyReload(tab.id, tab.filePath, tab.fileName, isActive);
      } else {
        // Clean buffer — silent reload
        await handleCleanReload(tab.id, tab.filePath, isActive);
      }
    }
  } finally {
    checking = false;
  }
}

async function handleCleanReload(tabId: string, filePath: string, isActive: boolean): Promise<void> {
  try {
    const content = await invoke<string>("read_file", { path: filePath });
    await stampMtime(filePath);

    if (isActive) {
      const editor = getEditorRef();
      if (editor) {
        // Preserve scroll position
        const scroller = editor.view.dom.closest(".lm-editor-wrapper") as HTMLElement | null;
        const scrollTop = scroller?.scrollTop ?? 0;
        editor.setMarkdown(content);
        tabsState.setActiveClean();
        tabsState.snapshotActiveTab(editor.view, null);
        if (scroller) {
          requestAnimationFrame(() => {
            scroller.scrollTop = scrollTop;
          });
        }
      }
    } else {
      // Background tab — update the snapshot
      const tab = tabsState.tabs().find((t) => t.id === tabId);
      if (tab?.editorState) {
        const { parseMarkdown } = await import("../editor/markdown/parser");
        const doc = parseMarkdown(content);
        const { EditorState } = await import("prosemirror-state");
        const newState = EditorState.create({ doc, plugins: tab.editorState.plugins });
        tabsState.updateTab(tabId, { editorState: newState, isModified: false });
      }
    }
  } catch {
    // Read failed — skip
  }
}

async function handleDirtyReload(tabId: string, filePath: string, fileName: string, isActive: boolean): Promise<void> {
  const result = await message(
    `"${fileName}" has been modified externally. Do you want to reload it? Your unsaved changes will be lost.`,
    {
      title: "File Changed on Disk",
      kind: "warning",
      buttons: {
        yes: "Reload",
        no: "Keep My Changes",
        cancel: "Cancel",
      },
    },
  );

  if (result === "Reload") {
    await handleCleanReload(tabId, filePath, isActive);
  } else {
    // "Keep My Changes" — update stored mtime so we don't prompt again
    await stampMtime(filePath);
  }
}

/** Check if the file on disk is newer than our known mtime. */
export async function isExternallyModified(path: string): Promise<boolean> {
  const stored = lastKnownMtime.get(path);
  if (stored === undefined) return false;
  try {
    const diskMtime = await invoke<number>("get_file_mtime", { path });
    return diskMtime > stored;
  } catch {
    return false;
  }
}

/** Start polling for external file changes. */
export function startFileWatch(): void {
  if (pollTimer) return;
  pollTimer = setInterval(checkForChanges, POLL_INTERVAL);

  // Also check on window focus
  document.addEventListener("visibilitychange", handleVisibilityChange);
}

/** Stop polling. */
export function stopFileWatch(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  document.removeEventListener("visibilitychange", handleVisibilityChange);
}

function handleVisibilityChange(): void {
  if (document.visibilityState === "visible") {
    checkForChanges();
  }
}

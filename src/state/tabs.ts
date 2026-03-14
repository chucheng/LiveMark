import { createSignal, createMemo } from "solid-js";
import { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

export interface Tab {
  id: string;
  filePath: string | null;
  fileName: string;
  isModified: boolean;
  editorState: EditorState | null;
  scrollPosition: number;
}

const MAX_TABS = 50;

let nextId = 1;
function generateTabId(): string {
  return `tab-${nextId++}`;
}

function extractFileName(path: string | null): string {
  if (!path) return "Untitled";
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || "Untitled";
}

const [tabs, setTabs] = createSignal<Tab[]>([]);
const [activeTabId, setActiveTabId] = createSignal<string | null>(null);

const activeTab = createMemo(() => tabs().find((t) => t.id === activeTabId()) ?? null);
const filePath = createMemo(() => activeTab()?.filePath ?? null);
const isModified = createMemo(() => activeTab()?.isModified ?? false);
const fileName = createMemo(() => activeTab()?.fileName ?? "Untitled");

function canCreateTab(): boolean {
  return tabs().length < MAX_TABS;
}

function createTab(filePath?: string | null): Tab | null {
  if (!canCreateTab()) return null;
  const tab: Tab = {
    id: generateTabId(),
    filePath: filePath ?? null,
    fileName: extractFileName(filePath ?? null),
    isModified: false,
    editorState: null,
    scrollPosition: 0,
  };
  setTabs((prev) => [...prev, tab]);
  setActiveTabId(tab.id);
  return tab;
}

type CloseTabResult =
  | { type: "not_found" }
  | { type: "replaced"; newTab: Tab }
  | { type: "switched" };

function closeTab(tabId: string): CloseTabResult {
  const current = tabs();
  const idx = current.findIndex((t) => t.id === tabId);
  if (idx < 0) return { type: "not_found" };

  const remaining = current.filter((t) => t.id !== tabId);

  if (remaining.length === 0) {
    // Last tab — create new untitled
    const newTab: Tab = {
      id: generateTabId(),
      filePath: null,
      fileName: "Untitled",
      isModified: false,
      editorState: null,
      scrollPosition: 0,
    };
    setTabs([newTab]);
    setActiveTabId(newTab.id);
    return { type: "replaced", newTab };
  }

  setTabs(remaining);

  // If closed tab was active, activate adjacent
  if (activeTabId() === tabId) {
    const newIdx = Math.min(idx, remaining.length - 1);
    setActiveTabId(remaining[newIdx].id);
  }

  return { type: "switched" };
}

function switchTab(tabId: string) {
  if (tabs().some((t) => t.id === tabId)) {
    setActiveTabId(tabId);
  }
}

function switchTabByIndex(index: number) {
  const current = tabs();
  if (index >= 0 && index < current.length) {
    setActiveTabId(current[index].id);
  }
}

function switchTabRelative(delta: number) {
  const current = tabs();
  if (current.length <= 1) return;
  const idx = current.findIndex((t) => t.id === activeTabId());
  if (idx < 0) return;
  const newIdx = (idx + delta + current.length) % current.length;
  setActiveTabId(current[newIdx].id);
}

function findTabByPath(path: string): Tab | undefined {
  return tabs().find((t) => t.filePath === path);
}

function updateTab(tabId: string, updates: Partial<Pick<Tab, "filePath" | "fileName" | "isModified" | "editorState" | "scrollPosition">>) {
  setTabs((prev) =>
    prev.map((t) => {
      if (t.id !== tabId) return t;
      const updated = { ...t, ...updates };
      if (updates.filePath !== undefined) {
        updated.fileName = extractFileName(updates.filePath);
      }
      return updated;
    })
  );
}

function setActiveModified(modified: boolean) {
  const id = activeTabId();
  if (id) updateTab(id, { isModified: modified });
}

function setActiveFilePath(path: string | null) {
  const id = activeTabId();
  if (id) updateTab(id, { filePath: path });
}

function setActiveClean() {
  setActiveModified(false);
}

function setActiveDirty() {
  setActiveModified(true);
}

function resetActive() {
  const id = activeTabId();
  if (id) updateTab(id, { filePath: null, isModified: false });
}

/**
 * Snapshot the active tab's editor state before switching away.
 */
function snapshotActiveTab(view: EditorView, scroller: HTMLElement | null) {
  const id = activeTabId();
  if (!id) return;
  updateTab(id, {
    editorState: view.state,
    scrollPosition: scroller?.scrollTop ?? 0,
  });
}

/**
 * Move a tab from one index to another (for drag reordering).
 */
function moveTab(fromIndex: number, toIndex: number) {
  setTabs((prev) => {
    const next = [...prev];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  });
}

export const tabsState = {
  tabs,
  activeTabId,
  activeTab,
  filePath,
  isModified,
  fileName,
  MAX_TABS,
  canCreateTab,
  createTab,
  closeTab,
  switchTab,
  switchTabByIndex,
  switchTabRelative,
  findTabByPath,
  updateTab,
  setActiveModified,
  setActiveFilePath,
  setActiveClean,
  setActiveDirty,
  resetActive,
  snapshotActiveTab,
  moveTab,
};

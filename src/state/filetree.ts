import { createSignal } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
  loaded?: boolean;
}

const [rootPath, setRootPath] = createSignal<string | null>(null);
const [rootEntries, setRootEntries] = createSignal<FileTreeNode[]>([]);
const [expandedPaths, setExpandedPaths] = createSignal<Set<string>>(new Set<string>());
const [sidebarVisible, setSidebarVisible] = createSignal(false);
const [sidebarWidth, setSidebarWidth] = createSignal(220);
const [sidebarTab, setSidebarTab] = createSignal<"files" | "outline">("files");

let unlisten: (() => void) | null = null;

async function loadDirectory(path: string): Promise<FileTreeNode[]> {
  try {
    const entries = await invoke<FileEntry[]>("list_directory", { path });
    return entries.map((e) => ({
      name: e.name,
      path: e.path,
      type: e.type,
      children: e.type === "directory" ? undefined : undefined,
      loaded: e.type === "file",
    }));
  } catch {
    return [];
  }
}

async function openFolder(path: string) {
  setExpandedPaths(new Set<string>());
  setRootPath(path);
  const entries = await loadDirectory(path);
  setRootEntries(entries);
  setSidebarVisible(true);

  // Listen for fs changes before starting watch to avoid gap
  if (unlisten) unlisten();
  unlisten = (await listen("fs-change", async () => {
    await refreshTree();
  })) as unknown as () => void;

  // Start watching
  try {
    await invoke("watch_directory", { path });
  } catch {
    // Watch is optional
  }
}

async function closeFolder() {
  try {
    await invoke("unwatch_directory");
  } catch {
    // Ignore
  }
  if (unlisten) {
    unlisten();
    unlisten = null;
  }
  setRootPath(null);
  setRootEntries([]);
  setExpandedPaths(new Set<string>());
}

async function toggleExpand(path: string) {
  const expanded = new Set(expandedPaths());
  if (expanded.has(path)) {
    expanded.delete(path);
    setExpandedPaths(expanded);
  } else {
    expanded.add(path);
    setExpandedPaths(expanded);
    // Load children if not loaded
    await loadChildren(path);
  }
}

async function loadChildren(dirPath: string) {
  const entries = await loadDirectory(dirPath);
  updateNodeChildren(dirPath, entries);
}

function updateNodeChildren(dirPath: string, children: FileTreeNode[]) {
  setRootEntries((prev) => updateChildrenRecursive(prev, dirPath, children));
}

function updateChildrenRecursive(
  nodes: FileTreeNode[],
  targetPath: string,
  children: FileTreeNode[]
): FileTreeNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) {
      return { ...node, children, loaded: true };
    }
    if (node.children) {
      return {
        ...node,
        children: updateChildrenRecursive(node.children, targetPath, children),
      };
    }
    return node;
  });
}

async function refreshTree() {
  const root = rootPath();
  if (!root) return;

  const entries = await loadDirectory(root);
  setRootEntries(entries);

  // Reload expanded directories
  const expanded = expandedPaths();
  for (const path of expanded) {
    const children = await loadDirectory(path);
    updateNodeChildren(path, children);
  }
}

/** Expand all ancestor directories so filePath is visible in the tree. */
async function revealPath(filePath: string) {
  const root = rootPath();
  if (!root || !filePath.startsWith(root)) return;

  const relative = filePath.slice(root.length).replace(/^[/\\]/, "");
  const parts = relative.split(/[/\\]/);
  // Expand each parent dir (skip the last part — that's the file itself)
  const expanded = new Set(expandedPaths());
  let current = root;
  for (let i = 0; i < parts.length - 1; i++) {
    current = current + "/" + parts[i];
    if (!expanded.has(current)) {
      expanded.add(current);
      await loadChildren(current);
    }
  }
  setExpandedPaths(expanded);
}

export const fileTreeState = {
  rootPath,
  rootEntries,
  expandedPaths,
  sidebarVisible,
  setSidebarVisible,
  sidebarWidth,
  setSidebarWidth,
  sidebarTab,
  setSidebarTab,
  openFolder,
  closeFolder,
  toggleExpand,
  refreshTree,
  revealPath,
  toggleSidebar() {
    setSidebarVisible(!sidebarVisible());
    import("./preferences").then(({ preferencesState }) => preferencesState.savePreferences());
  },
};

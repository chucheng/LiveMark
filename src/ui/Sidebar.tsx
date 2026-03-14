import { For, Show, createSignal, onCleanup } from "solid-js";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { fileTreeState, type FileTreeNode } from "../state/filetree";
import { isOpenableFile } from "../commands/file-commands";

interface SidebarProps {
  onFileClick: (path: string) => void;
}

function TreeNode(props: { node: FileTreeNode; depth: number; onFileClick: (path: string) => void }) {
  const isExpanded = () => fileTreeState.expandedPaths().has(props.node.path);
  const isDir = () => props.node.type === "directory";
  const openable = () => isDir() || isOpenableFile(props.node.path);

  function handleClick() {
    if (isDir()) {
      fileTreeState.toggleExpand(props.node.path);
    } else {
      props.onFileClick(props.node.path);
    }
  }

  const icon = () => {
    if (isDir()) return isExpanded() ? "▾" : "▸";
    if (props.node.name.endsWith(".md") || props.node.name.endsWith(".markdown")) return "📄";
    if (!openable()) return "⛔";
    return "📎";
  };

  return (
    <>
      <div
        class="lm-tree-node"
        classList={{ "lm-tree-node-disabled": !openable() }}
        style={{ "padding-left": `${props.depth * 16 + 8}px` }}
        onClick={handleClick}
        title={openable() ? props.node.path : `${props.node.name} — unsupported file type`}
      >
        <span class="lm-tree-icon">{icon()}</span>
        <span class="lm-tree-label">{props.node.name}</span>
      </div>
      <Show when={isDir() && isExpanded() && props.node.children}>
        <For each={props.node.children}>
          {(child) => (
            <TreeNode node={child} depth={props.depth + 1} onFileClick={props.onFileClick} />
          )}
        </For>
      </Show>
    </>
  );
}

export default function Sidebar(props: SidebarProps) {
  const [isResizing, setIsResizing] = createSignal(false);
  let resizeCleanup: (() => void) | null = null;

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

  function handleResizeStart(e: MouseEvent) {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = fileTreeState.sidebarWidth();

    function onMouseMove(e: MouseEvent) {
      const newWidth = Math.min(400, Math.max(180, startWidth + (e.clientX - startX)));
      fileTreeState.setSidebarWidth(newWidth);
    }

    function onMouseUp() {
      setIsResizing(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      resizeCleanup = null;
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    resizeCleanup = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }

  onCleanup(() => {
    resizeCleanup?.();
  });

  return (
    <Show when={fileTreeState.sidebarVisible()}>
      <div
        class="lm-sidebar"
        classList={{ "lm-sidebar-resizing": isResizing() }}
        style={{ width: `${fileTreeState.sidebarWidth()}px` }}
      >
        <div class="lm-sidebar-header">
          <span class="lm-sidebar-title">
            {fileTreeState.rootPath()?.replace(/\\/g, "/").split("/").pop() ?? "Files"}
          </span>
        </div>
        <Show when={fileTreeState.rootPath()} fallback={
          <div class="lm-sidebar-empty">
            <p class="lm-sidebar-empty-text">No folder opened</p>
            <button class="lm-sidebar-open-btn" onClick={handleOpenFolder}>
              Open Folder
            </button>
            <p class="lm-sidebar-empty-hint">⌘⇧O</p>
          </div>
        }>
          <div class="lm-sidebar-tree">
            <For each={fileTreeState.rootEntries()}>
              {(node) => (
                <TreeNode node={node} depth={0} onFileClick={props.onFileClick} />
              )}
            </For>
          </div>
        </Show>
        <div class="lm-sidebar-resize" onMouseDown={handleResizeStart} />
      </div>
    </Show>
  );
}

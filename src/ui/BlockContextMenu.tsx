import { createSignal, onMount, onCleanup, Show } from "solid-js";
import type { EditorView } from "prosemirror-view";
import { moveBlockUp, moveBlockDown, duplicateBlock, deleteBlock, getBlockAnchor } from "../editor/plugins/block-handles";
import { toggleHeadingCollapse, isHeadingCollapsed } from "../editor/plugins/heading-collapse";
import { TextSelection } from "prosemirror-state";

interface BlockContextMenuProps {
  view: () => EditorView | undefined;
}

interface MenuState {
  x: number;
  y: number;
  blockPos: number;
  isHeading: boolean;
  isCollapsed: boolean;
}

export default function BlockContextMenu(props: BlockContextMenuProps) {
  const [menu, setMenu] = createSignal<MenuState | null>(null);

  function handleClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest(".lm-block-grip")) {
      e.preventDefault();
      e.stopPropagation();
      const view = props.view();
      if (!view) return;

      const handleEl = target.closest(".lm-block-grip") as HTMLElement;
      const rect = handleEl.getBoundingClientRect();

      // Read block position from data attribute set by the decoration
      const posAttr = handleEl.dataset.blockPos;
      if (posAttr == null) return;
      const blockPos = parseInt(posAttr, 10);
      if (isNaN(blockPos) || blockPos < 0 || blockPos >= view.state.doc.content.size) return;
      const node = view.state.doc.nodeAt(blockPos);
      const isHeading = node?.type.name === "heading";
      const isCollapsed = isHeading && isHeadingCollapsed(view.state, blockPos);

      setMenu({
        x: rect.left,
        y: rect.bottom + 4,
        blockPos,
        isHeading,
        isCollapsed,
      });
    }
  }

  function handleDismiss() {
    setMenu(null);
  }

  function runCommand(fn: () => void) {
    fn();
    setMenu(null);
    props.view()?.focus();
  }

  function handleMoveUp() {
    const view = props.view();
    if (!view) return;
    const m = menu();
    if (!m) return;
    // Place selection in the block first
    view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(m.blockPos + 1))));
    runCommand(() => moveBlockUp(view.state, view.dispatch.bind(view)));
  }

  function handleMoveDown() {
    const view = props.view();
    if (!view) return;
    const m = menu();
    if (!m) return;
    view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(m.blockPos + 1))));
    runCommand(() => moveBlockDown(view.state, view.dispatch.bind(view)));
  }

  function handleDuplicate() {
    const view = props.view();
    if (!view) return;
    const m = menu();
    if (!m) return;
    view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(m.blockPos + 1))));
    runCommand(() => duplicateBlock(view.state, view.dispatch.bind(view)));
  }

  function handleDelete() {
    const view = props.view();
    if (!view) return;
    const m = menu();
    if (!m) return;
    view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(m.blockPos + 1))));
    runCommand(() => deleteBlock(view.state, view.dispatch.bind(view)));
  }

  async function handleCopyLink() {
    const view = props.view();
    if (!view) return;
    const m = menu();
    if (!m) return;

    const anchor = getBlockAnchor(view, m.blockPos);
    if (anchor) {
      try {
        const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
        await writeText(`#${anchor}`);
      } catch {
        // Fallback to navigator clipboard for dev/non-Tauri
        await navigator.clipboard.writeText(`#${anchor}`);
      }
    }
    setMenu(null);
    view.focus();
  }

  function handleToggleCollapse() {
    const view = props.view();
    if (!view) return;
    const m = menu();
    if (!m || !m.isHeading) return;
    runCommand(() => toggleHeadingCollapse(view.state, view.dispatch.bind(view), m.blockPos));
  }

  function handleMouseDown(e: MouseEvent) {
    if (menu() && !(e.target as HTMLElement).closest(".lm-block-context-menu")) {
      handleDismiss();
    }
  }

  onMount(() => {
    document.addEventListener("click", handleClick, true);
    document.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("scroll", handleDismiss, true);
  });

  onCleanup(() => {
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("mousedown", handleMouseDown);
    window.removeEventListener("scroll", handleDismiss, true);
  });

  return (
    <Show when={menu()}>
      {(m) => (
        <div
          class="lm-block-context-menu"
          style={{ left: `${m().x}px`, top: `${m().y}px` }}
        >
          <button class="lm-bcm-item" onClick={handleMoveUp}>Move Up</button>
          <button class="lm-bcm-item" onClick={handleMoveDown}>Move Down</button>
          <button class="lm-bcm-item" onClick={handleDuplicate}>Duplicate</button>
          <button class="lm-bcm-item" onClick={handleDelete}>Delete</button>
          <div class="lm-bcm-separator" />
          <button class="lm-bcm-item" onClick={handleCopyLink}>Copy Link</button>
          <Show when={m().isHeading}>
            <div class="lm-bcm-separator" />
            <button class="lm-bcm-item" onClick={handleToggleCollapse}>
              {m().isCollapsed ? "Expand" : "Collapse"}
            </button>
          </Show>
        </div>
      )}
    </Show>
  );
}

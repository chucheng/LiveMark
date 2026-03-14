import { createSignal, createEffect, onMount, onCleanup, Show } from "solid-js";
import type { EditorView } from "prosemirror-view";
import { moveBlockUp, moveBlockDown, duplicateBlock, deleteBlock, getBlockAnchor } from "../editor/plugins/block-handles";
import { toggleHeadingCollapse, isHeadingCollapsed } from "../editor/plugins/heading-collapse";
import { TextSelection } from "prosemirror-state";
import { clampMenuPosition } from "../utils/viewport";

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
  const [clamped, setClamped] = createSignal<{ x: number; y: number } | null>(null);
  let menuRef: HTMLDivElement | undefined;

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
    window.addEventListener("lm-tab-switch", handleDismiss);
  });

  onCleanup(() => {
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener("mousedown", handleMouseDown);
    window.removeEventListener("scroll", handleDismiss, true);
    window.removeEventListener("lm-tab-switch", handleDismiss);
  });

  // Clamp menu position to viewport after first paint
  createEffect(() => {
    const m = menu();
    if (m && menuRef) {
      requestAnimationFrame(() => {
        if (!menuRef) return;
        const rect = menuRef.getBoundingClientRect();
        setClamped(clampMenuPosition(m.x, m.y, rect.width, rect.height));
      });
    } else {
      setClamped(null);
    }
  });

  return (
    <Show when={menu()}>
      {(m) => (
        <div
          ref={menuRef}
          class="lm-block-context-menu"
          role="menu"
          style={{ left: `${(clamped() ?? m()).x}px`, top: `${(clamped() ?? m()).y}px` }}
        >
          <button class="lm-bcm-item" role="menuitem" onClick={handleMoveUp}>Move Up</button>
          <button class="lm-bcm-item" role="menuitem" onClick={handleMoveDown}>Move Down</button>
          <button class="lm-bcm-item" role="menuitem" onClick={handleDuplicate}>Duplicate</button>
          <button class="lm-bcm-item" role="menuitem" onClick={handleDelete}>Delete</button>
          <div class="lm-bcm-separator" />
          <button class="lm-bcm-item" role="menuitem" onClick={handleCopyLink}>Copy Link</button>
          <Show when={m().isHeading}>
            <div class="lm-bcm-separator" />
            <button class="lm-bcm-item" role="menuitem" onClick={handleToggleCollapse}>
              {m().isCollapsed ? "Expand" : "Collapse"}
            </button>
          </Show>
        </div>
      )}
    </Show>
  );
}

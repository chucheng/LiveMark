import { createSignal, onMount, onCleanup, Show } from "solid-js";
import type { EditorView } from "prosemirror-view";
import { moveBlockUp, moveBlockDown, duplicateBlock, deleteBlock } from "../editor/plugins/block-handles";
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
    if (target.closest(".lm-block-handle")) {
      e.preventDefault();
      e.stopPropagation();
      const view = props.view();
      if (!view) return;

      // Find the block position from the handle's parent decoration
      const handleEl = target.closest(".lm-block-handle") as HTMLElement;
      const rect = handleEl.getBoundingClientRect();

      // Get the block position by finding which block the handle is next to
      const pos = view.posAtCoords({ left: rect.right + 20, top: rect.top + rect.height / 2 });
      if (!pos) return;

      // Resolve to top-level block
      const $pos = view.state.doc.resolve(pos.pos);
      const blockPos = $pos.before(1);
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

  function handleToggleCollapse() {
    const view = props.view();
    if (!view) return;
    const m = menu();
    if (!m || !m.isHeading) return;
    runCommand(() => toggleHeadingCollapse(view.state, view.dispatch.bind(view), m.blockPos));
  }

  onMount(() => {
    document.addEventListener("click", handleClick, true);
    document.addEventListener("mousedown", (e) => {
      if (menu() && !(e.target as HTMLElement).closest(".lm-block-context-menu")) {
        handleDismiss();
      }
    });
  });

  onCleanup(() => {
    document.removeEventListener("click", handleClick, true);
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

import { createSignal, createEffect, onCleanup, For, Show } from "solid-js";
import { extractHeadings, navigateToHeading, type HeadingEntry } from "../editor/mind-map";
import type { EditorView } from "prosemirror-view";

interface OutlineTreeProps {
  view: () => EditorView | undefined;
}

export default function OutlineTree(props: OutlineTreeProps) {
  const [headings, setHeadings] = createSignal<HeadingEntry[]>([]);
  const [activeIndex, setActiveIndex] = createSignal(-1);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let selectionTimer: ReturnType<typeof setTimeout> | null = null;

  function updateHeadings() {
    const view = props.view();
    if (!view) { setHeadings([]); return; }
    const h = extractHeadings(view.state.doc);
    setHeadings(h);
    updateActiveHeading(view);
  }

  function updateActiveHeading(view: EditorView) {
    const h = headings();
    if (h.length === 0) { setActiveIndex(-1); return; }
    const cursorPos = view.state.selection.$head.pos;
    // Find the last heading at or before cursor position
    let idx = -1;
    for (let i = h.length - 1; i >= 0; i--) {
      if (h[i].pos <= cursorPos) {
        idx = i;
        break;
      }
    }
    setActiveIndex(idx);
  }

  function scheduleUpdate() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateHeadings, 200);
  }

  function scheduleSelectionUpdate() {
    if (selectionTimer) clearTimeout(selectionTimer);
    selectionTimer = setTimeout(() => {
      const view = props.view();
      if (view) updateActiveHeading(view);
    }, 50);
  }

  // Watch for doc changes and selection changes via MutationObserver + dispatch override
  createEffect(() => {
    const view = props.view();
    if (!view) return;

    // Initial extraction
    updateHeadings();

    // Observe DOM mutations for doc changes
    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(view.dom, { childList: true, subtree: true, characterData: true });

    // Patch dispatchTransaction to track selection changes
    const origDispatch = view.dispatch.bind(view);
    view.dispatch = (tr) => {
      origDispatch(tr);
      if (tr.selectionSet) scheduleSelectionUpdate();
      if (tr.docChanged) scheduleUpdate();
    };

    onCleanup(() => {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
      if (selectionTimer) clearTimeout(selectionTimer);
      // Restore original dispatch
      view.dispatch = origDispatch;
    });
  });

  function handleClick(heading: HeadingEntry) {
    const view = props.view();
    if (!view) return;
    navigateToHeading(view, heading.pos);
  }

  return (
    <div class="lm-sidebar-tree lm-outline-tree">
      <Show when={headings().length > 0} fallback={
        <div class="lm-sidebar-empty">
          <p class="lm-sidebar-empty-text">No headings found</p>
        </div>
      }>
        <For each={headings()}>
          {(heading, i) => (
            <div
              class="lm-tree-node lm-outline-node"
              classList={{ "lm-outline-node-active": i() === activeIndex() }}
              style={{ "padding-left": `${(heading.level - 1) * 16 + 8}px` }}
              onClick={() => handleClick(heading)}
              title={heading.text}
            >
              <span class="lm-outline-level">H{heading.level}</span>
              <span class="lm-tree-label lm-outline-label">{heading.text}</span>
            </div>
          )}
        </For>
      </Show>
    </div>
  );
}

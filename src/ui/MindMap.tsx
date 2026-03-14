import { createSignal, onMount, onCleanup, Show, createEffect } from "solid-js";
import { extractHeadings, headingsToMindmap, type HeadingEntry } from "../editor/mind-map";
import { renderMermaid } from "../editor/mermaid-loader";
import type { EditorView } from "prosemirror-view";
import { TextSelection } from "prosemirror-state";

interface MindMapProps {
  view: () => EditorView | undefined;
  onClose: () => void;
}

export default function MindMap(props: MindMapProps) {
  const [svg, setSvg] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  let headingsRef: HeadingEntry[] = [];

  async function renderMap() {
    const view = props.view();
    if (!view) return;

    const headings = extractHeadings(view.state.doc);
    headingsRef = headings;
    const mermaidSrc = headingsToMindmap(headings);

    setLoading(true);
    setError("");

    const result = await renderMermaid(mermaidSrc);
    if ("svg" in result) {
      setSvg(result.svg);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  onMount(() => {
    renderMap();
    window.addEventListener("keydown", handleKeydown);
    onCleanup(() => window.removeEventListener("keydown", handleKeydown));
  });

  // Re-render when doc changes
  createEffect(() => {
    const view = props.view();
    if (!view) return;

    let timer: ReturnType<typeof setTimeout>;

    const handler = () => {
      // Debounce re-renders
      clearTimeout(timer);
      timer = setTimeout(renderMap, 500);
    };

    // Listen for doc changes via MutationObserver on the editor DOM
    const observer = new MutationObserver(handler);
    observer.observe(view.dom, { childList: true, subtree: true });

    onCleanup(() => {
      observer.disconnect();
      clearTimeout(timer);
    });
  });

  function handleSvgClick(e: MouseEvent) {
    const target = e.target as SVGElement;

    // Mermaid mindmap nodes are <g> groups containing shapes + <text>.
    // Walk up to the nearest node group, then find <text> within it.
    const nodeGroup =
      target.closest(".mindmap-node") ||
      target.closest(".node") ||
      target.closest("g");
    if (!nodeGroup) return;

    const textEl = nodeGroup.querySelector("text");
    if (!textEl) return;

    const clickedText = textEl.textContent?.trim();
    if (!clickedText) return;

    const heading = headingsRef.find(
      (h) => h.sanitizedText === clickedText || h.text.trim() === clickedText
    );
    if (!heading) return;

    const view = props.view();
    if (!view) return;

    // Close the mind map first, then navigate
    props.onClose();

    // Jump to heading and scroll to ~28% from top (golden reading zone)
    requestAnimationFrame(() => {
      view.focus();
      const tr = view.state.tr.setSelection(
        TextSelection.near(view.state.doc.resolve(heading.pos + 1))
      );
      view.dispatch(tr);

      // Scroll heading to 28% from top of the editor wrapper
      const coords = view.coordsAtPos(heading.pos + 1);
      const wrapper = view.dom.closest(".lm-editor-wrapper") as HTMLElement | null;
      if (wrapper) {
        const wrapperRect = wrapper.getBoundingClientRect();
        const targetY = wrapperRect.top + wrapperRect.height * 0.28;
        const delta = coords.top - targetY;
        wrapper.scrollBy({ top: delta, behavior: "smooth" });
      }
    });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      props.onClose();
    }
  }

  return (
    <div class="lm-mindmap-overlay" onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}>
      <div class="lm-mindmap-panel" role="dialog" aria-modal="true" aria-label="Mind Map">
        <div class="lm-mindmap-header">
          <span class="lm-mindmap-title">Mind Map</span>
          <button class="lm-mindmap-close" onClick={props.onClose} title="Close (Esc)">
            &times;
          </button>
        </div>
        <div class="lm-mindmap-content">
          <Show when={loading()}>
            <div class="lm-mindmap-loading">Loading mind map…</div>
          </Show>
          <Show when={error()}>
            <div class="lm-mindmap-error">{error()}</div>
          </Show>
          <Show when={!loading() && !error() && svg()}>
            <div
              class="lm-mindmap-svg"
              innerHTML={svg()}
              onClick={handleSvgClick}
            />
          </Show>
        </div>
      </div>
    </div>
  );
}

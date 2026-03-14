import { createSignal, onMount, onCleanup, Show, createEffect } from "solid-js";
import { extractHeadings, headingsToMindmap, type HeadingEntry } from "../editor/mind-map";
import { renderMermaid } from "../editor/mermaid-loader";
import type { EditorView } from "prosemirror-view";
import { TextSelection } from "prosemirror-state";

interface MindMapProps {
  view: () => EditorView | undefined;
  onClose: () => void;
}

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.15;
const ZOOM_WHEEL_FACTOR = 0.002;

export default function MindMap(props: MindMapProps) {
  const [svg, setSvg] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [zoom, setZoom] = createSignal(1);
  const [panX, setPanX] = createSignal(0);
  const [panY, setPanY] = createSignal(0);
  let headingsRef: HeadingEntry[] = [];
  let contentRef: HTMLDivElement | undefined;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panStartX = 0;
  let panStartY = 0;

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
    // Reset view on new render
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }

  function clampZoom(z: number): number {
    return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
  }

  function zoomAt(clientX: number, clientY: number, newZoom: number) {
    if (!contentRef) return;
    const rect = contentRef.getBoundingClientRect();
    // Point in content-local space where zoom is anchored
    const cx = clientX - rect.left - rect.width / 2;
    const cy = clientY - rect.top - rect.height / 2;

    const oldZoom = zoom();
    const clamped = clampZoom(newZoom);
    const scale = clamped / oldZoom;

    // Adjust pan so the point under the cursor stays fixed
    setPanX(cx - scale * (cx - panX()));
    setPanY(cy - scale * (cy - panY()));
    setZoom(clamped);
  }

  function resetView() {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }

  // --- Wheel zoom ---
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = -e.deltaY * ZOOM_WHEEL_FACTOR;
    zoomAt(e.clientX, e.clientY, zoom() + delta * zoom());
  }

  // --- Drag pan ---
  function handlePointerDown(e: PointerEvent) {
    // Only pan on middle-click or left-click on empty space (not on nodes)
    const target = e.target as Element;
    const isNode = target.closest(".mindmap-node") || target.closest(".node");
    if (e.button === 0 && isNode) return; // left-click on node → navigate, don't pan

    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panStartX = panX();
    panStartY = panY();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;
    setPanX(panStartX + (e.clientX - dragStartX));
    setPanY(panStartY + (e.clientY - dragStartY));
  }

  function handlePointerUp() {
    isDragging = false;
  }

  // --- Node click (navigate to heading) ---
  function handleSvgClick(e: MouseEvent) {
    if (isDragging) return;
    const target = e.target as Element;

    const nodeGroup =
      target.closest(".mindmap-node") ||
      target.closest(".node") ||
      target.closest("g");
    if (!nodeGroup) return;

    // Extract visible text — try <text> first, then <foreignObject> HTML content
    const textEl = nodeGroup.querySelector("text");
    const foEl = nodeGroup.querySelector("foreignObject");
    const clickedText = (textEl?.textContent || foEl?.textContent || "").trim();
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
      return;
    }
    // Zoom with +/- keys
    if (e.key === "=" || e.key === "+") {
      e.preventDefault();
      setZoom(clampZoom(zoom() + ZOOM_STEP));
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      setZoom(clampZoom(zoom() - ZOOM_STEP));
    } else if (e.key === "0") {
      e.preventDefault();
      resetView();
    }
    // Pan with arrow keys
    const PAN_KEY_STEP = 40;
    if (e.key === "ArrowLeft") { e.preventDefault(); setPanX(panX() + PAN_KEY_STEP); }
    else if (e.key === "ArrowRight") { e.preventDefault(); setPanX(panX() - PAN_KEY_STEP); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setPanY(panY() + PAN_KEY_STEP); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setPanY(panY() - PAN_KEY_STEP); }
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
      clearTimeout(timer);
      timer = setTimeout(renderMap, 500);
    };

    const observer = new MutationObserver(handler);
    observer.observe(view.dom, { childList: true, subtree: true });

    onCleanup(() => {
      observer.disconnect();
      clearTimeout(timer);
    });
  });

  const transformStyle = () =>
    `transform: scale(${zoom()}) translate(${panX() / zoom()}px, ${panY() / zoom()}px)`;

  const zoomPercent = () => Math.round(zoom() * 100);

  return (
    <div class="lm-mindmap-overlay" onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}>
      <div class="lm-mindmap-panel" role="dialog" aria-modal="true" aria-label="Mind Map">
        <div class="lm-mindmap-header">
          <span class="lm-mindmap-title">Mind Map</span>
          <div class="lm-mindmap-controls">
            <button class="lm-mindmap-btn" onClick={() => setZoom(clampZoom(zoom() - ZOOM_STEP))} title="Zoom out (-)">−</button>
            <button class="lm-mindmap-zoom-label" onClick={resetView} title="Reset zoom (0)">{zoomPercent()}%</button>
            <button class="lm-mindmap-btn" onClick={() => setZoom(clampZoom(zoom() + ZOOM_STEP))} title="Zoom in (+)">+</button>
          </div>
          <button class="lm-mindmap-close" onClick={props.onClose} title="Close (Esc)">
            &times;
          </button>
        </div>
        <div
          class="lm-mindmap-content"
          ref={contentRef}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          classList={{ "lm-mindmap-grabbing": isDragging }}
        >
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
              style={transformStyle()}
            />
          </Show>
        </div>
      </div>
    </div>
  );
}

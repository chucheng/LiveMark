import { onMount } from "solid-js";

interface SourceViewProps {
  markdown: () => string;
  /** Scroll percentage (0–1) to restore when mounting */
  contentFraction?: () => number;
  /** Reports the current scroll percentage when the user scrolls */
  onContentFractionChange?: (fraction: number) => void;
}

export default function SourceView(props: SourceViewProps) {
  let containerRef!: HTMLDivElement;

  onMount(() => {
    const pct = props.contentFraction?.() ?? 0;
    if (pct > 0) {
      requestAnimationFrame(() => {
        const max = containerRef.scrollHeight - containerRef.clientHeight;
        containerRef.scrollTop = Math.max(0, pct * max);
      });
    }
  });

  function handleScroll() {
    if (!containerRef) return;
    const max = containerRef.scrollHeight - containerRef.clientHeight;
    if (max <= 0) return;
    const pct = containerRef.scrollTop / max;
    props.onContentFractionChange?.(Math.min(1, Math.max(0, pct)));
  }

  return (
    <div ref={containerRef} class="lm-source-view" onScroll={handleScroll}>
      <pre class="lm-source-pre">
        <code>{props.markdown()}</code>
      </pre>
    </div>
  );
}

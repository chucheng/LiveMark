import { onMount } from "solid-js";

interface SourceViewProps {
  markdown: () => string;
  /** Scroll fraction (0–1) representing scroll position */
  contentFraction?: () => number;
  /** Reports the current scroll fraction when the user scrolls */
  onContentFractionChange?: (fraction: number) => void;
}

export default function SourceView(props: SourceViewProps) {
  let containerRef!: HTMLDivElement;

  onMount(() => {
    const fraction = props.contentFraction?.() ?? 0;
    if (fraction > 0) {
      requestAnimationFrame(() => {
        const scrollable = containerRef.scrollHeight - containerRef.clientHeight;
        containerRef.scrollTop = fraction * Math.max(0, scrollable);
      });
    }
  });

  function handleScroll() {
    if (!containerRef) return;
    const scrollable = containerRef.scrollHeight - containerRef.clientHeight;
    if (scrollable <= 0) return;
    const fraction = containerRef.scrollTop / scrollable;
    props.onContentFractionChange?.(Math.min(1, Math.max(0, fraction)));
  }

  return (
    <div ref={containerRef} class="lm-source-view" onScroll={handleScroll}>
      <pre class="lm-source-pre">
        <code>{props.markdown()}</code>
      </pre>
    </div>
  );
}

import { onMount } from "solid-js";

interface SourceViewProps {
  markdown: () => string;
  /** Document fraction (0–1) representing position in the document */
  contentFraction?: () => number;
  /** Reports the current document fraction when the user scrolls */
  onContentFractionChange?: (fraction: number) => void;
}

export default function SourceView(props: SourceViewProps) {
  let containerRef!: HTMLDivElement;

  function getLineMetrics() {
    const pre = containerRef.querySelector("pre");
    if (!pre) return null;
    const code = pre.querySelector("code");
    const text = code?.textContent ?? "";
    const totalLines = text.split("\n").length;
    if (totalLines <= 1) return null;
    const lineHeight = pre.scrollHeight / totalLines;
    if (lineHeight <= 0) return null;
    return { totalLines, lineHeight };
  }

  function scrollToFraction(fraction: number) {
    const metrics = getLineMetrics();
    if (metrics) {
      const targetLine = fraction * metrics.totalLines;
      containerRef.scrollTop = targetLine * metrics.lineHeight;
    } else {
      // Fallback
      const scrollable = containerRef.scrollHeight - containerRef.clientHeight;
      containerRef.scrollTop = fraction * Math.max(0, scrollable);
    }
  }

  onMount(() => {
    const fraction = props.contentFraction?.() ?? 0;
    if (fraction > 0) {
      requestAnimationFrame(() => scrollToFraction(fraction));
    }
  });

  function handleScroll() {
    if (!containerRef) return;
    const metrics = getLineMetrics();
    if (metrics) {
      const topLine = containerRef.scrollTop / metrics.lineHeight;
      const fraction = topLine / metrics.totalLines;
      props.onContentFractionChange?.(Math.min(1, Math.max(0, fraction)));
    } else {
      const scrollable = containerRef.scrollHeight - containerRef.clientHeight;
      if (scrollable <= 0) return;
      const fraction = containerRef.scrollTop / scrollable;
      props.onContentFractionChange?.(Math.min(1, Math.max(0, fraction)));
    }
  }

  return (
    <div ref={containerRef} class="lm-source-view" onScroll={handleScroll}>
      <pre class="lm-source-pre">
        <code>{props.markdown()}</code>
      </pre>
    </div>
  );
}

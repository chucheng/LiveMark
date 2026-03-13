import { onMount } from "solid-js";

interface SourceViewProps {
  markdown: () => string;
  /** Content fraction (0–1) representing position in the document */
  contentFraction?: () => number;
  /** Reports the current content fraction when the user scrolls */
  onContentFractionChange?: (fraction: number) => void;
}

export default function SourceView(props: SourceViewProps) {
  let containerRef!: HTMLDivElement;

  /** Compute the height of a single line in the <pre> */
  function getLineHeight(): number {
    const code = containerRef.querySelector("code");
    if (!code) return 20;
    const style = getComputedStyle(code);
    return parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 20;
  }

  function getTotalLines(): number {
    return props.markdown().split("\n").length;
  }

  onMount(() => {
    const fraction = props.contentFraction?.() ?? 0;
    if (fraction > 0) {
      requestAnimationFrame(() => {
        const targetLine = Math.floor(fraction * getTotalLines());
        containerRef.scrollTop = targetLine * getLineHeight();
      });
    }
  });

  function handleScroll() {
    if (!containerRef) return;
    const lineHeight = getLineHeight();
    const totalLines = getTotalLines();
    if (totalLines <= 0 || lineHeight <= 0) return;
    const topLine = containerRef.scrollTop / lineHeight;
    const fraction = topLine / totalLines;
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

import { onMount, createMemo } from "solid-js";
import { highlightCode } from "../editor/highlight";

interface SourceViewProps {
  markdown: () => string;
  /** Markdown line number (fractional) to scroll to on mount */
  initialLine?: () => number;
  /** Reports the current top line (fractional) when the user scrolls */
  onTopLineChange?: (line: number) => void;
}

export default function SourceView(props: SourceViewProps) {
  let containerRef!: HTMLDivElement;

  const highlightedHTML = createMemo(() => {
    return highlightCode(props.markdown(), "markdown");
  });

  function getLineElements(): HTMLElement[] {
    const code = containerRef.querySelector("code");
    if (!code) return [];
    return Array.from(code.querySelectorAll<HTMLElement>(".lm-source-line"));
  }

  /** Scroll the container so the given fractional markdown line is at the top. */
  function scrollToLine(line: number): void {
    const lines = getLineElements();
    if (lines.length === 0) return;
    const lineIdx = Math.floor(line);
    const frac = line - lineIdx;

    if (lineIdx >= lines.length) {
      containerRef.scrollTop = containerRef.scrollHeight;
      return;
    }

    const containerRect = containerRef.getBoundingClientRect();
    const lineRect = lines[lineIdx].getBoundingClientRect();
    const y = lineRect.top - containerRect.top + containerRef.scrollTop;

    if (frac > 0 && lineIdx + 1 < lines.length) {
      const nextRect = lines[lineIdx + 1].getBoundingClientRect();
      const nextY = nextRect.top - containerRect.top + containerRef.scrollTop;
      containerRef.scrollTop = y + frac * (nextY - y);
    } else {
      containerRef.scrollTop = y;
    }
  }

  /** Determine which fractional line is currently at the top of the viewport. */
  function getTopVisibleLine(): number {
    const lines = getLineElements();
    if (lines.length === 0) return 0;

    const containerRect = containerRef.getBoundingClientRect();
    const targetY = containerRect.top;

    // Binary search for the line at the top
    let lo = 0;
    let hi = lines.length - 1;

    while (lo < hi - 1) {
      const mid = (lo + hi) >>> 1;
      const midRect = lines[mid].getBoundingClientRect();
      if (midRect.top <= targetY) lo = mid;
      else hi = mid;
    }

    const loRect = lines[lo].getBoundingClientRect();
    const hiRect = lines[hi].getBoundingClientRect();
    const span = hiRect.top - loRect.top;
    if (span <= 0) return lo;

    const fraction = Math.max(0, Math.min(1, (targetY - loRect.top) / span));
    return lo + fraction;
  }

  onMount(() => {
    const line = props.initialLine?.() ?? 0;
    if (line > 0) {
      requestAnimationFrame(() => {
        scrollToLine(line);
      });
    }
  });

  function handleScroll() {
    if (!containerRef) return;
    props.onTopLineChange?.(getTopVisibleLine());
  }

  /** Wrap each line in a span for scroll sync and highlight the full content. */
  function buildLineHTML(): string {
    const html = highlightedHTML();
    // Split the highlighted HTML by newlines, wrapping each in a line span.
    // Since hljs output preserves newlines, we can split on them.
    const lines = html.split("\n");
    return lines
      .map((line) => `<span class="lm-source-line">${line}</span>`)
      .join("\n");
  }

  return (
    <div ref={containerRef} class="lm-source-view" onScroll={handleScroll}>
      <pre class="lm-source-pre">
        <code innerHTML={buildLineHTML()} />
      </pre>
    </div>
  );
}

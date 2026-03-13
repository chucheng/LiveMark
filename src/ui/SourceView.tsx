import { onMount } from "solid-js";

interface SourceViewProps {
  markdown: () => string;
  /** Markdown line number (fractional) to scroll to on mount */
  initialLine?: () => number;
  /** Reports the current top line (fractional) when the user scrolls */
  onTopLineChange?: (line: number) => void;
}

/**
 * Build an array of character offsets where each markdown line begins.
 * Line 0 starts at offset 0; line N starts after the Nth newline.
 */
function lineStartOffsets(text: string): number[] {
  const offsets = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") offsets.push(i + 1);
  }
  return offsets;
}

/**
 * Measure the Y pixel position of a character offset within a text node,
 * using a DOM Range for pixel-perfect accuracy regardless of wrapping.
 * Returns the position relative to the top of the scrollable content.
 */
function charToY(textNode: Text, charIdx: number, scrollContainer: HTMLElement): number {
  const len = textNode.length;
  const idx = Math.min(charIdx, len);
  const range = document.createRange();
  // Use a 1-char range when possible for a reliable bounding rect;
  // collapsed ranges can return zero-height rects in some browsers.
  range.setStart(textNode, idx);
  range.setEnd(textNode, Math.min(idx + 1, len));
  const rect = range.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();
  return rect.top - containerRect.top + scrollContainer.scrollTop;
}

/**
 * Binary search to find which fractional line is at a given Y position.
 */
function yToLine(textNode: Text, offsets: number[], targetY: number, scrollContainer: HTMLElement): number {
  if (offsets.length <= 1) return 0;

  let lo = 0;
  let hi = offsets.length - 1;

  while (lo < hi - 1) {
    const mid = (lo + hi) >>> 1;
    const midY = charToY(textNode, offsets[mid], scrollContainer);
    if (midY <= targetY) lo = mid;
    else hi = mid;
  }

  // Interpolate within the found line for fractional precision
  const loY = charToY(textNode, offsets[lo], scrollContainer);
  const hiY = charToY(textNode, offsets[hi], scrollContainer);
  const span = hiY - loY;
  if (span <= 0) return lo;

  const fraction = Math.max(0, Math.min(1, (targetY - loY) / span));
  return lo + fraction;
}

export default function SourceView(props: SourceViewProps) {
  let containerRef!: HTMLDivElement;

  /** Get the primary text node inside <pre><code>.
   *  SolidJS wraps reactive expressions with comment markers,
   *  so we must walk children to find the actual Text node. */
  function getTextNode(): Text | null {
    const code = containerRef.querySelector("code");
    if (!code) return null;
    for (let i = 0; i < code.childNodes.length; i++) {
      const child = code.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE && (child as Text).length > 0) {
        return child as Text;
      }
    }
    return null;
  }

  /** Scroll the container so the given fractional markdown line is at the top. */
  function scrollToLine(line: number): void {
    const textNode = getTextNode();
    if (!textNode) return;

    const text = props.markdown();
    const offsets = lineStartOffsets(text);
    const lineIdx = Math.floor(line);
    const frac = line - lineIdx;

    if (lineIdx >= offsets.length) {
      containerRef.scrollTop = containerRef.scrollHeight;
      return;
    }

    const y = charToY(textNode, offsets[lineIdx], containerRef);

    if (frac > 0 && lineIdx + 1 < offsets.length) {
      const nextY = charToY(textNode, offsets[lineIdx + 1], containerRef);
      containerRef.scrollTop = y + frac * (nextY - y);
    } else {
      containerRef.scrollTop = y;
    }
  }

  /** Determine which fractional line is currently at the top of the viewport. */
  function getTopVisibleLine(): number {
    const textNode = getTextNode();
    if (!textNode) return 0;

    const text = props.markdown();
    const offsets = lineStartOffsets(text);
    const targetY = containerRef.scrollTop;

    return yToLine(textNode, offsets, targetY, containerRef);
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

  return (
    <div ref={containerRef} class="lm-source-view" onScroll={handleScroll}>
      <pre class="lm-source-pre">
        <code>{props.markdown()}</code>
      </pre>
    </div>
  );
}

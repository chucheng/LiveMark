import { onMount } from "solid-js";

interface SourceViewProps {
  markdown: () => string;
  /** Markdown line number (fractional) to scroll to on mount */
  initialLine?: () => number;
  /** Character offset to place the cursor at on mount */
  initialCursorOffset?: () => number;
  /** Reports the current top line (fractional) when the user scrolls */
  onTopLineChange?: (line: number) => void;
  /** Called on every edit with the current textarea value */
  onChange?: (text: string) => void;
  /** Called when the cursor moves (click, keyup, input) */
  onCursorChange?: (offset: number) => void;
}

export default function SourceView(props: SourceViewProps) {
  let textareaRef!: HTMLTextAreaElement;
  // Guard: ignore scroll events until initial scroll position is applied.
  // Without this, the textarea fires onScroll(scrollTop=0) during mount,
  // which clobbers the syncLine signal before onMount can read it.
  let scrollReady = false;

  /** Compute the height of a single line from the textarea's font metrics. */
  function getLineHeight(): number {
    const style = getComputedStyle(textareaRef);
    return parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.65;
  }

  /** Scroll the textarea so the given fractional markdown line is at the top. */
  function scrollToLine(line: number): void {
    const lh = getLineHeight();
    textareaRef.scrollTop = line * lh;
  }

  /** Determine which fractional line is currently at the top of the viewport. */
  function getTopVisibleLine(): number {
    const lh = getLineHeight();
    if (lh <= 0) return 0;
    return textareaRef.scrollTop / lh;
  }

  function reportCursor() {
    props.onCursorChange?.(textareaRef.selectionStart);
  }

  onMount(() => {
    const line = props.initialLine?.() ?? 0;
    if (line > 0) {
      requestAnimationFrame(() => {
        scrollToLine(line);
        scrollReady = true;
      });
    } else {
      scrollReady = true;
    }
    // Set initial cursor position
    const offset = props.initialCursorOffset?.() ?? 0;
    if (offset > 0) {
      textareaRef.selectionStart = offset;
      textareaRef.selectionEnd = offset;
    }
    textareaRef.focus();
  });

  function handleScroll() {
    if (!scrollReady || !textareaRef) return;
    props.onTopLineChange?.(getTopVisibleLine());
  }

  function handleInput() {
    props.onChange?.(textareaRef.value);
    reportCursor();
  }

  return (
    <div class="lm-source-view">
      <textarea
        ref={textareaRef}
        class="lm-source-textarea"
        value={props.markdown()}
        onScroll={handleScroll}
        onInput={handleInput}
        onKeyUp={reportCursor}
        onMouseUp={reportCursor}
        spellcheck={false}
      />
    </div>
  );
}

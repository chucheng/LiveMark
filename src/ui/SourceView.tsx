import { onMount } from "solid-js";

interface SourceViewProps {
  markdown: () => string;
  scrollFraction?: () => number;
  onScrollFractionChange?: (fraction: number) => void;
}

export default function SourceView(props: SourceViewProps) {
  let containerRef!: HTMLDivElement;

  onMount(() => {
    const fraction = props.scrollFraction?.() ?? 0;
    if (fraction > 0) {
      requestAnimationFrame(() => {
        containerRef.scrollTop =
          fraction * (containerRef.scrollHeight - containerRef.clientHeight);
      });
    }
  });

  function handleScroll() {
    if (!containerRef) return;
    const maxScroll = containerRef.scrollHeight - containerRef.clientHeight;
    const fraction = maxScroll > 0 ? containerRef.scrollTop / maxScroll : 0;
    props.onScrollFractionChange?.(fraction);
  }

  return (
    <div ref={containerRef} class="lm-source-view" onScroll={handleScroll}>
      <pre class="lm-source-pre">
        <code>{props.markdown()}</code>
      </pre>
    </div>
  );
}

import { onMount } from "solid-js";

interface SourceViewProps {
  markdown: () => string;
  scrollFraction?: () => number;
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

  return (
    <div ref={containerRef} class="lm-source-view">
      <pre class="lm-source-pre">
        <code>{props.markdown()}</code>
      </pre>
    </div>
  );
}

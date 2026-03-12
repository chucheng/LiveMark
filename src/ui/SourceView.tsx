interface SourceViewProps {
  markdown: () => string;
}

export default function SourceView(props: SourceViewProps) {
  return (
    <div class="lm-source-view">
      <pre class="lm-source-pre">
        <code>{props.markdown()}</code>
      </pre>
    </div>
  );
}

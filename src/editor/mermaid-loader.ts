/**
 * Lazy-loads Mermaid.js on first use.
 * Uses dynamic import so Vite code-splits automatically (~2.5MB).
 */
let mermaidInstance: typeof import("mermaid") | null = null;
let loading: Promise<typeof import("mermaid")> | null = null;

export async function getMermaid(): Promise<typeof import("mermaid")> {
  if (mermaidInstance) return mermaidInstance;
  if (loading) return loading;

  loading = import("mermaid").then((mod) => {
    mod.default.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "strict",
      fontFamily: "var(--lm-font-body)",
    });
    mermaidInstance = mod;
    return mod;
  });

  return loading;
}

let renderCounter = 0;

export async function renderMermaid(source: string): Promise<{ svg: string } | { error: string }> {
  try {
    const mermaid = await getMermaid();
    const id = `mermaid-${++renderCounter}`;
    const { svg } = await mermaid.default.render(id, source);
    return { svg };
  } catch (err) {
    return { error: String(err) };
  }
}

/**
 * Lazy-loads Mermaid.js on first use.
 * Uses dynamic import so Vite code-splits automatically (~2.5MB).
 * Re-initializes with theme-appropriate colors on each render.
 */
let mermaidInstance: typeof import("mermaid") | null = null;
let loading: Promise<typeof import("mermaid")> | null = null;
let lastTheme: "light" | "dark" | null = null;

function isDark(): boolean {
  return document.documentElement.dataset.theme === "dark";
}

function initMermaidTheme(mod: typeof import("mermaid")) {
  const dark = isDark();
  mod.default.initialize({
    startOnLoad: false,
    theme: dark ? "dark" : "default",
    securityLevel: "strict",
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  });
  lastTheme = dark ? "dark" : "light";
}

export async function getMermaid(): Promise<typeof import("mermaid")> {
  if (mermaidInstance) return mermaidInstance;
  if (loading) return loading;

  loading = import("mermaid").then((mod) => {
    initMermaidTheme(mod);
    mermaidInstance = mod;
    return mod;
  });

  return loading;
}

let renderCounter = 0;

export async function renderMermaid(
  source: string
): Promise<{ svg: string } | { error: string }> {
  try {
    const mermaid = await getMermaid();

    // Re-initialize if theme changed since last render
    const currentTheme = isDark() ? "dark" : "light";
    if (lastTheme !== currentTheme) {
      initMermaidTheme(mermaid);
    }

    const id = `mermaid-${++renderCounter}`;
    const { svg } = await mermaid.default.render(id, source);
    return { svg };
  } catch (err) {
    return { error: String(err) };
  }
}

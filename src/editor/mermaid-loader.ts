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
    theme: "base",
    securityLevel: "strict",
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    themeVariables: dark
      ? {
          // Dark mode — matches our deep graphite theme
          primaryColor: "#2a3040",
          primaryTextColor: "#d0d4dc",
          primaryBorderColor: "#3a4050",
          secondaryColor: "#1e2530",
          secondaryTextColor: "#d0d4dc",
          secondaryBorderColor: "#3a4050",
          tertiaryColor: "#252a35",
          tertiaryTextColor: "#d0d4dc",
          tertiaryBorderColor: "#3a4050",
          lineColor: "#505868",
          textColor: "#d0d4dc",
          mainBkg: "#2a3040",
          nodeBorder: "#3a4050",
          clusterBkg: "#1a1f28",
          clusterBorder: "#2a3040",
          titleColor: "#d0d4dc",
          edgeLabelBackground: "#1e2128",
          nodeTextColor: "#d0d4dc",
        }
      : {
          // Light mode — matches our light theme
          primaryColor: "#e8edf4",
          primaryTextColor: "#1c1c22",
          primaryBorderColor: "#c8cdd6",
          secondaryColor: "#f0f2f6",
          secondaryTextColor: "#1c1c22",
          secondaryBorderColor: "#d0d4dc",
          tertiaryColor: "#f4f6f8",
          tertiaryTextColor: "#1c1c22",
          tertiaryBorderColor: "#d0d4dc",
          lineColor: "#7c818c",
          textColor: "#1c1c22",
          mainBkg: "#e8edf4",
          nodeBorder: "#c8cdd6",
          clusterBkg: "#f4f6f8",
          clusterBorder: "#d0d4dc",
          titleColor: "#1c1c22",
          edgeLabelBackground: "#fafafa",
          nodeTextColor: "#1c1c22",
        },
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

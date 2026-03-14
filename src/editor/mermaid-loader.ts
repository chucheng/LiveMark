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

/**
 * Custom Mermaid palette — softer, desaturated tones matching LiveMark's design system.
 * Covers both general diagrams (flowchart, sequence, etc.) and mindmap sections.
 */
const LIGHT_THEME_VARS = {
  // General diagram colors (flowchart, sequence, etc.)
  primaryColor: "#dce8f5",
  primaryTextColor: "#1f2328",
  primaryBorderColor: "#b0c4d8",
  secondaryColor: "#e8f2f0",
  secondaryTextColor: "#2a3c38",
  secondaryBorderColor: "#a8d0c8",
  tertiaryColor: "#fdf2e0",
  tertiaryTextColor: "#4a3c20",
  tertiaryBorderColor: "#d8c898",
  lineColor: "#818b98",
  textColor: "#1f2328",
  mainBkg: "#dce8f5",
  nodeBorder: "#b0c4d8",
  // Root node (mindmap / git)
  git0: "#dce8f5",
  gitBranchLabel0: "#1f2328",
  // Mindmap section fills (pastel, low saturation)
  cScale0: "#e3ecf5",
  cScale1: "#dff0e8",
  cScale2: "#fdf2e0",
  cScale3: "#ece4f5",
  cScale4: "#fbe4e8",
  cScale5: "#e4ecf8",
  cScale6: "#e8f2f0",
  // Mindmap section text (dark, high contrast)
  cScaleLabel0: "#2c3e52",
  cScaleLabel1: "#2c4838",
  cScaleLabel2: "#4a3c20",
  cScaleLabel3: "#3c2c52",
  cScaleLabel4: "#4a2028",
  cScaleLabel5: "#2c3852",
  cScaleLabel6: "#2a3c38",
  // Mindmap section internal lines
  cScaleInv0: "#b0c4d8",
  cScaleInv1: "#a8d4b8",
  cScaleInv2: "#d8c898",
  cScaleInv3: "#c4aed8",
  cScaleInv4: "#d8a8ae",
  cScaleInv5: "#a8bed8",
  cScaleInv6: "#a8d0c8",
};

const DARK_THEME_VARS = {
  // General diagram colors (flowchart, sequence, etc.)
  primaryColor: "#243a52",
  primaryTextColor: "#d0d4dc",
  primaryBorderColor: "#3a5a78",
  secondaryColor: "#1e2c2a",
  secondaryTextColor: "#88c0b4",
  secondaryBorderColor: "#385850",
  tertiaryColor: "#302a1a",
  tertiaryTextColor: "#c8b06c",
  tertiaryBorderColor: "#584e30",
  lineColor: "#505868",
  textColor: "#d0d4dc",
  mainBkg: "#243a52",
  nodeBorder: "#3a5a78",
  // Root node (mindmap / git)
  git0: "#243a52",
  gitBranchLabel0: "#d0d4dc",
  // Mindmap section fills (deep, muted)
  cScale0: "#1e3448",
  cScale1: "#1e3228",
  cScale2: "#302a1a",
  cScale3: "#2a1e38",
  cScale4: "#2e1e22",
  cScale5: "#1e2a40",
  cScale6: "#1e2c2a",
  // Mindmap section text (light, readable against dark fills)
  cScaleLabel0: "#a8c4dc",
  cScaleLabel1: "#8cc4a0",
  cScaleLabel2: "#c8b06c",
  cScaleLabel3: "#b08cc8",
  cScaleLabel4: "#c8908a",
  cScaleLabel5: "#90b0d0",
  cScaleLabel6: "#88c0b4",
  // Mindmap section internal lines
  cScaleInv0: "#3a5a78",
  cScaleInv1: "#3a5848",
  cScaleInv2: "#584e30",
  cScaleInv3: "#4a3860",
  cScaleInv4: "#583840",
  cScaleInv5: "#384a68",
  cScaleInv6: "#385850",
};

function initMermaidTheme(mod: typeof import("mermaid")) {
  const dark = isDark();
  mod.default.initialize({
    startOnLoad: false,
    theme: "base",
    themeVariables: dark ? DARK_THEME_VARS : LIGHT_THEME_VARS,
    securityLevel: "strict",
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  });
  lastTheme = dark ? "dark" : "light";
}

async function getMermaid(): Promise<typeof import("mermaid")> {
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

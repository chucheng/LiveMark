import { createSignal } from "solid-js";

export type Theme = "light" | "dark" | "system";

const [theme, setThemeSignal] = createSignal<Theme>("system");

const darkQuery = typeof window !== "undefined"
  ? window.matchMedia("(prefers-color-scheme: dark)")
  : { matches: false, addEventListener: () => {}, removeEventListener: () => {} } as unknown as MediaQueryList;

function resolvedTheme(): "light" | "dark" {
  const t = theme();
  if (t === "system") {
    return darkQuery.matches ? "dark" : "light";
  }
  return t;
}

function applyTheme() {
  if (typeof document === "undefined") return;
  const resolved = resolvedTheme();
  if (resolved === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }
}

function setTheme(t: Theme) {
  if (typeof document !== "undefined") {
    // Add transition class for smooth theme switch
    document.documentElement.classList.add("lm-theme-transition");
    setTimeout(() => {
      document.documentElement.classList.remove("lm-theme-transition");
    }, 250);
  }
  setThemeSignal(t);
  applyTheme();
}

function cycleTheme() {
  const order: Theme[] = ["system", "dark", "light"];
  const idx = order.indexOf(theme());
  setTheme(order[(idx + 1) % order.length]);
}

// React to system preference changes
darkQuery.addEventListener("change", () => {
  if (theme() === "system") {
    applyTheme();
  }
});

// Apply on module load (for initial system theme)
applyTheme();

export const themeState = {
  theme,
  resolvedTheme,
  setTheme,
  cycleTheme,
};

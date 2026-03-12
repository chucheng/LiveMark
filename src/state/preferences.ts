import { invoke } from "@tauri-apps/api/core";
import { createSignal } from "solid-js";
import { themeState, type Theme } from "./theme";

const [focusMode, setFocusMode] = createSignal(false);

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let loaded = false;

interface Preferences {
  theme?: Theme;
  focusMode?: boolean;
}

async function loadPreferences() {
  try {
    const json = await invoke<string>("read_preferences");
    const prefs: Preferences = JSON.parse(json);
    if (prefs.theme) themeState.setTheme(prefs.theme);
    if (prefs.focusMode !== undefined) setFocusMode(prefs.focusMode);
  } catch {
    // Use defaults
  }
  loaded = true;
}

function savePreferences() {
  // Don't save until initial load is complete (avoids overwriting saved prefs with defaults)
  if (!loaded) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const prefs: Preferences = {
      theme: themeState.theme(),
      focusMode: focusMode(),
    };
    try {
      await invoke("write_preferences", { json: JSON.stringify(prefs) });
    } catch {
      // Silent fail for preferences
    }
  }, 500);
}

export const preferencesState = {
  focusMode,
  setFocusMode(value: boolean) {
    setFocusMode(value);
    savePreferences();
  },
  toggleFocusMode() {
    setFocusMode(!focusMode());
    savePreferences();
  },
  loadPreferences,
  savePreferences,
};

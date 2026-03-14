import { invoke } from "@tauri-apps/api/core";
import { createSignal } from "solid-js";
import { themeState, type Theme } from "./theme";
import { fileTreeState } from "./filetree";

const [focusMode, setFocusMode] = createSignal(false);
const [autoSave, setAutoSave] = createSignal(true);
const [fontSize, setFontSize] = createSignal(16);
const [contentWidth, setContentWidth] = createSignal(720);

const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 28;
const FONT_SIZE_STEP = 2;
const FONT_SIZE_DEFAULT = 16;

const CONTENT_WIDTH_MIN = 480;
const CONTENT_WIDTH_STEP = 60;
const CONTENT_WIDTH_DEFAULT = 720;

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let loaded = false;

interface Preferences {
  theme?: Theme;
  focusMode?: boolean;
  autoSave?: boolean;
  fontSize?: number;
  contentWidth?: number;
  sidebarVisible?: boolean;
}

async function loadPreferences() {
  try {
    const json = await invoke<string>("read_preferences");
    const prefs: Preferences = JSON.parse(json);
    if (prefs.theme) themeState.setTheme(prefs.theme);
    if (prefs.focusMode !== undefined) setFocusMode(prefs.focusMode);
    if (prefs.autoSave !== undefined) setAutoSave(prefs.autoSave);
    if (prefs.fontSize !== undefined) setFontSize(prefs.fontSize);
    if (prefs.contentWidth !== undefined) setContentWidth(prefs.contentWidth);
    if (prefs.sidebarVisible !== undefined) {
      fileTreeState.setSidebarVisible(prefs.sidebarVisible);
    }
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
      autoSave: autoSave(),
      fontSize: fontSize(),
      contentWidth: contentWidth(),
      sidebarVisible: fileTreeState.sidebarVisible(),
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
  autoSave,
  toggleAutoSave() {
    setAutoSave(!autoSave());
    savePreferences();
  },
  fontSize,
  zoomIn() {
    setFontSize(Math.min(fontSize() + FONT_SIZE_STEP, FONT_SIZE_MAX));
    savePreferences();
  },
  zoomOut() {
    setFontSize(Math.max(fontSize() - FONT_SIZE_STEP, FONT_SIZE_MIN));
    savePreferences();
  },
  resetZoom() {
    setFontSize(FONT_SIZE_DEFAULT);
    savePreferences();
  },
  contentWidth,
  widenContent() {
    const maxBase = Math.round(window.innerWidth * 16 / fontSize());
    setContentWidth(Math.min(contentWidth() + CONTENT_WIDTH_STEP, maxBase));
    savePreferences();
  },
  narrowContent() {
    setContentWidth(Math.max(contentWidth() - CONTENT_WIDTH_STEP, CONTENT_WIDTH_MIN));
    savePreferences();
  },
  resetContentWidth() {
    setContentWidth(CONTENT_WIDTH_DEFAULT);
    savePreferences();
  },
  loadPreferences,
  savePreferences,
};

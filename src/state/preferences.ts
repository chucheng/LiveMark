import { invoke } from "@tauri-apps/api/core";
import { createSignal } from "solid-js";
import { themeState, type Theme } from "./theme";
import { fileTreeState } from "./filetree";
import { feedbackState, type FeedbackPrefs } from "./feedback";

export type FocusLevel = "off" | "block";
const [focusMode, setFocusMode] = createSignal<FocusLevel>("off");
const [typewriterMode, setTypewriterMode] = createSignal(false);
const [autoSave, setAutoSave] = createSignal(true);
const [fontSize, setFontSize] = createSignal(16);
const [contentWidth, setContentWidth] = createSignal(720);
const [fontFamily, setFontFamily] = createSignal("system");
const [lineHeight, setLineHeight] = createSignal(1.7);
const [paragraphSpacing, setParagraphSpacing] = createSignal("0.8em");
const [editorPaddingX, setEditorPaddingX] = createSignal(48);
const [editorPaddingY, setEditorPaddingY] = createSignal(32);
const [selectedPreset, setSelectedPreset] = createSignal("default");
const [customShortcuts, setCustomShortcuts] = createSignal<Record<string, string>>({});
const [hasSeenWelcome, setHasSeenWelcome] = createSignal(false);

export interface UserPreset {
  name: string;
  fontSize: number;
  lineHeight: number;
  contentWidth: number;
  fontFamily: string;
  paragraphSpacing: string;
}

const [userPresets, setUserPresets] = createSignal<UserPreset[]>([]);

export const BUILT_IN_PRESETS: UserPreset[] = [
  { name: "Default", fontSize: 16, lineHeight: 1.7, contentWidth: 720, fontFamily: "system", paragraphSpacing: "0.8em" },
  { name: "Compact", fontSize: 14, lineHeight: 1.5, contentWidth: 800, fontFamily: "system", paragraphSpacing: "0.5em" },
  { name: "Wide", fontSize: 16, lineHeight: 1.8, contentWidth: 960, fontFamily: "serif", paragraphSpacing: "1.0em" },
];

const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 28;
const FONT_SIZE_STEP = 2;
const FONT_SIZE_DEFAULT = 16;

const CONTENT_WIDTH_MIN = 480;
const CONTENT_WIDTH_MAX = 2000;
const CONTENT_WIDTH_STEP = 60;
const CONTENT_WIDTH_DEFAULT = 720;

const LINE_HEIGHT_MIN = 1.2;
const LINE_HEIGHT_MAX = 2.5;
const LINE_HEIGHT_STEP = 0.1;

const PADDING_MIN = 0;
const PADDING_MAX = 120;
const PADDING_STEP = 8;

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let loaded = false;

interface Preferences {
  theme?: Theme;
  focusMode?: boolean | FocusLevel | "sentence";
  typewriterMode?: boolean;
  autoSave?: boolean;
  fontSize?: number;
  contentWidth?: number;
  sidebarVisible?: boolean;
  fontFamily?: string;
  lineHeight?: number;
  paragraphSpacing?: string;
  editorPaddingX?: number;
  editorPaddingY?: number;
  selectedPreset?: string;
  userPresets?: UserPreset[];
  customShortcuts?: Record<string, string>;
  hasSeenWelcome?: boolean;
  feedback?: FeedbackPrefs;
}

async function loadPreferences() {
  try {
    const json = await invoke<string>("read_preferences");
    const prefs: Preferences = JSON.parse(json);
    if (prefs.theme) themeState.setTheme(prefs.theme);
    if (prefs.focusMode !== undefined) {
      // Backwards compat: boolean → FocusLevel, "sentence" → "off"
      if (prefs.focusMode === true) setFocusMode("block");
      else if (prefs.focusMode === false || prefs.focusMode === "sentence") setFocusMode("off");
      else setFocusMode(prefs.focusMode as FocusLevel);
    }
    if (prefs.typewriterMode !== undefined) setTypewriterMode(prefs.typewriterMode);
    if (prefs.autoSave !== undefined) setAutoSave(prefs.autoSave);
    if (prefs.fontSize !== undefined) setFontSize(prefs.fontSize);
    if (prefs.contentWidth !== undefined) setContentWidth(prefs.contentWidth);
    if (prefs.sidebarVisible !== undefined) {
      fileTreeState.setSidebarVisible(prefs.sidebarVisible);
    }
    if (prefs.fontFamily !== undefined) setFontFamily(prefs.fontFamily);
    if (prefs.lineHeight !== undefined) setLineHeight(prefs.lineHeight);
    if (prefs.paragraphSpacing !== undefined) setParagraphSpacing(prefs.paragraphSpacing);
    if (prefs.editorPaddingX !== undefined) setEditorPaddingX(prefs.editorPaddingX);
    if (prefs.editorPaddingY !== undefined) setEditorPaddingY(prefs.editorPaddingY);
    if (prefs.selectedPreset !== undefined) setSelectedPreset(prefs.selectedPreset);
    if (prefs.userPresets !== undefined) setUserPresets(prefs.userPresets);
    if (prefs.customShortcuts !== undefined) setCustomShortcuts(prefs.customShortcuts);
    if (prefs.hasSeenWelcome !== undefined) setHasSeenWelcome(prefs.hasSeenWelcome);
    if (prefs.feedback) feedbackState.loadFeedbackPrefs(prefs.feedback);
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
      typewriterMode: typewriterMode(),
      autoSave: autoSave(),
      fontSize: fontSize(),
      contentWidth: contentWidth(),
      sidebarVisible: fileTreeState.sidebarVisible(),
      fontFamily: fontFamily(),
      lineHeight: lineHeight(),
      paragraphSpacing: paragraphSpacing(),
      editorPaddingX: editorPaddingX(),
      editorPaddingY: editorPaddingY(),
      selectedPreset: selectedPreset(),
      userPresets: userPresets(),
      customShortcuts: customShortcuts(),
      hasSeenWelcome: hasSeenWelcome(),
      feedback: feedbackState.saveFeedbackPrefs(),
    };
    try {
      await invoke("write_preferences", { json: JSON.stringify(prefs) });
    } catch {
      // Silent fail for preferences
    }
  }, 500);
}

const PRESET_FONT_VALUES = new Set(["system", "serif", "mono"]);

function fontFamilyCSS(): string {
  const ff = fontFamily();
  switch (ff) {
    case "serif":
      return '"Georgia", "Times New Roman", "Noto Serif", serif';
    case "mono":
      return "var(--lm-font-mono)";
    case "system":
      return '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    default:
      // Custom font value — use it directly as CSS font-family
      return ff;
  }
}

function applyPreset(preset: UserPreset) {
  setFontSize(preset.fontSize);
  setLineHeight(preset.lineHeight);
  setContentWidth(preset.contentWidth);
  setFontFamily(preset.fontFamily);
  setParagraphSpacing(preset.paragraphSpacing);
  setSelectedPreset(preset.name.toLowerCase());
  savePreferences();
}

function saveCurrentAsPreset(name: string) {
  const preset: UserPreset = {
    name,
    fontSize: fontSize(),
    lineHeight: lineHeight(),
    contentWidth: contentWidth(),
    fontFamily: fontFamily(),
    paragraphSpacing: paragraphSpacing(),
  };
  setUserPresets([...userPresets().filter((p) => p.name !== name), preset]);
  setSelectedPreset(name.toLowerCase());
  savePreferences();
}

function deletePreset(name: string) {
  setUserPresets(userPresets().filter((p) => p.name !== name));
  if (selectedPreset() === name.toLowerCase()) setSelectedPreset("default");
  savePreferences();
}

export { PRESET_FONT_VALUES };

export const preferencesState = {
  focusMode,
  setFocusMode(value: FocusLevel) {
    setFocusMode(value);
    savePreferences();
  },
  toggleFocusMode() {
    const cycle: Record<FocusLevel, FocusLevel> = { off: "block", block: "off" };
    setFocusMode(cycle[focusMode()]);
    savePreferences();
  },
  typewriterMode,
  setTypewriterMode(value: boolean) {
    setTypewriterMode(value);
    savePreferences();
  },
  toggleTypewriterMode() {
    setTypewriterMode(!typewriterMode());
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
    const maxBase = Math.min(Math.round(window.innerWidth * 16 / fontSize()), CONTENT_WIDTH_MAX);
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
  // New template settings
  fontFamily,
  setFontFamily(value: string) {
    setFontFamily(value);
    setSelectedPreset("custom");
    savePreferences();
  },
  fontFamilyCSS,
  lineHeight,
  setLineHeight(value: number) {
    setLineHeight(Math.round(Math.max(LINE_HEIGHT_MIN, Math.min(LINE_HEIGHT_MAX, value)) * 10) / 10);
    setSelectedPreset("custom");
    savePreferences();
  },
  increaseLineHeight() {
    const v = Math.round((lineHeight() + LINE_HEIGHT_STEP) * 10) / 10;
    setLineHeight(Math.min(v, LINE_HEIGHT_MAX));
    setSelectedPreset("custom");
    savePreferences();
  },
  decreaseLineHeight() {
    const v = Math.round((lineHeight() - LINE_HEIGHT_STEP) * 10) / 10;
    setLineHeight(Math.max(v, LINE_HEIGHT_MIN));
    setSelectedPreset("custom");
    savePreferences();
  },
  paragraphSpacing,
  setParagraphSpacing(value: string) {
    setParagraphSpacing(value);
    setSelectedPreset("custom");
    savePreferences();
  },
  editorPaddingX,
  setEditorPaddingX(value: number) {
    setEditorPaddingX(Math.max(PADDING_MIN, Math.min(PADDING_MAX, value)));
    savePreferences();
  },
  increaseEditorPaddingX() {
    setEditorPaddingX(Math.min(editorPaddingX() + PADDING_STEP, PADDING_MAX));
    savePreferences();
  },
  decreaseEditorPaddingX() {
    setEditorPaddingX(Math.max(editorPaddingX() - PADDING_STEP, PADDING_MIN));
    savePreferences();
  },
  editorPaddingY,
  setEditorPaddingY(value: number) {
    setEditorPaddingY(Math.max(PADDING_MIN, Math.min(PADDING_MAX, value)));
    savePreferences();
  },
  increaseEditorPaddingY() {
    setEditorPaddingY(Math.min(editorPaddingY() + PADDING_STEP, PADDING_MAX));
    savePreferences();
  },
  decreaseEditorPaddingY() {
    setEditorPaddingY(Math.max(editorPaddingY() - PADDING_STEP, PADDING_MIN));
    savePreferences();
  },
  // Font size setters that mark preset as custom
  setFontSize(value: number) {
    setFontSize(Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, value)));
    setSelectedPreset("custom");
    savePreferences();
  },
  setContentWidth(value: number) {
    setContentWidth(Math.max(CONTENT_WIDTH_MIN, Math.min(CONTENT_WIDTH_MAX, value)));
    setSelectedPreset("custom");
    savePreferences();
  },
  // Presets
  selectedPreset,
  userPresets,
  applyPreset,
  saveCurrentAsPreset,
  deletePreset,
  // Custom shortcuts (stored in preferences, managed by shortcuts.ts)
  customShortcuts,
  setCustomShortcuts(value: Record<string, string>) {
    setCustomShortcuts(value);
    savePreferences();
  },
  hasSeenWelcome,
  setHasSeenWelcome(value: boolean) {
    setHasSeenWelcome(value);
    savePreferences();
  },
  loadPreferences,
  savePreferences,
  // Constants for UI
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  FONT_SIZE_STEP,
  CONTENT_WIDTH_MIN,
  CONTENT_WIDTH_MAX,
  CONTENT_WIDTH_STEP,
  LINE_HEIGHT_MIN,
  LINE_HEIGHT_MAX,
  LINE_HEIGHT_STEP,
  PADDING_MIN,
  PADDING_MAX,
  PADDING_STEP,
};

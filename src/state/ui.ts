import { createSignal } from "solid-js";

const [isSourceView, setSourceView] = createSignal(false);
const [isPaletteOpen, setPaletteOpen] = createSignal(false);
const [isFindOpen, setFindOpen] = createSignal(false);
const [findInitialQuery, setFindInitialQuery] = createSignal("");
const [isAboutOpen, setAboutOpen] = createSignal(false);
const [isReviewOpen, setReviewOpen] = createSignal(false);
const [isMindMapOpen, setMindMapOpen] = createSignal(false);
const [isFullscreen, setFullscreen] = createSignal(false);
const [chromeHidden, setChromeHidden] = createSignal(false);
const [isSettingsOpen, setSettingsOpen] = createSignal(false);
const [chordPending, setChordPending] = createSignal<string | null>(null);
const [statusMessage, setStatusMessageSignal] = createSignal("");
let statusFadeTimer: ReturnType<typeof setTimeout> | null = null;

function showStatus(msg: string, duration = 2000) {
  if (statusFadeTimer) clearTimeout(statusFadeTimer);
  setStatusMessageSignal(msg);
  statusFadeTimer = setTimeout(() => setStatusMessageSignal(""), duration);
}

export const uiState = {
  isSourceView,
  setSourceView,
  toggleSourceView() {
    setSourceView(!isSourceView());
  },
  isPaletteOpen,
  setPaletteOpen,
  togglePalette() {
    setPaletteOpen(!isPaletteOpen());
  },
  isFindOpen,
  setFindOpen,
  findInitialQuery,
  setFindInitialQuery,
  toggleFind() {
    setFindOpen(!isFindOpen());
  },
  openFind(initialQuery?: string) {
    setFindInitialQuery(initialQuery ?? "");
    setFindOpen(true);
  },
  isAboutOpen,
  setAboutOpen,
  isReviewOpen,
  setReviewOpen,
  toggleReview() {
    setReviewOpen(!isReviewOpen());
  },
  isMindMapOpen,
  setMindMapOpen,
  toggleMindMap() {
    setMindMapOpen(!isMindMapOpen());
  },
  isSettingsOpen,
  setSettingsOpen,
  toggleSettings() {
    setSettingsOpen(!isSettingsOpen());
  },
  isFullscreen,
  setFullscreen,
  chromeHidden,
  setChromeHidden,
  hideChrome() {
    if (isFullscreen()) setChromeHidden(true);
  },
  showChrome() {
    setChromeHidden(false);
  },
  chordPending,
  setChordPending,
  clearChord() {
    setChordPending(null);
  },
  statusMessage,
  showStatus,
};

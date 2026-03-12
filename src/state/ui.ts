import { createSignal } from "solid-js";

const [isSourceView, setSourceView] = createSignal(false);
const [isPaletteOpen, setPaletteOpen] = createSignal(false);
const [isFindOpen, setFindOpen] = createSignal(false);
const [isAboutOpen, setAboutOpen] = createSignal(false);

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
  toggleFind() {
    setFindOpen(!isFindOpen());
  },
  isAboutOpen,
  setAboutOpen,
};

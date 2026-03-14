import { type Accessor, Show } from "solid-js";
import { themeState } from "../state/theme";
import { uiState } from "../state/ui";
import { preferencesState } from "../state/preferences";

export interface CursorInfo {
  line: number;
  col: number;
  selected: number;
}

interface StatusBarProps {
  wordCount: Accessor<number>;
  cursorInfo: Accessor<CursorInfo>;
  autoSaveStatus?: Accessor<string>;
}

export default function StatusBar(props: StatusBarProps) {
  const themeIcon = () => {
    const t = themeState.theme();
    if (t === "light") return "Light";
    if (t === "dark") return "Dark";
    return "Auto";
  };

  return (
    <div class="lm-statusbar">
      <div class="lm-statusbar-left">
        <span>
          Ln {props.cursorInfo().line}, Col {props.cursorInfo().col}
        </span>
        {props.cursorInfo().selected > 0 && (
          <span>{props.cursorInfo().selected} selected</span>
        )}
        <Show when={props.autoSaveStatus?.()}>
          <span class="lm-statusbar-autosave">{props.autoSaveStatus!()}</span>
        </Show>
        <Show when={uiState.chordPending()}>
          <span class="lm-statusbar-chord">
            ({uiState.chordPending()}) pressed — waiting for key…
          </span>
        </Show>
      </div>
      <div class="lm-statusbar-right">
        <span>{props.wordCount()} words</span>
        <Show when={preferencesState.fontSize() !== 16}>
          <button
            class="lm-statusbar-btn"
            onClick={() => preferencesState.resetZoom()}
            title="Reset zoom to 100%"
          >
            {Math.round(preferencesState.fontSize() / 16 * 100) + "%"}
          </button>
        </Show>
        <span>UTF-8</span>
        <button
          class="lm-statusbar-btn"
          onClick={() => preferencesState.toggleAutoSave()}
          title="Toggle auto-save"
        >
          {preferencesState.autoSave() ? "Auto-save: On" : "Auto-save: Off"}
        </button>
        <button
          class="lm-statusbar-btn"
          onClick={() => themeState.cycleTheme()}
          title="Toggle theme"
        >
          {themeIcon()}
        </button>
      </div>
    </div>
  );
}

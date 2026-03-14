import { type Accessor, Show } from "solid-js";
import { message } from "@tauri-apps/plugin-dialog";
import { documentState } from "../state/document";
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

  async function handleAutoSaveToggle() {
    if (preferencesState.autoSave()) {
      // Turning OFF — no confirmation needed
      preferencesState.toggleAutoSave();
      return;
    }
    // Turning ON — warn user
    const result = await message(
      "Auto-save will automatically write your changes to disk 30 seconds after each edit. Make sure you're comfortable with files being overwritten without manual confirmation.",
      {
        title: "Enable Auto-Save?",
        kind: "warning",
        buttons: {
          yes: "Enable",
          no: "Cancel",
          cancel: "Cancel",
        },
      },
    );
    if (result === "Enable") {
      preferencesState.toggleAutoSave();
    }
  }

  return (
    <div class="lm-statusbar">
      <div class="lm-statusbar-left">
        <span>
          Ln {props.cursorInfo().line}, Col {props.cursorInfo().col}
        </span>
        {props.cursorInfo().selected > 0 && (
          <span>{props.cursorInfo().selected} selected</span>
        )}
        <Show when={uiState.statusMessage()}>
          <span class="lm-statusbar-autosave">{uiState.statusMessage()}</span>
        </Show>
        <Show when={props.autoSaveStatus?.()}>
          <span class="lm-statusbar-autosave">{props.autoSaveStatus!()}</span>
        </Show>
        <Show when={uiState.chordPending()}>
          <span class="lm-statusbar-chord">
            {uiState.chordPending()} → ?
          </span>
        </Show>
      </div>
      <div class="lm-statusbar-right">
        <Show when={documentState.isReadOnly()}>
          <span class="lm-statusbar-readonly">Read Only</span>
        </Show>
        <span>{props.wordCount()} words</span>
        <button
          class="lm-statusbar-btn"
          onClick={() => preferencesState.resetZoom()}
          title="Reset zoom to 100%"
        >
          {Math.round((preferencesState.fontSize() / 16) * 100) + "%"}
        </button>
        <span>UTF-8</span>
        <button
          class="lm-statusbar-btn"
          onClick={handleAutoSaveToggle}
          title="Toggle auto-save"
        >
          {preferencesState.autoSave() ? "Auto-save: On" : "Auto-save: Off"}
        </button>
        <button
          class="lm-statusbar-btn"
          onClick={() => { themeState.cycleTheme(); preferencesState.savePreferences(); }}
          title="Toggle theme"
        >
          {themeIcon()}
        </button>
      </div>
    </div>
  );
}

import { type Accessor } from "solid-js";
import { themeState } from "../state/theme";

export interface CursorInfo {
  line: number;
  col: number;
  selected: number;
}

interface StatusBarProps {
  wordCount: Accessor<number>;
  cursorInfo: Accessor<CursorInfo>;
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
      </div>
      <div class="lm-statusbar-right">
        <span>{props.wordCount()} words</span>
        <span>UTF-8</span>
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

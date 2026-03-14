import { onMount } from "solid-js";
import { uiState } from "../state/ui";

declare const __APP_VERSION__: string;
const APP_VERSION = __APP_VERSION__;

export default function AboutModal() {
  let dialogRef!: HTMLDivElement;

  function handleBackdrop(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains("lm-about-overlay")) {
      uiState.setAboutOpen(false);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      uiState.setAboutOpen(false);
    }
  }

  onMount(() => {
    dialogRef.focus();
  });

  return (
    <div class="lm-about-overlay" onClick={handleBackdrop} onKeyDown={handleKeydown}>
      <div class="lm-about" tabIndex={-1} ref={dialogRef} role="dialog" aria-modal="true" aria-label="About LiveMark">
        <div class="lm-about-name">LiveMark</div>
        <div class="lm-about-version">Version {APP_VERSION}</div>
        <div class="lm-about-desc">
          A fast, distraction-free Markdown editor with seamless inline live-preview.
        </div>
        <div class="lm-about-stack">
          Built with Tauri + SolidJS + ProseMirror
        </div>
        <button class="lm-about-close" onClick={() => uiState.setAboutOpen(false)}>
          OK
        </button>
      </div>
    </div>
  );
}

import { onMount } from "solid-js";
import { feedbackState } from "../state/feedback";
import { preferencesState } from "../state/preferences";

export default function EnjoymentPrompt() {
  let dialogRef!: HTMLDivElement;

  const save = () => preferencesState.savePreferences();

  function handleBackdrop(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains("lm-enjoyment-overlay")) {
      feedbackState.handleEnjoymentNotNow(save);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      feedbackState.handleEnjoymentNotNow(save);
    }
  }

  onMount(() => {
    dialogRef.focus();
  });

  return (
    <div class="lm-enjoyment-overlay" onClick={handleBackdrop} onKeyDown={handleKeydown}>
      <div class="lm-enjoyment" tabIndex={-1} ref={dialogRef} role="dialog" aria-modal="true" aria-label="Enjoying LiveMark?">
        <div class="lm-enjoyment-title">Enjoying LiveMark?</div>
        <div class="lm-enjoyment-desc">
          Your feedback helps us improve. Let us know how we're doing!
        </div>
        <div class="lm-enjoyment-actions">
          <button class="lm-enjoyment-btn lm-enjoyment-yes" onClick={() => feedbackState.handleEnjoymentYes(save)}>
            Yes
          </button>
          <button class="lm-enjoyment-btn lm-enjoyment-no" onClick={() => feedbackState.handleEnjoymentNo(save)}>
            Not Really
          </button>
          <button class="lm-enjoyment-btn lm-enjoyment-later" onClick={() => feedbackState.handleEnjoymentNotNow(save)}>
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}

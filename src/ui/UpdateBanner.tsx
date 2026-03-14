import { Show } from "solid-js";
import { uiState } from "../state/ui";
import { confirmAllUnsavedChanges } from "../commands/file-commands";

export default function UpdateBanner() {
  const info = () => uiState.updateAvailable();
  const progress = () => uiState.updateProgress();
  const ready = () => uiState.updateReady();

  function percent(): number {
    const p = progress();
    if (!p || p.total === 0) return 0;
    return Math.round((p.downloaded / p.total) * 100);
  }

  async function handleUpdate() {
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update?.available) return;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started" && event.data.contentLength) {
          uiState.setUpdateProgress({ total: event.data.contentLength, downloaded: 0 });
        } else if (event.event === "Progress") {
          const prev = uiState.updateProgress();
          if (prev) {
            uiState.setUpdateProgress({ total: prev.total, downloaded: prev.downloaded + event.data.chunkLength });
          }
        } else if (event.event === "Finished") {
          uiState.setUpdateProgress(null);
          uiState.setUpdateReady(true);
        }
      });
    } catch {
      // Download failed — dismiss
      dismiss();
    }
  }

  async function handleRestart() {
    const canClose = await confirmAllUnsavedChanges();
    if (!canClose) return;
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  }

  function dismiss() {
    uiState.setUpdateAvailable(null);
    uiState.setUpdateProgress(null);
    uiState.setUpdateReady(false);
  }

  return (
    <div class="lm-update-banner">
      <Show when={ready()}>
        <span class="lm-update-text">Update ready. Restart to apply.</span>
        <button class="lm-update-btn" onClick={handleRestart}>Restart Now</button>
        <button class="lm-update-btn lm-update-btn-secondary" onClick={dismiss}>Later</button>
      </Show>

      <Show when={!ready() && progress()}>
        <span class="lm-update-text">Downloading update… {percent()}%</span>
        <div class="lm-update-progress">
          <div class="lm-update-progress-bar" style={{ width: `${percent()}%` }} />
        </div>
      </Show>

      <Show when={!ready() && !progress()}>
        <span class="lm-update-text">
          LiveMark {info()?.version} is available.
        </span>
        <button class="lm-update-btn" onClick={handleUpdate}>Update Now</button>
        <button class="lm-update-btn lm-update-btn-secondary" onClick={dismiss}>Later</button>
      </Show>
    </div>
  );
}

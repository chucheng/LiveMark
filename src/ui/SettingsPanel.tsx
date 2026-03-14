import { createSignal, createEffect, For, Show, onMount } from "solid-js";
import { uiState } from "../state/ui";
import { preferencesState, BUILT_IN_PRESETS, type UserPreset } from "../state/preferences";
import { getCommands, type Command } from "../commands/registry";
import {
  normalizeKeyEvent,
  normalizeShortcut,
  detectConflict,
  setShortcut,
  resetShortcut,
  getEffectiveShortcut,
  type ConflictInfo,
} from "../state/shortcuts";

type FontOption = { label: string; value: string };

const FONT_OPTIONS: FontOption[] = [
  { label: "System (Default)", value: "system" },
  { label: "Serif", value: "serif" },
  { label: "Monospace", value: "mono" },
];

const SPACING_OPTIONS = ["0.4em", "0.5em", "0.6em", "0.8em", "1.0em", "1.2em"];

export default function SettingsPanel() {
  let panelRef!: HTMLDivElement;
  const [shortcutSearch, setShortcutSearch] = createSignal("");
  const [capturingCmd, setCapturingCmd] = createSignal<string | null>(null);
  const [capturedShortcut, setCapturedShortcut] = createSignal("");
  const [captureConflict, setCaptureConflict] = createSignal<ConflictInfo>({});
  const [presetName, setPresetName] = createSignal("");
  const [customFont, setCustomFont] = createSignal("");

  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains("lm-settings-overlay")) {
      uiState.setSettingsOpen(false);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      if (capturingCmd()) {
        setCapturingCmd(null);
        setCapturedShortcut("");
        setCaptureConflict({});
      } else {
        uiState.setSettingsOpen(false);
      }
      e.preventDefault();
    }
  }

  // — Stepper helpers —
  function Stepper(props: {
    label: string;
    value: () => number | string;
    onIncrease: () => void;
    onDecrease: () => void;
    format?: (v: number | string) => string;
  }) {
    return (
      <div class="lm-settings-stepper">
        <span class="lm-settings-stepper-label">{props.label}</span>
        <div class="lm-settings-stepper-controls">
          <button class="lm-settings-stepper-btn" onClick={props.onDecrease}>−</button>
          <span class="lm-settings-stepper-value">
            {props.format ? props.format(props.value()) : props.value()}
          </span>
          <button class="lm-settings-stepper-btn" onClick={props.onIncrease}>+</button>
        </div>
      </div>
    );
  }

  // — Shortcut capture —
  function startCapture(cmdId: string) {
    setCapturingCmd(cmdId);
    setCapturedShortcut("");
    setCaptureConflict({});
  }

  function handleCaptureKeydown(e: KeyboardEvent, cmdId: string) {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === "Escape") {
      setCapturingCmd(null);
      setCapturedShortcut("");
      setCaptureConflict({});
      return;
    }

    if (e.key === "Backspace" && (e.metaKey || e.ctrlKey)) {
      // Cmd+Backspace clears the shortcut
      resetShortcut(cmdId);
      setCapturingCmd(null);
      setCapturedShortcut("");
      setCaptureConflict({});
      return;
    }

    const shortcut = normalizeKeyEvent(e);
    if (!shortcut) return; // bare modifier

    setCapturedShortcut(shortcut);
    const conflict = detectConflict(shortcut, cmdId);
    setCaptureConflict(conflict);

    // If no conflict, apply immediately
    if (!conflict.conflictWith && !conflict.isReserved) {
      setShortcut(cmdId, shortcut);
      setCapturingCmd(null);
      setCapturedShortcut("");
      setCaptureConflict({});
    }
  }

  function confirmCapture(cmdId: string) {
    const shortcut = capturedShortcut();
    if (shortcut) {
      setShortcut(cmdId, shortcut);
    }
    setCapturingCmd(null);
    setCapturedShortcut("");
    setCaptureConflict({});
  }

  function filteredCommands(): Command[] {
    const q = shortcutSearch().toLowerCase();
    return getCommands().filter((cmd) => {
      if (!q) return true;
      return cmd.label.toLowerCase().includes(q) || cmd.category.toLowerCase().includes(q);
    });
  }

  // — Presets —
  function allPresets(): (UserPreset & { isBuiltIn: boolean })[] {
    return [
      ...BUILT_IN_PRESETS.map((p) => ({ ...p, isBuiltIn: true })),
      ...preferencesState.userPresets().map((p) => ({ ...p, isBuiltIn: false })),
    ];
  }

  function handleSavePreset() {
    const name = presetName().trim();
    if (!name) return;
    preferencesState.saveCurrentAsPreset(name);
    setPresetName("");
  }

  return (
    <div class="lm-settings-overlay" onClick={handleBackdropClick} onKeyDown={handleKeydown}>
      <div class="lm-settings-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Settings">
        <div class="lm-settings-header">
          <h2 class="lm-settings-title">Settings</h2>
          <button class="lm-settings-close" onClick={() => uiState.setSettingsOpen(false)}>
            &times;
          </button>
        </div>

        <div class="lm-settings-body">
          {/* ── Section: Editor ── */}
          <section class="lm-settings-section">
            <h3 class="lm-settings-section-title">Editor</h3>

            {/* Font Family */}
            <div class="lm-settings-row">
              <span class="lm-settings-label">Font Family</span>
              <div class="lm-settings-control">
                <select
                  class="lm-settings-select"
                  value={preferencesState.fontFamily()}
                  onChange={(e) => {
                    const val = e.currentTarget.value;
                    if (val === "custom") return; // handled by text input
                    preferencesState.setFontFamily(val);
                  }}
                >
                  <For each={FONT_OPTIONS}>
                    {(opt) => <option value={opt.value}>{opt.label}</option>}
                  </For>
                  <option value="custom">Custom…</option>
                </select>
              </div>
            </div>

            <Show when={preferencesState.fontFamily() === "custom"}>
              <div class="lm-settings-row">
                <span class="lm-settings-label">Custom Font</span>
                <input
                  class="lm-settings-input"
                  type="text"
                  placeholder="e.g. 'Fira Sans', sans-serif"
                  value={customFont()}
                  onInput={(e) => setCustomFont(e.currentTarget.value)}
                  onBlur={() => {
                    if (customFont().trim()) {
                      preferencesState.setFontFamily(customFont().trim());
                    }
                  }}
                />
              </div>
            </Show>

            <Stepper
              label="Font Size"
              value={preferencesState.fontSize}
              onIncrease={() => preferencesState.zoomIn()}
              onDecrease={() => preferencesState.zoomOut()}
              format={(v) => `${v}px`}
            />

            <Stepper
              label="Line Height"
              value={preferencesState.lineHeight}
              onIncrease={() => preferencesState.increaseLineHeight()}
              onDecrease={() => preferencesState.decreaseLineHeight()}
              format={(v) => String(v)}
            />

            <Stepper
              label="Content Width"
              value={preferencesState.contentWidth}
              onIncrease={() => preferencesState.widenContent()}
              onDecrease={() => preferencesState.narrowContent()}
              format={(v) => `${v}px`}
            />

            {/* Paragraph Spacing */}
            <div class="lm-settings-row">
              <span class="lm-settings-label">Paragraph Spacing</span>
              <div class="lm-settings-control">
                <select
                  class="lm-settings-select"
                  value={preferencesState.paragraphSpacing()}
                  onChange={(e) => preferencesState.setParagraphSpacing(e.currentTarget.value)}
                >
                  <For each={SPACING_OPTIONS}>
                    {(s) => <option value={s}>{s}</option>}
                  </For>
                </select>
              </div>
            </div>

            <Stepper
              label="Horizontal Padding"
              value={preferencesState.editorPaddingX}
              onIncrease={() => preferencesState.increaseEditorPaddingX()}
              onDecrease={() => preferencesState.decreaseEditorPaddingX()}
              format={(v) => `${v}px`}
            />

            <Stepper
              label="Vertical Padding"
              value={preferencesState.editorPaddingY}
              onIncrease={() => preferencesState.increaseEditorPaddingY()}
              onDecrease={() => preferencesState.decreaseEditorPaddingY()}
              format={(v) => `${v}px`}
            />

            {/* Two-Column */}
            <div class="lm-settings-row">
              <span class="lm-settings-label">Two-Column Layout</span>
              <label class="lm-settings-toggle">
                <input
                  type="checkbox"
                  checked={preferencesState.twoColumn()}
                  onChange={(e) => preferencesState.setTwoColumn(e.currentTarget.checked)}
                />
                <span class="lm-settings-toggle-track" />
              </label>
            </div>
          </section>

          {/* ── Section: Presets ── */}
          <section class="lm-settings-section">
            <h3 class="lm-settings-section-title">Presets</h3>

            <div class="lm-settings-presets">
              <For each={allPresets()}>
                {(preset) => (
                  <div
                    class="lm-settings-preset-item"
                    classList={{ "lm-preset-active": preferencesState.selectedPreset() === preset.name.toLowerCase() }}
                  >
                    <button
                      class="lm-settings-preset-btn"
                      onClick={() => preferencesState.applyPreset(preset)}
                    >
                      <span class="lm-preset-name">{preset.name}</span>
                      <span class="lm-preset-detail">
                        {preset.fontSize}px · {preset.lineHeight} · {preset.contentWidth}px
                      </span>
                    </button>
                    <Show when={!preset.isBuiltIn}>
                      <button
                        class="lm-settings-preset-delete"
                        onClick={() => preferencesState.deletePreset(preset.name)}
                        title="Delete preset"
                      >
                        &times;
                      </button>
                    </Show>
                  </div>
                )}
              </For>
            </div>

            <div class="lm-settings-preset-save">
              <input
                class="lm-settings-input"
                type="text"
                placeholder="Preset name…"
                value={presetName()}
                onInput={(e) => setPresetName(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSavePreset(); }}
              />
              <button
                class="lm-settings-btn"
                disabled={!presetName().trim()}
                onClick={handleSavePreset}
              >
                Save Current
              </button>
            </div>
          </section>

          {/* ── Section: Keyboard Shortcuts ── */}
          <section class="lm-settings-section">
            <h3 class="lm-settings-section-title">Keyboard Shortcuts</h3>

            <input
              class="lm-settings-input lm-settings-shortcut-search"
              type="text"
              placeholder="Search commands…"
              value={shortcutSearch()}
              onInput={(e) => setShortcutSearch(e.currentTarget.value)}
            />

            <div class="lm-settings-shortcuts-list">
              <For each={filteredCommands()}>
                {(cmd) => {
                  const effective = () => getEffectiveShortcut(cmd) || "";
                  const isCustom = () => !!preferencesState.customShortcuts()[cmd.id];
                  const isCapturing = () => capturingCmd() === cmd.id;

                  return (
                    <div class="lm-settings-shortcut-row">
                      <span class="lm-settings-shortcut-category">{cmd.category}</span>
                      <span class="lm-settings-shortcut-label">{cmd.label}</span>
                      <div class="lm-settings-shortcut-capture">
                        <Show when={isCapturing()} fallback={
                          <button
                            class="lm-settings-shortcut-key"
                            classList={{ "lm-shortcut-custom": isCustom() }}
                            onClick={() => startCapture(cmd.id)}
                            title="Click to reassign"
                          >
                            {effective() || "—"}
                          </button>
                        }>
                          <input
                            class="lm-settings-shortcut-input"
                            type="text"
                            readOnly
                            placeholder="Press key combo…"
                            value={capturedShortcut()}
                            onKeyDown={(e) => handleCaptureKeydown(e, cmd.id)}
                            ref={(el) => el.focus()}
                          />
                          <Show when={captureConflict().conflictWith || captureConflict().isReserved}>
                            <div class="lm-settings-shortcut-conflict">
                              {captureConflict().isReserved
                                ? "Reserved by OS"
                                : `Conflicts with "${captureConflict().conflictWith?.label}"`}
                              <button
                                class="lm-settings-conflict-confirm"
                                onClick={() => confirmCapture(cmd.id)}
                              >
                                Assign anyway
                              </button>
                              <button
                                class="lm-settings-conflict-cancel"
                                onClick={() => {
                                  setCapturingCmd(null);
                                  setCapturedShortcut("");
                                  setCaptureConflict({});
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </Show>
                        </Show>
                      </div>
                      <Show when={isCustom()}>
                        <button
                          class="lm-settings-shortcut-reset"
                          onClick={() => resetShortcut(cmd.id)}
                          title="Reset to default"
                        >
                          ↩
                        </button>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

import { createSignal, createEffect, For, Show, onMount, onCleanup } from "solid-js";
import { uiState } from "../state/ui";
import { preferencesState, BUILT_IN_PRESETS, PRESET_FONT_VALUES, AI_DEFAULT_PROMPT, type UserPreset, type AIBaseURL } from "../state/preferences";
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
  let closeButtonRef!: HTMLButtonElement;
  const [shortcutSearch, setShortcutSearch] = createSignal("");
  const [capturingCmd, setCapturingCmd] = createSignal<string | null>(null);
  const [capturedShortcut, setCapturedShortcut] = createSignal("");
  const [captureConflict, setCaptureConflict] = createSignal<ConflictInfo>({});
  const [presetName, setPresetName] = createSignal("");
  const [customFont, setCustomFont] = createSignal("");
  const [customFontError, setCustomFontError] = createSignal(false);
  const [presetStatus, setPresetStatus] = createSignal("");
  // AI settings
  const [showApiKey, setShowApiKey] = createSignal(false);
  const [showCustomBaseURL, setShowCustomBaseURL] = createSignal(
    preferencesState.aiBaseURLPreset() === "custom"
  );

  // Track the previous font family for reverting when custom input is left empty
  const [previousFontFamily, setPreviousFontFamily] = createSignal("system");

  // Track whether custom font input is shown (either persisted custom font or user just selected "Custom")
  const [showCustomInput, setShowCustomInput] = createSignal(false);

  // Derived: whether the current font is a custom (non-preset) value
  const isCustomFontMode = () => !PRESET_FONT_VALUES.has(preferencesState.fontFamily());

  // Keep showCustomInput in sync with whether the font is actually custom
  createEffect(() => {
    if (isCustomFontMode()) {
      setShowCustomInput(true);
    }
  });

  // [SETTINGS-001] Sync customFont signal from persisted preferences on mount
  createEffect(() => {
    const ff = preferencesState.fontFamily();
    if (!PRESET_FONT_VALUES.has(ff)) {
      setCustomFont(ff);
    }
  });

  // [SETTINGS-005] Global keydown for Escape — works even when focus is on nested inputs
  function handleGlobalKeydown(e: KeyboardEvent) {
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

  onMount(() => {
    document.addEventListener("keydown", handleGlobalKeydown);
    // [UX-009] Auto-focus the close button when the panel opens
    closeButtonRef?.focus();
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleGlobalKeydown);
  });

  // [UX-009] Focus trap: wrap Tab from last to first, Shift+Tab from first to last
  function handleFocusTrap(e: KeyboardEvent) {
    if (e.key !== "Tab") return;
    const focusable = panelRef?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains("lm-settings-overlay")) {
      uiState.setSettingsOpen(false);
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
    // [SETTINGS-006] Check for duplicate name and show explicit feedback
    const exists = preferencesState.userPresets().some((p) => p.name === name);
    preferencesState.saveCurrentAsPreset(name);
    setPresetName("");
    setPresetStatus(exists ? `Preset "${name}" updated` : `Preset "${name}" saved`);
    setTimeout(() => setPresetStatus(""), 2500);
  }

  return (
    <div class="lm-settings-overlay" onClick={handleBackdropClick}>
      <div class="lm-settings-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Settings" onKeyDown={handleFocusTrap}>
        <div class="lm-settings-header">
          <h2 class="lm-settings-title">Settings</h2>
          <button class="lm-settings-close" ref={closeButtonRef} onClick={() => uiState.setSettingsOpen(false)}>
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
                  value={isCustomFontMode() ? "custom" : preferencesState.fontFamily()}
                  onChange={(e) => {
                    const val = e.currentTarget.value;
                    if (val === "custom") {
                      // [SETTINGS-004] Don't persist "custom" — just switch to custom mode.
                      // Save the current font so we can revert if user leaves input empty.
                      setPreviousFontFamily(preferencesState.fontFamily());
                      setShowCustomInput(true);
                      setCustomFontError(false);
                      return;
                    }
                    preferencesState.setFontFamily(val);
                    setShowCustomInput(false);
                    setCustomFontError(false);
                  }}
                >
                  <For each={FONT_OPTIONS}>
                    {(opt) => <option value={opt.value}>{opt.label}</option>}
                  </For>
                  <option value="custom">Custom…</option>
                </select>
              </div>
            </div>

            <Show when={showCustomInput()}>
              <div class="lm-settings-row">
                <span class="lm-settings-label">Custom Font</span>
                <div class="lm-settings-control" style="flex-direction: column; align-items: stretch;">
                  <input
                    class="lm-settings-input"
                    classList={{ "lm-settings-input-error": customFontError() }}
                    type="text"
                    placeholder="e.g. 'Fira Sans', sans-serif"
                    value={customFont()}
                    onInput={(e) => {
                      setCustomFont(e.currentTarget.value);
                      if (e.currentTarget.value.trim()) {
                        setCustomFontError(false);
                      }
                    }}
                    onBlur={() => {
                      const val = customFont().trim();
                      if (val) {
                        // [SETTINGS-004] Only persist when there's a real value
                        preferencesState.setFontFamily(val);
                        setCustomFontError(false);
                      } else {
                        // [SETTINGS-004] Revert to previous font if empty
                        setCustomFontError(true);
                        const fallback = previousFontFamily();
                        preferencesState.setFontFamily(PRESET_FONT_VALUES.has(fallback) ? fallback : "system");
                        // If no custom value was ever set, hide the input
                        if (!isCustomFontMode()) {
                          setShowCustomInput(false);
                          setCustomFontError(false);
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = customFont().trim();
                        if (val) {
                          preferencesState.setFontFamily(val);
                          setCustomFontError(false);
                        }
                      }
                    }}
                    ref={(el) => el.focus()}
                  />
                  {/* [UX-004] Validation message for empty custom font */}
                  <Show when={customFontError()}>
                    <span class="lm-settings-validation-msg">Enter a font family name</span>
                  </Show>
                </div>
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
            {/* [SETTINGS-006 / UX-005] Preset save status feedback */}
            <Show when={presetStatus()}>
              <div class="lm-settings-preset-status">{presetStatus()}</div>
            </Show>
          </section>

          {/* ── Section: AI Revision ── */}
          <section class="lm-settings-section">
            <h3 class="lm-settings-section-title">AI Revision</h3>

            {/* API Key */}
            <div class="lm-settings-row">
              <span class="lm-settings-label">API Key</span>
              <div class="lm-settings-control" style="position: relative;">
                <input
                  class="lm-settings-input"
                  type={showApiKey() ? "text" : "password"}
                  placeholder="Enter your API key"
                  value={preferencesState.aiApiKey()}
                  onInput={(e) => preferencesState.setAIApiKey(e.currentTarget.value)}
                  style="padding-right: 32px;"
                />
                <button
                  class="lm-settings-eye-toggle"
                  onClick={() => setShowApiKey(!showApiKey())}
                  title={showApiKey() ? "Hide API key" : "Show API key"}
                  type="button"
                >
                  {showApiKey() ? "\u{1F441}" : "\u{1F441}\u{200D}\u{1F5E8}"}
                </button>
              </div>
            </div>

            {/* Base URL */}
            <div class="lm-settings-row">
              <span class="lm-settings-label">Base URL</span>
              <div class="lm-settings-control">
                <Show when={!showCustomBaseURL()} fallback={
                  <div style="display: flex; flex-direction: column; align-items: stretch; gap: 4px; width: 100%;">
                    <input
                      class="lm-settings-input"
                      type="text"
                      placeholder="http(s)://api.example.com/v1/messages"
                      value={preferencesState.aiCustomBaseURL()}
                      onInput={(e) => preferencesState.setAICustomBaseURL(e.currentTarget.value)}
                    />
                    <button
                      class="lm-settings-link-btn"
                      onClick={() => {
                        setShowCustomBaseURL(false);
                        preferencesState.setAIBaseURLPreset("anthropic");
                      }}
                    >
                      ← Back to presets
                    </button>
                  </div>
                }>
                  <select
                    class="lm-settings-select"
                    value={preferencesState.aiBaseURLPreset()}
                    onChange={(e) => {
                      const val = e.currentTarget.value as AIBaseURL;
                      if (val === "custom") {
                        setShowCustomBaseURL(true);
                        preferencesState.setAIBaseURLPreset("custom");
                      } else {
                        preferencesState.setAIBaseURLPreset(val);
                      }
                    }}
                  >
                    <option value="anthropic">Anthropic</option>
                    <option value="minimax">MiniMax</option>
                    <option value="custom">Custom…</option>
                  </select>
                </Show>
              </div>
            </div>

            {/* Prompt */}
            <div class="lm-settings-row" style="align-items: flex-start;">
              <span class="lm-settings-label" style="padding-top: 6px;">Prompt</span>
              <div class="lm-settings-control" style="flex-direction: column; align-items: stretch; gap: 4px;">
                <textarea
                  class="lm-settings-input lm-settings-textarea"
                  rows={4}
                  value={preferencesState.aiPrompt()}
                  onInput={(e) => preferencesState.setAIPrompt(e.currentTarget.value)}
                />
                <Show when={preferencesState.aiPrompt() !== AI_DEFAULT_PROMPT}>
                  <button
                    class="lm-settings-link-btn"
                    onClick={() => preferencesState.setAIPrompt(AI_DEFAULT_PROMPT)}
                  >
                    Reset to Default
                  </button>
                </Show>
              </div>
            </div>

            {/* Model label */}
            <div class="lm-settings-row">
              <span class="lm-settings-label">Model</span>
              <div class="lm-settings-control">
                <span class="lm-settings-static-value">{preferencesState.AI_MODEL}</span>
              </div>
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

# LiveMark v3 — AI Revise: Implementation Plan

## Overview

This document provides a step-by-step implementation plan for the AI Revise feature. Each step references exact file paths, function names, and patterns from the existing codebase.

---

## Step 1: Rust Backend — AI HTTP Commands

### 1a. Add `reqwest` dependency

**File:** `src-tauri/Cargo.toml`

Add to `[dependencies]`:
```toml
reqwest = { version = "0.12", features = ["json", "rustls-tls"], default-features = false }
```

Use `rustls-tls` instead of native-tls to avoid OpenSSL dependency on Linux. `default-features = false` keeps the binary small.

### 1b. Create AI command module

**New file:** `src-tauri/src/commands/ai.rs`

Follow the pattern from `src-tauri/src/commands/file.rs` and `src-tauri/src/commands/preferences.rs`:
- All commands return `Result<T, String>`
- Use `#[tauri::command]` decorator
- Error messages are user-friendly strings

```rust
#[tauri::command]
pub async fn ai_revise(
    base_url: String,      // e.g. "https://api.anthropic.com/v1/messages"
    api_key: String,
    prompt: String,
    text: String,
) -> Result<String, String> { ... }
```

**Implementation details:**
- **Single API format:** All endpoints use the Anthropic Messages API format (Anthropic, MiniMax, and compatible vendors all speak this protocol):
  - POST to `{base_url}`
  - Headers: `x-api-key: {api_key}`, `anthropic-version: 2023-06-01`, `content-type: application/json`
  - Body: `{ "model": "claude-sonnet-4-20250514", "max_tokens": 4096, "system": prompt, "messages": [{ "role": "user", "content": text }] }`
  - Model is hardcoded — not user-configurable
- Parse response: extract `content[0].text` from the Anthropic response format
- Timeout: 30 seconds via `reqwest::Client::builder().timeout(Duration::from_secs(30))`
- Map HTTP errors to user-friendly messages:
  - 401/403 → `"Invalid API key — check Settings → AI"`
  - 429 → `"Rate limited — try again in a moment"`
  - Timeout → `"AI revision timed out — try a shorter selection"`
  - Network/connection error → `"AI revision failed — check your connection"`
  - Other HTTP error → `"AI revision failed ({status_code})"`

### 1c. Register the command

**File:** `src-tauri/src/main.rs`

Add `mod commands::ai;` (or `pub mod ai;` in `commands/mod.rs` if using a module file) and add `ai_revise` to the `invoke_handler![]` macro call alongside existing commands like `read_file`, `write_file`, `read_preferences`, etc.

---

## Step 2: Preferences — AI Settings State

**File:** `src/state/preferences.ts`

Add new signals following the existing pattern (signals at module top, exported via `preferencesState` object):

```typescript
// New signals — after existing ones (line ~20)
type AIBaseURL = "anthropic" | "minimax" | "custom";
const AI_BASE_URLS: Record<Exclude<AIBaseURL, "custom">, string> = {
  anthropic: "https://api.anthropic.com/v1/messages",
  minimax: "https://api.minimax.chat/v1/messages",
};
const AI_MODEL = "claude-sonnet-4-20250514";  // Hardcoded, not user-configurable

const [aiBaseURLPreset, setAIBaseURLPreset] = createSignal<AIBaseURL>("anthropic");
const [aiCustomBaseURL, setAICustomBaseURL] = createSignal("");
const [aiApiKey, setAIApiKey] = createSignal("");
const [aiPrompt, setAIPrompt] = createSignal(
  "Revise the following text to improve clarity, grammar, and flow while preserving the original meaning and tone. Return only the revised text with no explanation."
);
```

**Computed helper** (not a signal, just a function on the export object):
```typescript
getBaseURL(): string {
  const preset = aiBaseURLPreset();
  return preset === "custom" ? aiCustomBaseURL() : AI_BASE_URLS[preset];
}
```

**Update `Preferences` interface** to include the new fields:
```typescript
aiBaseURLPreset?: AIBaseURL;
aiCustomBaseURL?: string;
aiApiKey?: string;
aiPrompt?: string;
```

**Update `loadPreferences()`** to hydrate the new signals from saved JSON.

**Update `savePreferences()`** to include the new fields in the serialized object.

**Add setters to `preferencesState`** object export:
```typescript
aiBaseURLPreset, setAIBaseURLPreset: (v: AIBaseURL) => { setAIBaseURLPreset(v); savePreferences(); },
aiCustomBaseURL, setAICustomBaseURL: (v: string) => { setAICustomBaseURL(v); savePreferences(); },
aiApiKey, setAIApiKey: (v: string) => { setAIApiKey(v); savePreferences(); },
aiPrompt, setAIPrompt: (v: string) => { setAIPrompt(v); savePreferences(); },
getBaseURL,  // Computed, no setter
AI_MODEL,    // Exported constant for display in UI
```

---

## Step 3: Settings Panel — AI Section UI

**File:** `src/ui/SettingsPanel.tsx`

Add a new section after existing preference sections. Follow the component patterns already in the file (SolidJS JSX, signals via `preferencesState.*`).

**Elements:**
- Section header: "AI Revision"
- API Key input: `<input type="password">` with toggle visibility button (eye icon)
- Base URL: `<select>` with options "Anthropic", "MiniMax", "Custom…"
  - When "Custom…" is selected: replace dropdown with `<input type="url">` + a small "← Back to presets" link
  - Bound to `preferencesState.aiBaseURLPreset()` and `preferencesState.aiCustomBaseURL()`
- Prompt textarea: `<textarea>` with 4-5 rows, bound to `preferencesState.aiPrompt()`
- "Reset to Default" button: resets prompt to the default string
- Model label: non-editable text showing `claude-sonnet-4-20250514` (informational, uses `preferencesState.AI_MODEL`)

---

## Step 4: ProseMirror Plugin — AI Revise

**New file:** `src/editor/plugins/ai-revise.ts`

This is the core of the feature. Model after `src/editor/plugins/find-replace.ts`.

### 4a. Plugin Key & State

```typescript
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export const aiReviseKey = new PluginKey<AIReviseState>("ai-revise");

interface AIReviseState {
  status: "idle" | "loading" | "diff" | "error";
  originalFrom: number;    // Start position — remapped in apply() on every transaction
  originalTo: number;      // End position — remapped in apply() on every transaction
  originalText: string;    // Saved original text
  revisedText: string;     // AI response
  revisionId: number;      // Monotonic counter — guards against stale async responses
  decorations: DecorationSet;
}
```

### 4b. Meta Actions

```typescript
type AIReviseMeta =
  | { type: "start"; from: number; to: number; text: string; revisionId: number }
  | { type: "complete"; revisedText: string; revisionId: number }
  | { type: "accept" }
  | { type: "reject" }
  | { type: "cancel" }
  | { type: "error"; message: string };
```

### 4c. Plugin Implementation

```typescript
export function aiRevisePlugin(): Plugin<AIReviseState> {
  return new Plugin<AIReviseState>({
    key: aiReviseKey,
    state: {
      init(): AIReviseState {
        return { status: "idle", originalFrom: 0, originalTo: 0,
                 originalText: "", revisedText: "", revisionId: 0,
                 decorations: DecorationSet.empty };
      },
      apply(tr, prev, oldState, newState): AIReviseState {
        const meta = tr.getMeta(aiReviseKey) as AIReviseMeta | undefined;
        if (!meta) {
          // Remap BOTH decorations AND positions on external transactions
          if (prev.status !== "idle") {
            const newFrom = tr.mapping.map(prev.originalFrom);
            const newTo = tr.mapping.map(prev.originalTo);

            // If the mapped range collapses (text inside was deleted), cancel
            if (newFrom >= newTo && prev.status === "loading") {
              return { ...prev, status: "idle", decorations: DecorationSet.empty };
            }

            return {
              ...prev,
              originalFrom: newFrom,
              originalTo: newTo,
              decorations: prev.decorations.map(tr.mapping, tr.doc),
            };
          }
          return prev;
        }
        // Handle each meta action type...
      }
    },
    props: {
      decorations(state) {
        return aiReviseKey.getState(state)?.decorations ?? DecorationSet.empty;
      },
      handleKeyDown(view, event) {
        const pluginState = aiReviseKey.getState(view.state);
        if (!pluginState || pluginState.status === "idle") return false;

        if (pluginState.status === "diff") {
          if (event.key === "Enter") {
            acceptRevision(view);
            return true;
          }
          if (event.key === "Escape") {
            rejectRevision(view);
            return true;
          }
          // Block ALL other input while diff is pending — editor is read-only
          // Allow only Cmd+Z (undo the accept later) and navigation keys
          if (!event.metaKey && !event.ctrlKey && event.key.length === 1) {
            return true;  // Swallow printable characters
          }
        }
        if (pluginState.status === "loading" && event.key === "Escape") {
          cancelRevision(view);
          return true;
        }
        return false;
      }
    }
  });
}
```

### 4d. Decoration Strategy

**Loading state:** `Decoration.inline(from, to, { class: "lm-ai-shimmer" })` — applies the pulsing animation CSS class to the selected range.

**Diff state:** Two decorations:
1. `Decoration.inline(from, to, { class: "lm-ai-diff-delete" })` — strikethrough + faded styling on original text
2. `Decoration.widget(to, createDiffWidget(revisedText), { side: 1 })` — widget decoration after the original text showing the revised version (`side: 1` ensures cursor stays before widget)

The widget decoration creates a DOM element:
```typescript
function createDiffWidget(revisedText: string, onAccept: () => void, onReject: () => void): HTMLElement {
  const wrapper = document.createElement("span");
  wrapper.className = "lm-ai-diff-insert-wrapper";

  const textEl = document.createElement("span");
  textEl.className = "lm-ai-diff-insert";
  textEl.textContent = revisedText;
  wrapper.appendChild(textEl);

  const bar = document.createElement("span");
  bar.className = "lm-ai-action-bar";
  bar.innerHTML = `
    <button class="lm-ai-accept" title="Accept (Enter)">✓ Accept</button>
    <button class="lm-ai-reject" title="Reject (Esc)">✗ Reject</button>
  `;
  bar.querySelector(".lm-ai-accept")!.addEventListener("click", onAccept);
  bar.querySelector(".lm-ai-reject")!.addEventListener("click", onReject);
  wrapper.appendChild(bar);

  return wrapper;
}
```

### 4e. Exported Helper Functions

```typescript
export function startRevision(view: EditorView, from: number, to: number, text: string, revisionId: number): void {
  const tr = view.state.tr.setMeta(aiReviseKey, { type: "start", from, to, text, revisionId });
  view.dispatch(tr);
}

export function completeRevision(view: EditorView, revisedText: string, revisionId: number): void {
  const tr = view.state.tr.setMeta(aiReviseKey, { type: "complete", revisedText, revisionId });
  view.dispatch(tr);
}

export function acceptRevision(view: EditorView): void {
  const state = aiReviseKey.getState(view.state);
  if (!state || state.status !== "diff") return;

  // Parse revised text through the markdown pipeline to preserve structure.
  // The AI may return multi-paragraph text, bold/italic, lists, etc.
  // Using schema.text() would collapse everything into a flat string — breaking
  // multi-block selections and losing formatting.
  const revisedDoc = parseMarkdown(state.revisedText);
  const content = revisedDoc ? revisedDoc.content : Fragment.from(view.state.schema.text(state.revisedText));

  const tr = view.state.tr
    .replaceWith(state.originalFrom, state.originalTo, content)
    .setMeta(aiReviseKey, { type: "accept" });
  view.dispatch(tr);
}

export function rejectRevision(view: EditorView): void {
  const tr = view.state.tr.setMeta(aiReviseKey, { type: "reject" });
  view.dispatch(tr);
}

export function cancelRevision(view: EditorView): void {
  const tr = view.state.tr.setMeta(aiReviseKey, { type: "cancel" });
  view.dispatch(tr);
}
```

---

## Step 5: Command Registration

### 5a. AI Command Function

**New file:** `src/commands/ai-commands.ts`

```typescript
import { invoke } from "@tauri-apps/api/core";
import { preferencesState } from "@/state/preferences";
import { uiState } from "@/state/ui";
import { aiReviseKey, startRevision, completeRevision, cancelRevision } from "@/editor/plugins/ai-revise";

const MAX_SELECTION_LENGTH = 4000;
let nextRevisionId = 1;  // Monotonic counter to detect stale responses

export async function reviseSelection(getView: () => EditorView | undefined): Promise<void> {
  const view = getView();
  if (!view) return;

  // Guard: already revising
  const pluginState = aiReviseKey.getState(view.state);
  if (pluginState && pluginState.status !== "idle") {
    uiState.showStatus("Revision in progress…");
    return;
  }

  const { from, to } = view.state.selection;
  if (from === to) {
    uiState.showStatus("Select text first, then revise");
    return;
  }

  const text = view.state.doc.textBetween(from, to, "\n");
  if (text.length > MAX_SELECTION_LENGTH) {
    uiState.showStatus("Selection too long (max 4000 characters)");
    return;
  }

  const apiKey = preferencesState.aiApiKey();
  if (!apiKey) {
    uiState.showStatus("Set your API key in Settings → AI");
    return;
  }

  // Assign a revision ID so we can detect stale responses after await
  const revisionId = nextRevisionId++;

  // Start loading decoration
  startRevision(view, from, to, text, revisionId);
  uiState.showStatus("Revising…");

  try {
    const revisedText = await invoke<string>("ai_revise", {
      baseUrl: preferencesState.getBaseURL(),
      apiKey,
      prompt: preferencesState.aiPrompt(),
      text,
    });

    // Re-resolve view after await — user may have switched tabs
    const currentView = getView();
    if (!currentView) return;  // View destroyed, silently discard

    // Check revision ID — if user cancelled and re-triggered, discard stale response
    const currentState = aiReviseKey.getState(currentView.state);
    if (!currentState || currentState.revisionId !== revisionId) return;

    if (!revisedText || revisedText.trim() === "") {
      cancelRevision(currentView);
      uiState.showStatus("AI returned empty response — try again");
      return;
    }

    if (revisedText.trim() === text.trim()) {
      cancelRevision(currentView);
      uiState.showStatus("No changes suggested");
      return;
    }

    completeRevision(currentView, revisedText, revisionId);
    uiState.showStatus("Accept (↩) or Reject (esc)");
  } catch (err) {
    const currentView = getView();
    if (!currentView) return;
    const currentState = aiReviseKey.getState(currentView.state);
    if (!currentState || currentState.revisionId !== revisionId) return;

    cancelRevision(currentView);
    uiState.showStatus(String(err));  // Rust already returns user-friendly messages
  }
}
```

### 5b. Register Command

**File:** `src/commands/all-commands.ts`

Add to `registerAllCommands()`:
```typescript
registerCommand({
  id: "ai.revise",
  label: "AI: Revise Selection",
  shortcut: "Cmd+J R",
  category: "AI",
  execute: () => reviseSelection(getEditorView),  // Pass getter, not snapshot
});
```

### 5c. Wire Chord Binding

**File:** `src/ui/App.tsx`

Add `r` to the existing `chordBindings["Cmd+J"]` object:
```typescript
"Cmd+J": {
  p: async () => { ... },  // existing: Copy path
  w: () => { ... },        // existing: Close all
  t: () => { ... },        // existing: Cycle theme
  f: () => { ... },        // existing: Toggle focus
  r: () => reviseSelection(getEditorView),  // NEW: AI Revise — pass getter, not snapshot
}
```

---

## Step 6: CSS Styles

### 6a. CSS Variables

**File:** `src/styles/variables.css`

Add to the `:root` / light theme section:
```css
/* AI Revise */
--lm-ai-shimmer-from: rgba(99, 102, 241, 0.08);
--lm-ai-shimmer-to: rgba(99, 102, 241, 0.20);
--lm-ai-diff-delete: rgba(239, 68, 68, 0.15);
--lm-ai-diff-delete-text: #b91c1c;
--lm-ai-diff-insert: rgba(34, 197, 94, 0.12);
--lm-ai-diff-insert-border: #22c55e;
--lm-ai-diff-insert-text: var(--lm-text-primary);
--lm-ai-action-bar-bg: var(--lm-bg-elevated);
--lm-ai-accept-text: #16a34a;
--lm-ai-accept-border: #22c55e;
--lm-ai-accept-hover: rgba(34, 197, 94, 0.1);
```

Add dark mode overrides in `[data-theme="dark"]`:
```css
--lm-ai-shimmer-from: rgba(129, 140, 248, 0.06);
--lm-ai-shimmer-to: rgba(129, 140, 248, 0.18);
--lm-ai-diff-delete: rgba(239, 68, 68, 0.12);
--lm-ai-diff-delete-text: #f87171;
--lm-ai-diff-insert: rgba(34, 197, 94, 0.10);
--lm-ai-diff-insert-border: #4ade80;
--lm-ai-action-bar-bg: var(--lm-bg-elevated);
--lm-ai-accept-text: #4ade80;
--lm-ai-accept-border: #22c55e;
--lm-ai-accept-hover: rgba(74, 222, 128, 0.15);
```

### 6b. AI Revise Stylesheet

**New file:** `src/styles/ai-revise.css`

```css
/* Shimmer animation for loading state */
@keyframes lm-ai-shimmer {
  0%, 100% { background-color: var(--lm-ai-shimmer-from); }
  50% { background-color: var(--lm-ai-shimmer-to); }
}

.lm-ai-shimmer {
  animation: lm-ai-shimmer 1.5s ease-in-out infinite;
  border-radius: 2px;
}

/* Diff: original text (delete) */
.lm-ai-diff-delete {
  background: var(--lm-ai-diff-delete);
  color: var(--lm-ai-diff-delete-text);
  text-decoration: line-through;
  opacity: 0.7;
}

/* Diff: revised text (insert widget) */
.lm-ai-diff-insert-wrapper {
  display: inline;
}

.lm-ai-diff-insert {
  background: var(--lm-ai-diff-insert);
  border-left: 2px solid var(--lm-ai-diff-insert-border);
  color: var(--lm-ai-diff-insert-text);
  padding: 0 4px;
  border-radius: 2px;
  margin-left: 4px;
}

/* Floating action bar */
.lm-ai-action-bar {
  display: inline-flex;
  gap: 4px;
  margin-left: 8px;
  vertical-align: middle;
}

.lm-ai-action-bar button {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--lm-border-default);
  background: var(--lm-ai-action-bar-bg);
  cursor: pointer;
  transition: background var(--lm-transition-fast);
}

.lm-ai-action-bar .lm-ai-accept {
  color: var(--lm-ai-accept-text);
  border-color: var(--lm-ai-accept-border);
}

.lm-ai-action-bar .lm-ai-accept:hover {
  background: var(--lm-ai-accept-hover);
}

.lm-ai-action-bar .lm-ai-reject {
  color: var(--lm-text-muted);
}

.lm-ai-action-bar .lm-ai-reject:hover {
  background: var(--lm-hover-bg);
}
```

Import in the main stylesheet or entry point (wherever `find-replace.css` etc. are imported).

---

## Step 7: Wire Plugin into Editor

**File:** `src/editor/editor.ts`

Add the AI revise plugin to the plugins array in `EditorState.create()`:

```typescript
import { aiRevisePlugin } from "./plugins/ai-revise";

// In the plugins array, add after find-replace:
plugins: [
  // ... existing plugins ...
  findReplacePlugin(),
  aiRevisePlugin(),    // NEW
  // ... remaining plugins ...
]
```

---

## Architectural Safeguards

These decisions address specific failure modes discovered during architecture review:

### Position Remapping
`originalFrom` and `originalTo` are **remapped on every transaction** in the plugin's `apply()` function — not just the decorations. Without this, positions drift as other transactions fire (typing, auto-save checks, decoration rebuilds) during the 1–30s async wait.

### Revision ID (Stale Response Guard)
A monotonic `revisionId` counter tags each revision. When the async response arrives, we check `currentState.revisionId !== revisionId` before acting. This handles: Esc → re-trigger (first response arrives late), tab switch during loading, and rapid spam.

### View Getter Pattern
`reviseSelection()` takes `getView: () => EditorView | undefined` — a **getter function**, not a snapshot. After `await invoke(...)`, we call `getView()` again to get the current view. If the user switched tabs, the view may be destroyed or replaced; passing a stale snapshot would throw.

### Accept via Markdown Parse
`acceptRevision()` parses the revised text through `parseMarkdown()` instead of `schema.text()`. This preserves multi-paragraph structure and inline formatting the AI may have added. Fallback to `schema.text()` if parse fails.

### Input Blocking During Diff
`handleKeyDown` returns `true` for all printable characters when `status === "diff"`, making the editor effectively read-only. Without this, a user pressing Enter to start a new line would accidentally accept the revision.

### No AbortController
The codebase has no async cancellation pattern. The Rust HTTP request runs to completion even after Esc. This wastes bandwidth but is simpler and safer — the revision ID guard ensures stale responses are discarded without needing to abort the request.

### Binary Size Impact
Adding `reqwest` with `rustls-tls` increases the binary by ~1–2MB. Using `default-features = false` and only `json` + `rustls-tls` features minimizes this.

---

## Implementation Order

| Phase | Steps | Estimated Files Changed | Can Be Tested |
|-------|-------|------------------------|---------------|
| 1 | Steps 1a–1c: Rust backend | 3 files (`Cargo.toml`, `ai.rs`, `main.rs`) | Yes — via `invoke` in dev console |
| 2 | Step 2: Preferences state | 1 file (`preferences.ts`) | Yes — signals accessible in dev console |
| 3 | Step 3: Settings UI | 1 file (`SettingsPanel.tsx`) | Yes — visible in Settings panel |
| 4 | Steps 4–5: Plugin + commands | 3 files (`ai-revise.ts`, `ai-commands.ts`, `all-commands.ts`) + 1 edit (`App.tsx`) | Yes — full E2E flow |
| 5 | Steps 6–7: CSS + wiring | 3 files (`variables.css`, `ai-revise.css`, `editor.ts`) | Yes — visual polish |

**Total: 4 new files, 8 modified files**

---

## Testing Checklist

### Unit / Integration
- [ ] Rust `ai_revise` command handles Anthropic Messages API response format (`content[0].text`)
- [ ] Rust `ai_revise` command returns user-friendly errors for 401, 429, timeout
- [ ] Preferences load/save round-trips all AI fields (baseURLPreset, customBaseURL, apiKey, prompt)
- [ ] Plugin state transitions: idle → loading → diff → accepted
- [ ] Plugin state transitions: idle → loading → diff → rejected
- [ ] Plugin state transitions: idle → loading → cancelled
- [ ] Plugin state transitions: idle → loading → error
- [ ] Decorations remap correctly when text is edited outside the range during loading

### Chaos / Stress (try to break it)
- [ ] Rapid Cmd+J R spam while loading — should show "Revision in progress…" each time
- [ ] Esc during loading, then immediately Cmd+J R again — stale first response must be discarded
- [ ] Accept revision, then Cmd+Z, then Cmd+J R on the restored text — full cycle works
- [ ] Select text across 5+ paragraphs with mixed formatting → accept → structure preserved
- [ ] Trigger revision, switch tab during loading, switch back — revision cancelled, no ghost diff
- [ ] Trigger revision, close file during loading — no crash, no error dialog
- [ ] Enter key while diff is pending but cursor is elsewhere — should accept (not insert newline)
- [ ] Open find-replace (Cmd+F) while diff is pending — Enter resolves diff, not find-next
- [ ] Type random characters while diff is pending — all swallowed (read-only)
- [ ] Set API key to "garbage", trigger revision — clean error message, no hang
- [ ] Set custom endpoint to `http://localhost:9999` (nothing there) — connection error, clean message
- [ ] Paste a 10,000 character selection — "too long" message before any API call
- [ ] Set prompt to empty string, trigger revision — falls back to default or blocks
- [ ] AI returns markdown with code fences and headers — widget shows raw text, accept parses correctly
- [ ] AI returns response with leading/trailing whitespace — trimmed properly, no blank diff
- [ ] Delete the `preferences.json` file while app is running, then trigger revision — graceful fallback

### Manual E2E
- [ ] Set up API key in Settings, verify it persists across restarts
- [ ] Select text, `Cmd+J R`, see shimmer, see diff, accept with Enter
- [ ] Select text, `Cmd+J R`, see diff, reject with Esc
- [ ] Verify `Cmd+Z` after accept restores original text
- [ ] Trigger with no selection → status message
- [ ] Trigger with no API key → status message
- [ ] Trigger with invalid API key → error message
- [ ] Trigger with very long selection → "too long" message
- [ ] Cancel during loading with Esc
- [ ] Switch base URL to MiniMax, verify API call works
- [ ] Custom base URL with compatible vendor
- [ ] Dark mode: verify all diff colors are readable
- [ ] Reset prompt to default button works

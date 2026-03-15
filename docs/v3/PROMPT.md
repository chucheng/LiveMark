# AI Revise — Implementation Prompt

Use this prompt to implement the AI Revise feature for LiveMark. Copy everything below the line into a new Claude Code conversation.

---

## Prompt

Implement the AI Revise feature for LiveMark v3. All specs are in `docs/v3/`:

- `docs/v3/prd.md` — requirements, user stories, error handling, constraints
- `docs/v3/ux-design.md` — interaction flows, visual states, 10 edge cases
- `docs/v3/implementation.md` — step-by-step plan with code snippets, architectural safeguards

Read all three docs first, then implement in this exact order:

### Phase 1: Rust backend
1. Add `reqwest` to `src-tauri/Cargo.toml` (json + rustls-tls, default-features = false)
2. Create `src-tauri/src/commands/ai.rs` — `ai_revise` async command. **Single API format**: all endpoints (Anthropic, MiniMax, compatible vendors) use the Anthropic Messages API format. Takes `base_url`, `api_key`, `prompt`, `text`. Model is hardcoded to `claude-sonnet-4-20250514`. Headers: `x-api-key`, `anthropic-version: 2023-06-01`. Parse `content[0].text` from response. Follow patterns in `src-tauri/src/commands/file.rs`. Map HTTP errors to user-friendly strings per PRD §5.4.
3. Register `ai_revise` in `src-tauri/src/main.rs` invoke_handler

### Phase 2: Preferences
4. Add AI signals to `src/state/preferences.ts`: `aiBaseURLPreset` ("anthropic" | "minimax" | "custom"), `aiCustomBaseURL`, `aiApiKey`, `aiPrompt`. NO model signal — model is hardcoded constant `AI_MODEL`. Add `getBaseURL()` computed helper that resolves preset to URL. Export `AI_MODEL` constant for UI display. Follow exact pattern of existing signals (module-top signals, exported via `preferencesState` object, setters call `savePreferences()`).

### Phase 3: Settings UI
5. Add "AI Revision" section to `src/ui/SettingsPanel.tsx`:
   - API Key: password input with eye toggle (the only required input)
   - Base URL: `<select>` with "Anthropic", "MiniMax", "Custom…". When "Custom…" selected, replace dropdown with URL text input + "← Back to presets" link
   - Prompt: textarea with "Reset to Default" button
   - Model label: non-editable text showing `claude-sonnet-4-20250514` (informational)
   - Follow existing component patterns in the file

### Phase 4: ProseMirror plugin + commands (the hard part)
6. Create `src/editor/plugins/ai-revise.ts` — model after `src/editor/plugins/find-replace.ts`. This is the core. Critical architectural safeguards from `implementation.md`:
   - **Position remapping**: `originalFrom`/`originalTo` must be remapped via `tr.mapping.map()` on EVERY transaction in `apply()`, not just decorations. Without this, positions drift during the 1-30s async wait.
   - **Revision ID**: Monotonic counter on state. `start` and `complete` metas carry the ID. After `await`, check `currentState.revisionId !== revisionId` before acting. This prevents ghost diffs from stale responses after Esc → re-trigger.
   - **Input blocking**: `handleKeyDown` must return `true` for all printable chars when `status === "diff"` (editor read-only). Without this, Enter inserts a newline instead of accepting.
   - **Range collapse detection**: If `newFrom >= newTo` after mapping during loading, auto-cancel (text was deleted).
   - **Widget side**: `Decoration.widget(to, el, { side: 1 })` — cursor stays before widget.
   - **Accept via markdown parse**: `acceptRevision()` must use `parseMarkdown()` to create the replacement fragment, NOT `schema.text()`. schema.text() destroys multi-paragraph structure.
7. Create `src/commands/ai-commands.ts` — `reviseSelection(getView)` function. Takes a **getter function** (not a view snapshot) so the view is re-resolved after `await invoke(...)`. Calls `invoke("ai_revise", { baseUrl: preferencesState.getBaseURL(), apiKey, prompt, text })`. Guards: already revising, no selection, too long (4000 chars), no API key. After await, check view still exists and revisionId matches.
8. Register `ai.revise` command in `src/commands/all-commands.ts`. Pass `getEditorView` (the getter), not `getEditorView()` (a snapshot).
9. Add `r` to `chordBindings["Cmd+J"]` in `src/ui/App.tsx`.

### Phase 5: CSS + wiring
10. Add CSS variables to `src/styles/variables.css` (both light and dark theme) — shimmer, diff-delete, diff-insert, action-bar colors. All button colors must use variables (not hardcoded hex) for dark mode.
11. Create `src/styles/ai-revise.css` — shimmer keyframes, diff-delete (strikethrough + fade), diff-insert (green tint + left border), action bar (inline-flex, themed buttons).
12. Wire `aiRevisePlugin()` into `src/editor/editor.ts` plugin array, after findReplacePlugin().
13. Import `ai-revise.css` wherever other plugin styles are imported.

### After implementation
14. Run `pnpm build` to verify TypeScript compiles.
15. Run `pnpm test` to verify existing tests still pass.
16. Test manually: set a real API key, select text, Cmd+J R, verify shimmer → diff → accept/reject cycle.
17. Run the chaos tests from `implementation.md` Testing Checklist — especially: Esc during loading then re-trigger, multi-paragraph accept, rapid spam, tab switch during loading.
18. Bump version in both `package.json` and `src-tauri/Cargo.toml`, update `docs/tutorial.md` with AI Revise section, update README, commit, push.

### Key patterns to match (read these files first)
- `src/editor/plugins/find-replace.ts` — PluginKey, state/apply/decorations pattern, handleKeyDown
- `src/state/preferences.ts` — signal pattern, load/save, preferencesState export object
- `src/commands/all-commands.ts` — registerCommand with id, label, shortcut, category, execute
- `src/ui/App.tsx` — chordBindings["Cmd+J"] object, handleKeydown function
- `src-tauri/src/commands/file.rs` — Rust command pattern, Result<T, String>, error mapping
- `src/styles/variables.css` — `--lm-*` naming convention, dark mode `[data-theme="dark"]` overrides

### What NOT to do
- Do NOT use `schema.text()` in acceptRevision — it destroys structure
- Do NOT store the EditorView as a snapshot before await — use a getter function
- Do NOT skip position remapping in apply() — positions WILL drift
- Do NOT hardcode colors in CSS — use `--lm-ai-*` variables for dark mode
- Do NOT use `innerHTML` for revised text display — use `textContent` (XSS prevention)
- Do NOT add AbortController — the revision ID guard is simpler and sufficient
- Do NOT add streaming — it's P2 future scope
- Do NOT add model selection — model is hardcoded to `claude-sonnet-4-20250514`
- Do NOT add OpenAI support — all endpoints use Anthropic Messages API format

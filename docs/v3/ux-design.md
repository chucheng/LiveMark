# LiveMark v3 — AI Revise: UX Design

## 1. Interaction Flow

### 1.1 First-Time Setup

```
Settings Panel → AI Section (new)
┌──────────────────────────────────────────┐
│ AI Revision                              │
│                                          │
│ API Key    [••••••••••••••]  👁          │
│ Base URL   [Anthropic ▾]                 │
│                                          │
│ Revision Prompt                          │
│ ┌──────────────────────────────────────┐ │
│ │ Revise the following text to improve │ │
│ │ clarity, grammar, and flow while     │ │
│ │ preserving the original meaning...   │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [Reset to Default]                       │
│                                          │
│ Model: claude-sonnet-4-20250514          │
└──────────────────────────────────────────┘
```

The model name is shown as a non-editable label at the bottom — informational only, not a setting. This reassures the user which model is being used without adding complexity.

**States:**
- **No key:** Base URL dropdown active (can be changed). Prompt textarea active. Only the API key is needed to start.
- **Key entered:** All fields active. Key is masked by default; eye icon toggles visibility.
- **Custom base URL:** When "Custom…" is selected, the dropdown is replaced by a text input with placeholder `https://api.example.com/v1/messages`. A small "back to presets" link restores the dropdown.

**Base URL presets:**
| Option | URL |
|--------|-----|
| Anthropic | `https://api.anthropic.com/v1/messages` |
| MiniMax | `https://api.minimax.chat/v1/messages` |
| Custom… | User enters URL manually |

All endpoints use the **Anthropic Messages API format** (`x-api-key` header, `system` + `messages` body). MiniMax and compatible vendors follow this same format.

### 1.2 Triggering Revision

**Keyboard (primary):**
1. Select text in the editor
2. Press `Cmd+J` → chord pending indicator appears in status bar: `⌘J …`
3. Press `R` within 1500ms → revision begins

**Command Palette:**
1. Select text
2. `Cmd+Shift+P` → type "revise" → select "AI: Revise Selection"

**No selection behavior:**
- Status bar shows "Select text first, then revise" for 3 seconds
- No other visual change

**Selection too long (>4000 chars):**
- Status bar shows "Selection too long (max 4000 characters)"

### 1.3 Loading State

```
The quick brown fox ░░░░░░░░░░░░░░░░░░░░░ over the lazy dog.
                    ↑ selected text pulses with shimmer
```

- The selected text range gets a pulsing shimmer decoration (CSS `@keyframes`)
- Background color: `--lm-ai-shimmer` — a subtle animated gradient
- Duration: Until API responds or timeout (30s)
- The editor is **not** locked during loading — but the selection range is visually marked
- Status bar shows: "Revising…"
- User can press `Esc` to cancel the in-flight request

### 1.4 Diff Display

When the API returns revised text, the shimmer is replaced by an inline diff:

```
The quick brown fox jumped over the lazy dog.
                    ─────── (strikethrough, faded red)
                    leapt gracefully across
                    ^^^^^^^^^^^^^^^^^^^^^^^ (green-tinted widget)

                    ┌─────────┬──────────┐
                    │ ✓ Accept│ ✗ Reject │  ← floating action bar
                    └─────────┴──────────┘
```

**Visual design:**

| Element | Styling |
|---------|---------|
| Original text | `text-decoration: line-through`, color: `--lm-ai-diff-delete` (faded red/coral), reduced opacity |
| Revised text | Widget decoration below original, background: `--lm-ai-diff-insert` (light green tint), left border accent |
| Action bar | Floating bar positioned below the diff, same z-index as popovers (`--z-popover: 1050`) |
| Accept button | Green accent, keyboard hint "↩" shown |
| Reject button | Muted/gray, keyboard hint "esc" shown |

**Action bar positioning:**
- Horizontally centered under the diff widget
- Vertically: 4px below the widget bottom edge
- If near viewport bottom: flip above the original text
- If near viewport right: align right edge instead of center

### 1.5 Resolution

**Accept (Enter or click Accept):**
1. Original text is replaced with revised text in a single ProseMirror transaction
2. Diff decorations and action bar removed
3. Cursor placed at end of newly inserted text
4. The replacement is a single undo step — `Cmd+Z` restores original

**Reject (Esc or click Reject):**
1. All diff decorations and action bar removed
2. Original text untouched
3. Cursor returns to start of the previously selected range

**Input blocking during diff:**
- All printable keyboard input is swallowed — the editor is effectively read-only
- Only Enter, Esc, and modifier combos (Cmd+Z, etc.) are processed
- This prevents accidental edits that would corrupt the diff positions

**Click outside diff area:**
- Diff remains visible — does NOT auto-reject
- User must explicitly accept or reject
- This prevents accidental rejection when clicking elsewhere

### 1.6 Error State

```
Status bar: ⚠ AI revision failed — check your connection
            ↑ shown for 5 seconds, then clears
```

- Shimmer decoration is removed
- Original selection is restored (text re-selected)
- No modal, no dialog — just a status bar message
- Error messages are user-friendly (see PRD §5.4 for full list)

## 2. Visual States Summary

```
IDLE → SELECT → TRIGGER → LOADING → DIFF → RESOLVED
                                      ↓
                                    ERROR → IDLE
```

| State | Editor | Status Bar | Decorations |
|-------|--------|------------|-------------|
| Idle | Normal editing | Normal | None |
| Loading | Editable (shimmer on range) | "Revising…" | Pulsing shimmer on selected range |
| Diff Pending | Read-only in diff area | "Accept (↩) or Reject (esc)" | Strikethrough original + green widget + action bar |
| Accepted | Normal editing | "Revision accepted" (2s) | None (text replaced) |
| Rejected | Normal editing | "Revision rejected" (2s) | None (original restored) |
| Error | Normal editing | Error message (5s) | None (selection restored) |
| Cancelled | Normal editing | "Revision cancelled" (2s) | None |

## 3. Edge Cases

### 3.1 Document Changes During Loading
- The shimmer decoration tracks the original position via ProseMirror's mapping
- If the user edits text *outside* the shimmer range, positions are remapped
- If the user edits text *inside* the shimmer range, the revision is cancelled with status message: "Revision cancelled — text was modified"

### 3.2 Tab/File Switch During Loading
- Revision is cancelled when switching away from the tab
- Status bar shows "Revision cancelled" briefly
- Original text is untouched

### 3.3 Undo After Accept
- The accept transaction is a single undo step
- `Cmd+Z` replaces the revised text back with the original
- This is automatic — ProseMirror's history plugin handles it

### 3.4 Empty or Identical Response
- If AI returns empty text: show error "AI returned empty response"
- If AI returns text identical to original: show status "No changes suggested" and remove decorations

### 3.5 Multi-Paragraph Selection
- Works across paragraph boundaries
- The diff widget shows the full revised text as a single block
- On accept, the entire selected range is replaced

### 3.6 Selection Inside NodeViews
- If selection includes a code block, math block, or other NodeView: the raw Markdown content of those nodes is sent to the API
- This ensures the AI sees the actual syntax, not rendered HTML

### 3.7 Concurrent Trigger
- Only one revision at a time
- If triggered while already loading or showing diff: status bar shows "Revision in progress…"
- Must resolve current revision before starting another

### 3.8 Cancel → Re-trigger Race Condition
- User presses Esc during loading (cancels), then immediately triggers Cmd+J R again
- First API call is still in-flight and will eventually return
- Each revision is assigned a monotonic ID; when the first response arrives, its ID doesn't match the current revision → response is silently discarded
- No ghost diff, no flicker, no stale data

### 3.9 Find-Replace Interaction
- If find-replace bar (Cmd+F) is open when AI diff is shown, both are active
- Enter resolves the AI diff (higher priority) — it does NOT trigger find-next
- Recommendation: close find-replace when entering diff state to avoid confusion

### 3.10 Auto-Save During Diff
- Auto-save may fire while diff is pending (decorations are UI-only, document unchanged)
- This is safe — auto-save serializes the original document, not the decorations
- After accept, document is modified → auto-save fires 30s later as normal

## 4. Keyboard Shortcuts Summary

| Shortcut | Context | Action |
|----------|---------|--------|
| `Cmd+J R` | Text selected | Start revision |
| `Cmd+J R` | No selection | "Select text first" message |
| `Enter` | Diff visible | Accept revision |
| `Esc` | Diff visible | Reject revision |
| `Esc` | Loading | Cancel revision |
| `Cmd+Z` | After accept | Undo revision (restore original) |

## 5. Settings Panel Integration

The AI section is added to the existing Settings panel (accessed via `Cmd+,` or command palette "Open Settings").

**Section placement:** After the existing sections (Typography, Layout, Theme, etc.), add a new "AI Revision" section with a subtle separator.

**Persistence:** All AI settings are saved to `preferences.json` alongside existing preferences, using the same debounced save mechanism.

**Validation:**
- API key: no validation on save (validated on first use)
- Custom base URL: basic URL format check on blur (must start with `https://`)
- Prompt: cannot be empty — if cleared, show "Reset to Default" as the only action

## 6. Accessibility

- Action bar buttons have proper focus order (Accept → Reject)
- Keyboard shortcuts are the primary interaction — mouse is secondary
- Screen readers: diff widget has `role="alert"` to announce revision availability
- Color is not the only indicator — strikethrough + opacity for deletions, border + background for insertions
- Status bar messages use `role="status"` for screen reader announcements

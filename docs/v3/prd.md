# LiveMark v3 — AI Revise: Product Requirements Document

## 1. Overview

AI Revise is LiveMark's key paid differentiator: users bring their own API key, define a custom revision prompt, select text, and get an inline diff to accept or reject. Zero backend cost for us, zero subscription for users — just a one-time $15 purchase.

## 2. Goals

- Let users revise selected text with AI without leaving the editor
- Keep the user's original text safe until they explicitly accept
- Never touch, store, or proxy API keys through our servers
- Ship the simplest possible UX that still feels magical
- Model the architecture after proven patterns already in the codebase (find-replace plugin, preferences system)

## 3. Non-Goals

- Autocomplete / copilot-style suggestions
- Multi-turn chat or conversation UI
- Streaming responses (P2 future)
- Multiple prompt presets (P2 future)
- Server-side AI proxy or telemetry

## 4. User Stories

| # | As a… | I want to… | So that… | Priority |
|---|-------|------------|----------|----------|
| 1 | Writer | Select text and press `Cmd+J R` to get a revision | I can improve my prose without copy-pasting to ChatGPT | P0 |
| 2 | Writer | See the original and revised text side-by-side inline | I can compare before accepting | P0 |
| 3 | Writer | Press Enter to accept or Esc to reject | I stay in flow without reaching for the mouse | P0 |
| 4 | Writer | Click Accept/Reject buttons on a floating bar | I can use the mouse when I prefer | P0 |
| 5 | Writer | Configure my API key and provider in Settings | I use my own account and pay my own costs | P0 |
| 6 | Writer | Write a custom revision prompt | I tailor the AI to my writing style and goals | P0 |
| 7 | Writer | See a pulsing shimmer on the selection while AI is working | I know something is happening | P0 |
| 8 | Writer | See a clear error message if the API call fails | I can troubleshoot without losing my text | P0 |
| 9 | Writer | Choose between Anthropic, MiniMax, or a custom endpoint | I use whichever API provider I have access to | P0 |

## 5. Feature Specification

### 5.1 Settings — AI Configuration

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| API Key | Password input | Empty | Stored in `preferences.json`, never leaves the machine |
| Base URL | Dropdown + custom | Anthropic | Anthropic, MiniMax, or manual entry for compatible vendors |
| Revision Prompt | Textarea | See §5.2 | Single prompt; applied to every revision |

**Fixed model:** `claude-sonnet-4-20250514` — hardcoded, not user-configurable. This keeps the UX simple (one input: your API key) and ensures consistent quality. The model ID is sent to whichever base URL the user selects.

**Base URL presets:**
| Option | URL |
|--------|-----|
| Anthropic | `https://api.anthropic.com/v1/messages` |
| MiniMax | `https://api.minimax.chat/v1/messages` |
| Custom… | User enters a URL (for compatible vendors) |

### 5.2 Default Revision Prompt

```
Revise the following text to improve clarity, grammar, and flow while preserving the original meaning and tone. Return only the revised text with no explanation.
```

Users can edit this to anything: "Make it more concise", "Translate to Japanese", "Fix grammar only", etc.

### 5.3 Revision Flow

1. User selects text in the editor
2. User triggers `Cmd+J R` (or command palette: "AI: Revise Selection")
3. Selection gets a pulsing shimmer decoration (CSS animation)
4. Rust backend sends the selected text + user prompt to the configured API
5. On success: shimmer is replaced by an inline diff widget
   - Original text: strikethrough + faded (red-tinted)
   - Revised text: green-tinted widget decoration below/after original
   - Small floating action bar: **Accept** (Enter) / **Reject** (Esc)
6. User resolves:
   - **Accept (Enter):** Original text is replaced with revised text in the document
   - **Reject (Esc):** Widget removed, original text restored untouched
7. Document returns to normal editing state

### 5.4 Error Handling

| Scenario | Behavior |
|----------|----------|
| No API key configured | Status bar: "Set your API key in Settings → AI" |
| No text selected | Status bar: "Select text first, then revise" |
| Network error | Status bar: "AI revision failed — check your connection" |
| Invalid API key (401/403) | Status bar: "Invalid API key — check Settings → AI" |
| Rate limit (429) | Status bar: "Rate limited — try again in a moment" |
| Timeout (30s) | Status bar: "AI revision timed out — try a shorter selection" |
| API returns empty | Status bar: "AI returned empty response — try again" |
| Already revising | Status bar: "Revision in progress…" (ignore duplicate triggers) |
| Selection too long | Status bar: "Selection too long (max 4000 characters)" |

In all error cases, the original text is never modified.

**Stale response handling:** If the user cancels (Esc) and immediately re-triggers, the first API call may still return. Each revision is tagged with a monotonic ID; responses with mismatched IDs are silently discarded. The HTTP request runs to completion (no abort), but the result is ignored.

### 5.5 Constraints

- Maximum selection: 4000 characters (prevents expensive API calls)
- Timeout: 30 seconds
- One revision at a time (no concurrent revisions)
- Document is not editable while a revision diff is pending — all keyboard input is blocked except Enter (accept), Esc (reject), and modifier keys (Cmd+Z after accept)
- Revision responses are tagged with a monotonic ID — stale responses from cancelled revisions are silently discarded

## 6. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Setup completion | >90% of users who open Settings → AI complete setup | Future analytics (opt-in) |
| Revision accept rate | >60% | Future analytics |
| Time to resolve | <5 seconds from diff shown to accept/reject | Future analytics |
| Error rate | <5% of revision attempts | Future analytics |

## 7. Privacy & Security

- API keys are stored in plaintext in `~/.config/LiveMark/preferences.json` — standard practice for desktop apps (same as VS Code, Cursor, etc.)
- API calls go directly from the user's machine to the provider — no intermediary
- No telemetry, no usage tracking, no data collection
- The revision prompt and selected text are sent only to the user's configured provider
- Keys are never logged, never included in crash reports

## 8. Future Enhancements (P2)

- Streaming responses (show revised text as it arrives)
- Multiple named prompts with quick-switch
- Revision history (last N revisions per session)
- Whole-document revision mode
- Custom keyboard shortcut for revision trigger
- Additional model choices (when more models are worth exposing)

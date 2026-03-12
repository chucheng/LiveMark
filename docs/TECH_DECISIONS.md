# LiveMark — Technical Decisions

This document records key technical decisions, the options considered, and the reasoning behind each choice.

---

## Decision 1: Tauri over Electron

**Status:** Decided

**Context:** LiveMark needs a desktop shell to wrap a web-based editor. The two dominant options are Electron and Tauri.

**Options:**

| Option | Pros | Cons |
|---|---|---|
| Electron | Massive ecosystem, mature, consistent rendering (bundled Chromium) | Large binary (~150MB), high memory (~200MB+), slow startup |
| Tauri 2.x | Tiny binary (~15MB), low memory (~50MB), fast startup, Rust backend | Smaller ecosystem, WebView rendering varies by OS, newer |

**Decision:** Tauri 2.x

**Reasoning:**
1. LiveMark's brand promise is speed and lightness. Electron's overhead contradicts this.
2. The editor is ProseMirror-based, which works well across all modern WebViews.
3. Tauri's Rust backend gives us high-performance file I/O and a path to native features.
4. WebView inconsistencies are manageable because we control the full CSS and don't need advanced web APIs.
5. Tauri 2.x is stable and production-ready.

**Risk:** WebKit on macOS and WebKitGTK on Linux may have subtle rendering differences. Mitigation: thorough cross-platform testing and CSS normalization.

---

## Decision 2: ProseMirror over CodeMirror 6

**Status:** Decided

**Context:** The editor engine is the most critical technical choice. It determines what's possible for inline rendering.

**Options:**

| Option | Approach | Fit for LiveMark |
|---|---|---|
| ProseMirror | Schema-driven structured editor | Excellent — designed for rich-text editing with custom rendering |
| CodeMirror 6 | Text editor with decorations | Poor — treats document as flat text, not structured tree |
| TipTap | ProseMirror wrapper | Good but adds indirection |
| Lexical (Meta) | Tree-based editor | Possible but less mature, designed for React |
| Custom | Build from scratch | Enormous effort, years to mature |

**Decision:** ProseMirror (directly, not via TipTap)

**Reasoning:**
1. ProseMirror's document model is a **typed tree** — each node is a semantic element (heading, paragraph, list, etc.). This maps perfectly to Markdown's structure.
2. **NodeViews** let us define custom DOM rendering for each node type, with full control over the editing-vs-rendered transition.
3. **prosemirror-markdown** provides a solid foundation for Markdown↔PM conversion.
4. ProseMirror's **transaction system** gives us incremental updates — no re-rendering the whole document on each keystroke.
5. Using PM directly (instead of TipTap) avoids an abstraction layer, giving us full control over the editor's behavior.

**Risk:** ProseMirror has a steep learning curve and requires more boilerplate than TipTap. Mitigation: invest upfront in understanding the API; the payoff is full control.

---

## Decision 3: SolidJS over React

**Status:** Decided

**Context:** Need a UI framework for the shell (title bar, status bar, command palette, dialogs). The editor itself is ProseMirror (vanilla DOM), so the framework mainly wraps the chrome.

**Options:**

| Option | Pros | Cons |
|---|---|---|
| React | Massive ecosystem, familiar | VDOM overhead, larger bundle, unnecessary for this use case |
| SolidJS | No VDOM, fine-grained reactivity, tiny bundle | Smaller ecosystem |
| Svelte | Compiled, small output | Compiler adds build complexity |
| Vanilla JS | Zero overhead | Harder to manage reactive UI state |

**Decision:** SolidJS

**Reasoning:**
1. The UI shell is simple — a few reactive components around the ProseMirror editor. We don't need React's ecosystem.
2. SolidJS's signal-based reactivity is a perfect fit: state changes propagate directly to DOM without diffing.
3. The ~7KB runtime is tiny, helping with startup time and bundle size.
4. SolidJS's JSX is familiar to React developers, so the learning curve is low.
5. No virtual DOM means ProseMirror integration is clean — no fighting with React's reconciler.

**Risk:** Smaller community means fewer third-party components. Mitigation: we need very few third-party UI components; most of our UI is custom.

---

## Decision 4: markdown-it for Parsing

**Status:** Decided

**Context:** Need a Markdown parser for two operations: (1) parsing a file into a ProseMirror document, and (2) rendering Markdown to HTML for export.

**Options:**

| Option | Pros | Cons |
|---|---|---|
| markdown-it | CommonMark-compliant, fast, extensible, mature | Not a Rust parser |
| remark (unified) | AST-based, very extensible | Heavier, more complex |
| marked | Fast, simple | Less extensible, fewer plugins |
| pulldown-cmark (Rust) | Very fast, could run in backend | Harder to integrate with ProseMirror |

**Decision:** markdown-it

**Reasoning:**
1. Full CommonMark compliance — critical for a Markdown editor.
2. GFM support via official plugins (tables, task lists, strikethrough).
3. Plugin system allows extending for custom syntax in the future.
4. Performance is excellent: fast enough that parsing even large files is imperceptible.
5. Well-tested integration with prosemirror-markdown.

**Future option:** If parsing performance becomes a bottleneck for very large files, we can move parsing to the Rust backend using pulldown-cmark and send the token stream to the frontend.

---

## Decision 5: CSS Modules over CSS-in-JS

**Status:** Decided

**Context:** Need a styling approach for the UI components and editor theme.

**Decision:** Vanilla CSS with CSS Modules for component scoping, CSS Custom Properties for theming.

**Reasoning:**
1. Zero runtime overhead — CSS is parsed by the browser natively.
2. CSS Custom Properties give us a clean theming system without JavaScript.
3. CSS Modules prevent class name collisions without BEM conventions.
4. The editor styling is mostly ProseMirror CSS — framework-agnostic by nature.
5. No build-time CSS-in-JS processing needed.

---

## Decision 6: Cursor-Aware Rendering via NodeViews + Decorations

**Status:** Decided

**Context:** The core UX — showing raw syntax when the cursor is in an element, rendered output otherwise — requires a specific technical approach.

**Options:**

1. **Dual-mode NodeViews**: Each block NodeView has rendered and editing modes, toggled by cursor position.
2. **Decorations only**: Use ProseMirror decorations to overlay/hide syntax markers.
3. **Re-parse on cursor move**: Re-render the document with different rules based on cursor position.

**Decision:** Dual-mode NodeViews for blocks, decorations for inline marks.

**Reasoning:**
1. NodeViews give full DOM control per block, making mode switching clean.
2. Inline marks (bold, italic) can't use NodeViews — they're handled by decorations that show/hide the `**`, `*`, etc. markers.
3. Re-parsing is too expensive and fragile for real-time cursor tracking.

**Implementation detail:** The `live-render` ProseMirror plugin observes `selectionChanged` transactions and dispatches `setMeta` transactions to signal NodeViews which node is "active" (cursor inside). NodeViews read this metadata and update their DOM accordingly.

---

## Decision 7: Atomic File Saves

**Status:** Decided

**Context:** Saving must never corrupt or lose a file, even if the app crashes mid-write.

**Decision:** Write to a temporary file in the same directory, then atomically rename to the target path.

**Reasoning:**
1. If the write fails or the app crashes, the original file is untouched.
2. Atomic rename is supported on all target platforms (macOS, Windows, Linux).
3. Writing to the same directory ensures same-filesystem rename (no cross-device move).

---

## Decision 8: No Multi-Tab in v1

**Status:** Decided

**Context:** Should v1 support multiple open documents in tabs?

**Decision:** No. Single-document focus.

**Reasoning:**
1. Multi-tab adds significant complexity: tab management, per-tab state, memory management, tab UI, keyboard navigation between tabs.
2. Single-document focus aligns with the "distraction-free" philosophy.
3. Users can open multiple LiveMark windows for multiple files.
4. Ships faster, reducing time to v1.

**Future:** Multi-tab is a clear v2 feature.

---

## Decision 9: pnpm over npm/yarn

**Status:** Decided

**Decision:** pnpm

**Reasoning:** Faster installs, strict dependency resolution (prevents phantom dependencies), disk-efficient via hard links. Standard choice for modern projects.

---

## Decision 10: Vitest + Playwright for Testing

**Status:** Decided

**Decision:** Vitest for unit/integration tests, Playwright for end-to-end tests.

**Reasoning:**
1. Vitest: Jest-compatible API but significantly faster (native ESM, Vite-powered).
2. Playwright: Can test the actual Tauri WebView, supporting cross-platform e2e testing.
3. Both are actively maintained and well-documented.

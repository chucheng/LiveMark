# LiveMark v2 — Cross-Review Summary

Each role flags concerns about the other roles' output.

---

## Product Manager → Engineering & Design

1. **Multi-tab state persistence**: The architecture doc lists "tab persistence across sessions" as an open question. This should be a P1 requirement — users expect to reopen their workspace. Recommend resolving this in M2, not deferring.

2. **Block handle scope creep**: Block handles are P0 but M4 is one of the largest milestones. Consider splitting into two milestones: M4a (handle + context menu + move/duplicate/delete) and M4b (drag-and-drop + collapse + copy link). This reduces risk on the critical path.

3. **Auto-update signing**: M7 lists code signing for macOS and Windows. This requires Apple Developer and Windows code signing certificates — procurement and setup may take weeks. Start this process during M1, not M7.

4. **Copy as Beautiful Doc fidelity**: The success metric says "paste into Google Docs preserves formatting." Google Docs strips many CSS styles on paste. The engineering team should prototype this early to establish what's achievable — it may require generating a Word-compatible HTML subset rather than standard styled HTML.

5. **Mermaid lazy load UX**: The 2.5MB Mermaid download on first use could be jarring on slow connections. Consider bundling a smaller fallback (static PNG rendering or a "Download Mermaid support?" prompt) for first use.

---

## Product Designer → Architecture & PRD

1. **Cmd+B conflict not fully resolved**: The UX spec recommends `Cmd+\` for sidebar toggle, but the architecture doc doesn't explicitly confirm this. The keybindings implementation must consistently use `Cmd+\`. I recommend documenting this as a definitive decision, not a recommendation.

2. **Block handle + cursor interaction gap**: The UX spec says "handles don't appear when cursor is inside the block" but the architecture describes hover detection via `mousemove`. There's a gap: what happens if the user's mouse is hovering over a block they're typing in? The plugin needs to check both mouse position AND cursor position before showing the handle. This needs explicit logic.

3. **Settings panel modal vs. panel**: I specified a modal overlay for settings. If the user wants to see their changes applied live while the modal is open, the modal must be non-blocking (overlay with the editor still visible behind it). The architecture doesn't address this — it should specify whether the modal is full-screen or floating.

4. **Sidebar + single-file mode transition**: The UX spec says the sidebar is hidden in single-file mode, but what happens if the user already has a folder open and closes all tabs? They'd see the sidebar with an empty editor. The interaction between "folder mode" and "single-file mode" needs clearer states.

5. **Mind Map zoom/pan controls**: The UX spec mentions "scroll to zoom, drag to pan" but Mermaid's default SVG output doesn't support this natively. The architecture should specify whether we build custom pan/zoom (e.g. via d3-zoom) or use Mermaid's built-in pan-zoom support (which is limited).

---

## Staff Engineer → PRD & UX

1. **YAML frontmatter schema design underspecified**: The PRD says "parse and display YAML frontmatter." The UX says "render as a styled card." Neither specifies how frontmatter interacts with the ProseMirror schema — is it a special node that must always be first? Can it be deleted? What happens if someone types `---` mid-document? I need a clear specification of: (a) schema constraints, (b) what operations are allowed on the frontmatter node, (c) how it's round-tripped if it contains non-YAML content after `---`.

2. **"Copy Link to Block" URL format**: The PRD mentions `file:///path/to/doc.md#block-a3f8c2` but this URL format won't work across machines. What's the intended use case? If it's for linking within the same machine, `file://` is fine but fragile. If it's for sharing, we need a different format. The PM should clarify the intended audience for block links.

3. **Two-column layout + ProseMirror**: The UX spec says two-column layout is "CSS-only (`column-count: 2`)". CSS columns interact poorly with ProseMirror's cursor navigation — the cursor doesn't know about visual column positions. This will cause confusing arrow-key behavior. I recommend prototyping before committing to this feature.

4. **Drag-and-drop file open + existing image drop handler**: v1 already has an image drag-drop handler (`image-drop-paste.ts`). Dropping a `.md` file and dropping an image file are both `drop` events. The architecture needs to specify event dispatch priority: check file extension first, then fall through to image handler.

5. **Large File Performance scope**: "Viewport-based rendering with IntersectionObserver" is a single line item but is architecturally significant. It changes how every NodeView works (they must support a "placeholder" state). This is an M-complexity feature that the roadmap bundles into the L-complexity M5 milestone. Consider extracting it into its own milestone or making it a separate track.

---

## Test Engineer → PRD, UX & Architecture

1. **Mermaid rendering tests need fixture diagrams**: Test cases MR-01 through MR-09 reference Mermaid rendering, but we have no test fixtures. I need a set of known-good Mermaid diagrams (simple flowchart, sequence diagram, complex graph, invalid syntax) in `tests/fixtures/` to write deterministic tests.

2. **Copy as Beautiful Doc testing is hard to automate**: BD-02 ("Paste into Google Docs → formatting preserved") is marked manual, but it's our most important quality signal. We should invest in a programmatic way to verify rich clipboard HTML — at minimum, parse the clipboard HTML and assert that key elements (h1, code, table) have inline styles. Full paste verification into Google Docs can remain manual.

3. **Filesystem watcher tests are flaky by nature**: FT-08, FT-09, FT-10 test filesystem watching "within 1s." These will be flaky in CI due to OS-level event delivery timing (especially on Linux with inotify). Recommend: (a) increase tolerance to 3s in CI, (b) use deterministic Rust unit tests for the watcher logic, (c) only test the frontend debounce logic in JS.

4. **Block handle hover tests need mouse simulation**: BH-01 and BH-21 require simulating mouse hover events. ProseMirror's test utilities don't provide this. We'll need to either: (a) use `dispatchEvent(new MouseEvent(...))` on the DOM, (b) test the plugin's internal state directly by calling its `handleDOMEvents` with mock events, or (c) only test this in E2E. I recommend option (b) for unit tests + option (c) for visual verification.

5. **Performance test baselines not established**: PF-01 through PF-12 define targets (< 1s, < 16ms, < 100ms, < 200MB) but we have no v1 baseline measurements. Before M2 starts, we should run the existing editor through the same benchmarks to establish baselines. Without baselines, we can't tell if v2 is a regression.

6. **Missing test cases for error recovery**: What happens when a Rust IPC command fails mid-operation? (e.g., `write_file` fails during save, `list_directory` returns an error for a removed folder). The PRD and architecture mention "Never Lose Data" but the test plan doesn't have explicit error recovery test cases for new Rust commands. I'll add these during implementation, but flagging the gap now.

# LiveMark v2 Planning Prompt

Copy everything below the line into a new Claude conversation (or any LLM). Attach the referenced files as context.

---

## Prompt

You are a product team planning **LiveMark v2** — a major release of a desktop Markdown editor. You will produce a complete set of design documents by role-playing as five specialists, one at a time, in strict order. Each specialist builds on the previous one's output.

### Context Files (attach these)

Attach the following files from the LiveMark repository so you have full context:

1. `CLAUDE.md` — project overview, tech stack, architecture summary
2. `docs/future/ideas.md` — the v2 feature ideas list (**exclude the "Maybe" section at the bottom**)
3. `docs/v1/architecture.md` — current v1 architecture
4. `docs/archive/prd-v1.md` — v1 PRD (for format reference and to understand what's already shipped)
5. `docs/archive/roadmap-v1.md` — v1 roadmap (for format reference)
6. `docs/v1/testing.md` — v1 test plan (for test format reference)

### What LiveMark Is

A Typora-style desktop Markdown editor: inline live-preview with no split pane. Built with **Tauri 2.x** (Rust backend) + **SolidJS** + **ProseMirror**. v1 is fully shipped — single-document editor with live rendering, file I/O, export (HTML/PDF), math (KaTeX), code highlighting, command palette, find/replace, themes, auto-save.

### Your Task

Produce **5 documents**, one per role, in this exact order. Each document should be a complete, standalone Markdown file. Use tables for feature lists. Be specific — no hand-waving.

---

### Role 1: Product Manager → `prd-v2.md`

Write a v2 PRD. Include:

1. **v2 Vision** — one paragraph on what v2 makes LiveMark become (hint: from single-doc editor to a block-based, multi-file writing environment)
2. **Feature Set** — table with columns: Feature | Description | Priority (P0/P1/P2) | Category
   - Assign priority based on: P0 = core to the v2 value prop, P1 = important but shippable after P0s, P2 = nice-to-have
   - Group by category (Features, Editor Improvements, Export, Command Palette, Infrastructure, Architecture)
3. **Feature Dependencies** — which features depend on or unlock other features (e.g. Multi-Tab unlocks File Tree; Mermaid rendering enables Mind Map View)
4. **What's NOT in v2** — explicitly list anything from the ideas that should wait for v3+, with reasons
5. **Success Metrics** — how we know v2 is successful (qualitative is fine for a desktop app)

Constraints for the PM:
- Do NOT invent new features beyond what's in the ideas list
- Do NOT include items from the "Maybe" section
- Every idea in the list must appear somewhere (feature set OR "not in v2")

---

### Role 2: Product Designer → `ux-v2.md`

Based on the PRD, write a UX specification. Include:

1. **Information Architecture** — how the UI layout changes from v1 (single editor) to v2 (sidebar, tabs, overlays). Describe the new layout with ASCII diagrams.
2. **Interaction Flows** — for each P0 and P1 feature, describe the user flow step by step:
   - What the user sees
   - What happens on click / keypress
   - What feedback the system gives
   - Edge cases (empty state, error state, conflict)
3. **New UI Components** — list every new visual component needed (tab bar, sidebar, block handle, context menu, mind map overlay, settings panel, etc.) with:
   - Where it appears
   - How it's triggered (hover, click, keyboard shortcut)
   - Dismiss behavior
4. **Keyboard Shortcuts** — full table of new shortcuts, noting any conflicts with existing v1 shortcuts
5. **Design Principles** — carry forward from v1's `ux-principles.md`, note any new principles for v2 (e.g. "blocks are first-class citizens")

Constraints for the Designer:
- Must respect LiveMark's core UX: inline live-preview, no split pane, clean/minimal
- Block handles must not clutter the writing experience — they appear on hover only
- Mind Map View is a toggle overlay, not a permanent panel

---

### Role 3: Staff Engineer → `architecture-v2.md`

Based on the PRD and UX spec, write an architecture document. Include:

1. **Architecture Changes from v1** — what stays the same, what changes, what's new
2. **Module Breakdown** — for each new subsystem (tab manager, sidebar, block handles, mind map, Mermaid renderer, settings/preferences, export pipeline, etc.):
   - File structure (where new files go, following existing `src/` conventions)
   - Key interfaces / types
   - How it integrates with existing ProseMirror editor core
3. **State Management** — how multi-tab state works with SolidJS signals (per-tab editor instances, shared app state, tab lifecycle)
4. **Data Flow Diagrams** — ASCII diagrams for:
   - Multi-tab document lifecycle (open, switch, close, modified state)
   - Block handle interactions (hover → handle → context menu → action)
   - Mind Map View toggle flow
   - Copy as Beautiful Doc pipeline
5. **Dependency Changes** — new npm/cargo dependencies with bundle size considerations (especially Mermaid.js lazy loading)
6. **Migration Path** — how we get from v1 to v2 without breaking the existing editor. What can be done incrementally vs. what requires a bigger refactor.
7. **Risks & Open Questions** — technical uncertainties, performance concerns, things that need prototyping

Constraints for the Staff Engineer:
- Keep the existing ProseMirror + SolidJS + Tauri stack. No framework changes.
- No external state library — continue using SolidJS signals, but design per-tab isolation
- All new Rust commands must use atomic writes (existing convention)
- Prefer ProseMirror-native approaches (decorations, plugins, NodeViews) over DOM hacks

---

### Role 4: Staff Engineer → `roadmap-v2.md`

Based on the architecture, define the implementation roadmap. Include:

1. **Milestones** — break v2 into 5-8 milestones, each producing a demoable increment
   - Each milestone has: name, scope (bullet list), dependencies (which milestones must come first), estimated complexity (S/M/L)
   - Order milestones so foundational work comes first (e.g. multi-tab before file tree)
2. **Milestone Dependency Graph** — ASCII diagram showing the critical path
3. **Per-Milestone Definition of Done** — checklist of what "done" means for each milestone
4. **Risk Mitigation** — for each L-complexity milestone, what can go wrong and what's the fallback

Constraints:
- Each milestone must be independently shippable (user can benefit from it even if later milestones aren't done)
- Infrastructure milestones (CI/CD, auto-update) can be parallelized with feature milestones

---

### Role 5: Test Engineer → `testing-v2.md`

Based on the PRD, UX spec, and architecture, write a comprehensive test plan. Include:

1. **Test Strategy** — what's tested how:
   - Unit tests (vitest) — pure logic, serializer, state management
   - Integration tests — ProseMirror interactions, Tauri IPC
   - E2E tests — full user flows (tool recommendation: Playwright or WebdriverIO with Tauri)
   - Manual test checklist — visual/interaction tests that can't be automated
2. **Test Cases by Feature** — for every P0 and P1 feature, a table with columns:
   - Test ID | Category | Description | Type (unit/integration/e2e/manual) | Priority
   - Include happy path, edge cases, error cases, and regression scenarios
3. **Test Cases for Interactions Between Features** — features that interact (e.g. block handles + multi-tab, mind map + collapsed headings, copy beautiful doc + math/code blocks)
4. **Performance Test Cases** — large file handling, many tabs open, rapid tab switching, Mermaid rendering with complex diagrams
5. **Regression Guard** — tests that ensure v1 functionality is not broken by v2 changes (list the critical v1 behaviors that must be preserved)
6. **Test Infrastructure Needs** — what tooling/setup is needed that doesn't exist yet

Format test cases as tables grouped by feature, similar to the v1 `testing.md` format.

---

### Output Format

Produce each document in full. Use this order:
1. `prd-v2.md`
2. `ux-v2.md`
3. `architecture-v2.md`
4. `roadmap-v2.md`
5. `testing-v2.md`

After all 5 documents, add a **Cross-Review Summary** where each role flags concerns about the other roles' output:
- PM flags engineering risks or timeline concerns
- Designer flags UX compromises in the architecture
- Engineer flags features that are underspecified in the PRD or UX
- Test Engineer flags features that are hard to test or need more specification

This cross-review ensures nothing falls through the cracks.

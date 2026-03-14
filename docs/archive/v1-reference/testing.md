# LiveMark UI Test Plan

## 1. System Overview

LiveMark is a Typora-style desktop Markdown editor built with **Tauri 2.x** (Rust backend), **SolidJS** (UI shell), and **ProseMirror** (editor engine). It features cursor-aware live rendering — Markdown syntax is hidden when the cursor is outside a block, and revealed when the cursor enters it.

### Rendering Pipeline

```
Keystroke → ProseMirror transaction
  → Input rules check for Markdown patterns (e.g., `# `, `**text**`)
  → Transaction applied to EditorState
  → live-render plugin determines active block (cursor position)
  → inline-decorations plugin adds syntax marker widgets for active block
  → NodeViews render blocks with syntax hints (headings, code blocks, etc.)
  → DOM updated surgically
```

### State Architecture

- **ProseMirror EditorState**: Single source of truth during editing (immutable doc tree)
- **SolidJS Signals**: UI state (filePath, isModified, theme, palette/find/source toggles)
- **Markdown Bridge**: `markdown-it → ProseMirror doc` (parsing), `PM doc → Markdown string` (serialization)

### Key Components Under Test

| Component | File(s) | Risk Level |
|---|---|---|
| Markdown parser | `src/editor/markdown/parser.ts` | High |
| Markdown serializer | `src/editor/markdown/serializer.ts` | High |
| Input rules | `src/editor/input-rules.ts` | High |
| Find/replace plugin | `src/editor/plugins/find-replace.ts` | High |
| Inline decorations | `src/editor/plugins/inline-decorations.ts` | Medium |
| Live render plugin | `src/editor/plugins/live-render.ts` | Medium |
| Keymaps | `src/editor/keymaps.ts` | Medium |
| Schema | `src/editor/schema.ts` | Medium |
| Command registry | `src/commands/registry.ts` | Low |

---

## 2. Risk Areas

### 2.1 Markdown Round-Trip Fidelity (Critical)

**Risk**: Opening a file and saving it without edits must not corrupt content. The parse→serialize cycle must preserve structure.

**Specific concerns**:
- Nested blockquotes lose inner quote markers
- Table cells with inline marks (bold, links) may mis-serialize
- Code blocks containing backticks need proper escaping
- Task list items with inline formatting
- Ordered lists with non-1 start numbers
- Images with special characters in URLs or titles
- Hard breaks at various positions in paragraphs
- Empty nodes (empty paragraphs, empty list items, empty table cells)

### 2.2 Input Rule Position Arithmetic (Critical)

**Risk**: Input rules compute positions manually after document mutations. Off-by-one errors cause cursor jumps, lost text, or schema violations.

**Specific concerns**:
- `horizontalRuleRule`: After `replaceRangeWith()`, `tr.mapping.map(end)` must point to correct position. If HR is at end of document, paragraph insertion at `tr.doc.content.size` must work.
- `taskListRule`: `tr.mapping.map(range.start) + 1` assumes specific node structure after wrapping. If wrapping changes node count differently than expected, offset is wrong.
- `markWrappingRule`: Deleting closing marker then opening marker — second deletion must account for the first's position shift. `closeStart` and `openEnd` positions shift after first delete.

### 2.3 Find/Replace Offset Mapping (High)

**Risk**: `textOffsetToDocPos()` converts linear text offsets to ProseMirror positions. Incorrect mapping causes find highlights at wrong positions, or replace operations corrupting the document.

**Specific concerns**:
- Block nodes contribute 1 character (`\n`) in `textBetween()` but occupy `nodeSize` in PM positions
- Hard breaks contribute 1 character but are inline nodes
- Image nodes have no text content but occupy position space
- Table cells/rows have complex position arithmetic
- Matches spanning block boundaries (shouldn't happen but edge case with regex)

### 2.4 Inline Decoration Mark Ranges (Medium)

**Risk**: `collectMarkRanges()` accumulates contiguous mark ranges for syntax widget insertion. Incorrect ranges cause widgets at wrong positions or missing/duplicate widgets.

**Specific concerns**:
- Adjacent but distinct marks of same type (e.g., two bold regions separated by unmarked text)
- Overlapping marks (bold + italic on same range)
- Link marks with different hrefs adjacent to each other
- Marks at the very start or end of a textblock
- Empty mark ranges

### 2.5 Schema Validation (Medium)

**Risk**: ProseMirror enforces schema constraints. Invalid documents cause crashes or silent data loss.

**Specific concerns**:
- Table cells must contain exactly `paragraph` children — parser must always wrap inline content
- `list_item` content is `paragraph block*` — first child must be paragraph
- `task_list_item` same constraint
- `doc` requires `block+` — empty documents need at least one paragraph
- Mixing table_header and table_cell in same row

### 2.6 Command Registry (Low)

**Risk**: Fuzzy search returns wrong commands or crashes on edge input.

---

## 3. Testing Strategy

### 3.1 Unit Tests — Markdown Serialization Edge Cases

**Why needed**: The existing 37 round-trip tests cover common cases but miss edge cases identified above. Serialization bugs are the #1 cause of data loss.

**Scope**: Parser + serializer, tested via `parseMarkdown()` / `serializeMarkdown()`.

**Framework**: Vitest (already configured).

### 3.2 Unit Tests — Input Rule Transformations

**Why needed**: Input rules perform complex position arithmetic. Bugs here cause cursor jumps, lost characters, or schema violations that crash the editor.

**Scope**: Test each input rule by constructing ProseMirror state, simulating text input that matches the rule pattern, and verifying the resulting document and cursor position.

**Framework**: Vitest + ProseMirror test utilities (construct state programmatically).

### 3.3 Unit Tests — Find/Replace Position Mapping

**Why needed**: The `textOffsetToDocPos` function must correctly map between two position spaces (linear text vs PM tree). Incorrect mapping causes find highlights at wrong positions.

**Scope**: Test `findMatches()` and `textOffsetToDocPos()` against documents with various block structures.

**Framework**: Vitest + ProseMirror state construction.

### 3.4 Unit Tests — Inline Decoration Ranges

**Why needed**: Mark range collection drives the syntax marker widgets. Wrong ranges = wrong or missing syntax indicators.

**Scope**: Test `collectMarkRanges()` and `buildInlineDecorations()` against nodes with various mark configurations.

**Framework**: Vitest + ProseMirror node construction.

### 3.5 Property-Based Tests — Round-Trip Invariants

**Why needed**: Handwritten test cases can't cover the combinatorial explosion of Markdown constructs. Property-based tests generate random valid Markdown and verify invariants.

**Scope**: Generate random Markdown documents, verify that `parse → serialize → parse` produces structurally identical documents (double round-trip structural fidelity).

**Framework**: Vitest + custom random Markdown generators.

### 3.6 Schema Validation Tests

**Why needed**: Verify that parser output always conforms to the schema, especially for complex structures (tables, nested lists).

**Scope**: Parse various Markdown inputs and verify schema compliance.

**Framework**: Vitest + ProseMirror schema validation.

### 3.7 State Transition Tests — Editor Commands

**Why needed**: ProseMirror commands (keymaps) must produce valid state transitions. Edge cases in `hrOnEnter`, `splitListItem` chaining, and mark toggles.

**Scope**: Construct editor state, apply commands, verify resulting state.

**Framework**: Vitest + ProseMirror command dispatch.

---

## 4. Concrete Test Cases

### 4.1 Serialization Edge Cases

| # | Test Case | Input | Expected Output |
|---|---|---|---|
| S1 | Empty table cell | `\| \| \|\n\| --- \| --- \|\n\| \| \|` | Structural equivalence after round-trip |
| S2 | Table cell with bold | `\| **bold** \| text \|\n\| --- \| --- \|\n\| a \| b \|` | Bold preserved in cell |
| S3 | Table cell with link | `\| [link](url) \|\n\| --- \|\n\| cell \|` | Link preserved in cell |
| S4 | Table cell with pipe character | `\| a \\\| b \| c \|\n\| --- \| --- \|\n\| d \| e \|` | Escaped pipe preserved |
| S5 | Code block with backticks in content | ````\`\`\`\nsome \`\`\` content\n\`\`\```` | Backticks preserved verbatim |
| S6 | Nested blockquote | `> outer\n>\n> > inner` | Structural equivalence |
| S7 | Ordered list starting at 0 | `0. Zero\n1. One` | Start number preserved |
| S8 | Image with spaces in title | `![alt](url "title with spaces")` | Title preserved |
| S9 | Image with empty alt | `![](url)` | Empty alt preserved |
| S10 | Multiple hard breaks | `a  \nb  \nc` | All hard breaks preserved |
| S11 | Inline code with backticks | ``Use `` `code` `` here`` | Backtick escaping correct |
| S12 | Strikethrough with special chars | `~~deleted **nested bold**~~` | Marks preserved |
| S13 | Link with title | `[text](url "title")` | Title preserved |
| S14 | Empty heading | `# ` (heading with no text) | Structural equivalence |
| S15 | Adjacent inline marks | `**bold***italic*` | Both marks preserved |
| S16 | Code block with empty language | ````\`\`\`\ncode\n\`\`\```` | No language attribute |
| S17 | Single-item task list | `- [ ] only item` | Structural equivalence |
| S18 | Table with 1 column | `\| header \|\n\| --- \|\n\| cell \|` | Single column preserved |

### 4.2 Input Rule Tests

| # | Test Case | Scenario | Expected Result |
|---|---|---|---|
| IR1 | Heading levels 1-6 | Type `# ` through `###### ` | Paragraph → heading with correct level |
| IR2 | Horizontal rule via `--- ` | Type `---` then space | Paragraph replaced with HR + new paragraph after |
| IR3 | HR at end of document | Type `--- ` when paragraph is last node | HR created, new paragraph appended |
| IR4 | HR not in non-paragraph | Type `--- ` inside a list item | No transformation (rule should not match) |
| IR5 | Task list unchecked | Type `- [ ] ` | Paragraph → task_list > task_list_item(checked=false) |
| IR6 | Task list checked | Type `- [x] ` | Paragraph → task_list > task_list_item(checked=true) |
| IR7 | Bold wrapping | Type `**bold**` | Text replaced with bold mark applied |
| IR8 | Italic wrapping | Type `*italic*` | Text replaced with italic mark applied |
| IR9 | Code wrapping | Type `` `code` `` | Text replaced with code mark applied |
| IR10 | Strikethrough wrapping | Type `~~strike~~` | Text replaced with strikethrough mark applied |
| IR11 | Bold not matching single * | Type `*text*` | Should trigger italic, not bold |
| IR12 | Mark at line start | Type `**bold**` at start of paragraph | Mark applied correctly |
| IR13 | Mark after space | Type `word **bold**` | Mark applied to "bold" only |
| IR14 | Bullet list | Type `- ` at start | Paragraph → bullet_list > list_item |
| IR15 | Ordered list | Type `1. ` at start | Paragraph → ordered_list > list_item |
| IR16 | Code block | Type ` ```js ` at start | Paragraph → code_block(language="js") |
| IR17 | Blockquote | Type `> ` at start | Paragraph → blockquote > paragraph |

### 4.3 Find/Replace Tests

| # | Test Case | Document | Query | Expected Matches |
|---|---|---|---|---|
| FR1 | Simple text match | `Hello world` | `world` | 1 match at correct position |
| FR2 | Multiple matches | `the the the` | `the` | 3 matches |
| FR3 | Cross-paragraph no match | `Hello\n\nworld` | `Hello world` | 0 matches (block boundary = \n) |
| FR4 | Case insensitive | `Hello HELLO hello` | `hello` (case insensitive) | 3 matches |
| FR5 | Case sensitive | `Hello HELLO hello` | `hello` (case sensitive) | 1 match |
| FR6 | Regex search | `foo123 bar456` | `\d+` (regex) | 2 matches |
| FR7 | Empty query | `Hello` | `` | 0 matches |
| FR8 | Invalid regex | `Hello` | `[invalid` (regex) | 0 matches (no crash) |
| FR9 | Match in heading | `# Title\n\nBody` | `Title` | 1 match in heading |
| FR10 | Match in code block | ````\`\`\`\ncode\n\`\`\```` | `code` | 1 match |
| FR11 | Match in table cell | `\| cell \|\n\| --- \|\n\| data \|` | `data` | 1 match |
| FR12 | Replace single match | `Hello world` | Replace `world` → `earth` | `Hello earth` |
| FR13 | Replace all | `a b a b a` | Replace all `a` → `x` | `x b x b x` |
| FR14 | Replace with empty (delete) | `Hello world` | Replace `world` → `` | `Hello ` |
| FR15 | Next/prev navigation | `a a a` (query `a`) | Navigate next 3 times | Cycles through 0→1→2→0 |
| FR16 | Document change re-runs search | `Hello` + add ` Hello` | `Hello` | 2 matches after edit |
| FR17 | Hard break in document | `Line1  \nLine2` | `Line` | 2 matches |
| FR18 | Zero-length regex match | `abc` | `` (regex) | No infinite loop, 0 matches |

### 4.4 Inline Decoration Tests

| # | Test Case | Node Content | Expected Ranges |
|---|---|---|---|
| ID1 | Single bold range | `Hello **world**` | 1 range: bold over "world" |
| ID2 | Adjacent different marks | `**bold** *italic*` | 2 ranges: bold, italic |
| ID3 | Overlapping marks | `***bold italic***` | Ranges for both strong and em |
| ID4 | Link mark | `[text](url)` | 1 range: link over "text" |
| ID5 | No marks | `plain text` | 0 ranges |
| ID6 | Mark at textblock start | `**bold** rest` | Range starts at textblock position |
| ID7 | Mark at textblock end | `rest **bold**` | Range ends at textblock end |
| ID8 | Code mark | `` `code` rest `` | 1 range: code over "code" |

### 4.5 Schema Validation Tests

| # | Test Case | Input | Expected |
|---|---|---|---|
| SV1 | Parsed table has paragraph in cells | `\| a \|\n\| --- \|\n\| b \|` | Each cell's first child is paragraph |
| SV2 | Parsed list has paragraph in items | `- item` | list_item's first child is paragraph |
| SV3 | Empty doc creates valid node | `` | doc with single empty paragraph |
| SV4 | Task list parsed correctly | `- [ ] task` | task_list > task_list_item(checked=false) > paragraph |
| SV5 | Heading has correct attrs | `## Title` | heading(level=2) |
| SV6 | Code block preserves language | ````\`\`\`python\ncode\n\`\`\```` | code_block(language="python") |
| SV7 | Image preserves all attrs | `![alt](src "title")` | image(src, alt, title) |
| SV8 | Ordered list preserves start | `3. Third` | ordered_list(start=3) |

### 4.6 Property-Based Tests

| # | Property | Generator | Invariant |
|---|---|---|---|
| PB1 | Double round-trip structural fidelity | Random valid Markdown | `parse(serialize(parse(md))).toJSON() === parse(md).toJSON()` |
| PB2 | Serialized output is valid Markdown | Random PM docs | `parse(serialize(doc))` does not return null |
| PB3 | Find matches are within doc bounds | Random docs + queries | All match positions satisfy `0 <= from < to <= doc.content.size` |
| PB4 | Replace all produces document without matches | Random docs + queries | After replaceAll, search returns 0 matches |

### 4.7 Command/Keymap State Transition Tests

| # | Test Case | Initial State | Command | Expected Result |
|---|---|---|---|---|
| KM1 | Toggle bold on selection | "Hello **world**" with "world" selected | toggleMark(strong) | "world" loses bold mark |
| KM2 | Toggle bold on empty selection | Cursor in bold text | toggleMark(strong) | Stored mark removed |
| KM3 | HR on Enter with `---` | Paragraph containing `---`, cursor at end | hrOnEnter | Paragraph → HR + new empty paragraph |
| KM4 | HR not triggered on non-`---` | Paragraph containing `-- `, cursor at end | hrOnEnter | Returns false (no change) |
| KM5 | Split list item on Enter | Cursor at end of list item | splitListItem | New list item created |
| KM6 | Undo reverses last change | After typing "hello" | undo | "hello" removed |
| KM7 | Redo re-applies | After undo | redo | "hello" restored |

---

## 5. Expected Behavior Summary

### Data Integrity
- **No data loss**: Any Markdown file opened and saved without edits must produce structurally identical output
- **Schema compliance**: Parser output always conforms to ProseMirror schema constraints
- **Position accuracy**: Find/replace highlights are always at the correct document positions

### Input Handling
- **Deterministic transforms**: Input rules produce the same result regardless of typing speed
- **Cursor stability**: After any input rule fires, cursor is at a valid, expected position
- **No schema violations**: Input rules never produce documents that violate the schema

### Rendering Consistency
- **Decoration accuracy**: Inline syntax markers appear at exact mark boundaries
- **Active block tracking**: live-render plugin correctly identifies cursor's depth-1 ancestor
- **No stale decorations**: Decorations update on every selection/doc change

### Search
- **Correct offsets**: Text-to-doc position mapping is accurate for all node types
- **No crashes**: Invalid regex or empty queries handled gracefully
- **Consistent state**: Match count and current index always in sync after any operation

---

## 6. Test Infrastructure

### Framework
- **Vitest** (already configured at `vitest.config.ts`)
- Test files at `src/**/__tests__/**/*.test.ts`

### Test Utilities Needed
- ProseMirror state construction helpers (create state from Markdown string)
- Input simulation helpers (apply input rules programmatically)
- Document assertion helpers (compare doc structure, check node types/attrs)

### Running Tests
```bash
pnpm test          # Run all tests
pnpm test --watch  # Watch mode
```

### Coverage Targets
- Serializer/parser: 100% of node types and mark types
- Input rules: All block and inline rules
- Find/replace: All meta action types + edge cases
- Inline decorations: All mark types

// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Node } from "prosemirror-model";
import { schema } from "../../editor/schema";
import { _testing } from "../ai-commands";
import { aiRevisePlugin } from "../../editor/plugins/ai-revise";

// Mock Tauri invoke — never actually called in validation tests
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock state modules to satisfy imports
vi.mock("../../state/preferences", () => ({
  preferencesState: {
    aiVerified: () => false,
    aiApiKey: () => "",
    getBaseURL: () => "",
    getModel: () => "",
    aiPrompt: () => "",
  },
  AI_DEFAULT_PROMPT: "fix",
}));

vi.mock("../../state/ui", () => ({
  uiState: {
    showStatus: vi.fn(),
  },
}));

vi.mock("../../editor/markdown/parser", () => ({
  parseMarkdown: () => null,
}));

const { computeTimeout, validateSelection, countBlocks } = _testing;

// --- Node builders ---

function doc(...children: Node[]): Node {
  return schema.node("doc", null, children);
}

function p(...parts: (Node | string)[]): Node {
  const nodes = parts
    .filter((c) => c !== "")
    .map((c) => (typeof c === "string" ? schema.text(c) : c));
  return schema.node("paragraph", null, nodes.length > 0 ? nodes : undefined);
}

function heading(level: number, text: string): Node {
  return schema.node("heading", { level }, [schema.text(text)]);
}

function codeBlock(text: string): Node {
  return schema.node("code_block", { language: "" }, text ? [schema.text(text)] : []);
}

function mathBlock(text: string): Node {
  return schema.node("math_block", {}, text ? [schema.text(text)] : []);
}

function frontmatter(text: string): Node {
  return schema.node("frontmatter", null, text ? [schema.text(text)] : []);
}

function image(src: string): Node {
  return schema.node("image", { src, alt: "img" });
}

function tableNode(): Node {
  const cell = (text: string) =>
    schema.node("table_cell", {}, [schema.node("paragraph", null, [schema.text(text)])]);
  const row = (...cells: Node[]) => schema.node("table_row", {}, cells);
  return schema.node("table", {}, [
    row(cell("A"), cell("B")),
    row(cell("C"), cell("D")),
  ]);
}

// --- Helpers ---

function createView(d: Node): EditorView {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return new EditorView(container, {
    state: EditorState.create({
      doc: d,
      plugins: [aiRevisePlugin()],
    }),
  });
}

// --- computeTimeout ---

describe("computeTimeout", () => {
  it("returns 10s for short text (≤500 chars)", () => {
    expect(computeTimeout(0)).toBe(10_000);
    expect(computeTimeout(100)).toBe(10_000);
    expect(computeTimeout(500)).toBe(10_000);
  });

  it("adds 2s per 500 chars beyond 500", () => {
    expect(computeTimeout(1000)).toBe(12_000); // 500 extra → +2s
    expect(computeTimeout(1500)).toBe(14_000); // 1000 extra → +4s
    expect(computeTimeout(2000)).toBe(16_000); // 1500 extra → +6s
  });

  it("partial 500-char blocks round down", () => {
    expect(computeTimeout(700)).toBe(10_000); // 200 extra → floor(200/500)*2000 = 0
    expect(computeTimeout(999)).toBe(10_000); // 499 extra → floor(499/500)*2000 = 0
    expect(computeTimeout(1001)).toBe(12_000); // 501 extra → floor(501/500)*2000 = 2000
  });

  it("caps at 30s", () => {
    expect(computeTimeout(4000)).toBe(24_000); // 3500 extra → +14s
    expect(computeTimeout(10000)).toBe(30_000); // would be 48s, capped
    expect(computeTimeout(50000)).toBe(30_000);
  });
});

// --- validateSelection ---

describe("validateSelection: blocks forbidden content", () => {
  it("returns null for plain text paragraphs", () => {
    const view = createView(doc(p("Hello world")));
    expect(validateSelection(view, 1, 12)).toBeNull();
    view.destroy();
  });

  it("blocks selection containing an image", () => {
    const d = doc(p("Text ", image("/pic.png"), " more text"));
    const view = createView(d);
    const result = validateSelection(view, 1, view.state.doc.content.size - 1);
    expect(result).toContain("images");
    view.destroy();
  });

  it("blocks selection containing a table", () => {
    const d = doc(p("Before"), tableNode(), p("After"));
    const view = createView(d);
    // Select from start of "Before" through the table
    const result = validateSelection(view, 1, view.state.doc.content.size - 1);
    expect(result).toContain("tables");
    view.destroy();
  });

  it("blocks selection containing a code block", () => {
    const d = doc(p("Before"), codeBlock("const x = 1;"), p("After"));
    const view = createView(d);
    const result = validateSelection(view, 1, view.state.doc.content.size - 1);
    expect(result).toContain("code blocks");
    view.destroy();
  });

  it("blocks selection containing a math block", () => {
    const d = doc(p("Before"), mathBlock("E=mc^2"), p("After"));
    const view = createView(d);
    const result = validateSelection(view, 1, view.state.doc.content.size - 1);
    expect(result).toContain("math blocks");
    view.destroy();
  });

  it("blocks selection containing frontmatter", () => {
    const d = doc(frontmatter("title: Hello"), p("Content"));
    const view = createView(d);
    const result = validateSelection(view, 0, view.state.doc.content.size);
    expect(result).toContain("frontmatter");
    view.destroy();
  });

  it("reports multiple forbidden types", () => {
    const d = doc(p("Text ", image("/a.png")), codeBlock("x"), p("End"));
    const view = createView(d);
    const result = validateSelection(view, 1, view.state.doc.content.size - 1);
    expect(result).toContain("images");
    expect(result).toContain("code blocks");
    expect(result).toContain(" and ");
    view.destroy();
  });

  it("allows selection within a paragraph even if doc has tables elsewhere", () => {
    const d = doc(p("Safe text"), tableNode(), p("Also safe"));
    const view = createView(d);
    // Select only within the first paragraph
    const result = validateSelection(view, 1, 10);
    expect(result).toBeNull();
    view.destroy();
  });
});

// --- countBlocks ---

describe("countBlocks", () => {
  it("counts 1 for a single paragraph", () => {
    const view = createView(doc(p("Hello")));
    expect(countBlocks(view, 1, 6)).toBe(1);
    view.destroy();
  });

  it("counts multiple paragraphs", () => {
    const d = doc(p("One"), p("Two"), p("Three"), p("Four"));
    const view = createView(d);
    // Select entire doc content
    expect(countBlocks(view, 0, view.state.doc.content.size)).toBe(4);
    view.destroy();
  });

  it("counts headings and paragraphs together", () => {
    const d = doc(heading(1, "Title"), p("Body"), p("More"));
    const view = createView(d);
    expect(countBlocks(view, 0, view.state.doc.content.size)).toBe(3);
    view.destroy();
  });

  it("counts only blocks that overlap the selection range", () => {
    const d = doc(p("One"), p("Two"), p("Three"));
    const view = createView(d);
    // Select just within first paragraph (pos 1 to 4, "One")
    expect(countBlocks(view, 1, 4)).toBe(1);
    view.destroy();
  });
});

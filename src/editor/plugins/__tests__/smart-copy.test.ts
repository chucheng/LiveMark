// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Node, Fragment } from "prosemirror-model";
import { schema } from "../../schema";
import { markdownSerializer } from "../../markdown/serializer";
import { smartCopyPlugin } from "../smart-copy";

// --- Mock uiState ---
let mockSourceView = false;
vi.mock("../../../state/ui", () => ({
  uiState: {
    isSourceView: () => mockSourceView,
  },
}));

// --- Mock getExportCSS and md.render to avoid rendering overhead ---
vi.mock("../../../export/export-css", () => ({
  getExportCSS: () => "",
}));
vi.mock("../../markdown/parser", () => ({
  md: {
    render: (text: string) => `<p>${text}</p>`,
  },
}));

// --- Node builders ---

function doc(...children: Node[]): Node {
  return schema.node("doc", null, children);
}

function p(...children: (Node | string)[]): Node {
  const nodes = children
    .filter((c) => c !== "")
    .map((c) => (typeof c === "string" ? schema.text(c) : c));
  return schema.node("paragraph", null, nodes.length > 0 ? nodes : undefined);
}

function heading(level: number, text: string): Node {
  return schema.node("heading", { level }, text ? [schema.text(text)] : []);
}

function codeBlock(text: string, language = ""): Node {
  return schema.node(
    "code_block",
    { language },
    text ? [schema.text(text)] : []
  );
}

function bulletList(...items: Node[]): Node {
  return schema.node("bullet_list", null, items);
}

function listItem(...children: Node[]): Node {
  return schema.node("list_item", null, children);
}

function bold(text: string): Node {
  return schema.text(text, [schema.marks.strong.create()]);
}

function italic(text: string): Node {
  return schema.text(text, [schema.marks.em.create()]);
}

function inlineCode(text: string): Node {
  return schema.text(text, [schema.marks.code.create()]);
}

// --- EditorView helpers ---

function createView(docNode: Node): EditorView {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const state = EditorState.create({
    doc: docNode,
    plugins: [smartCopyPlugin()],
  });
  return new EditorView(container, { state });
}

function select(view: EditorView, from: number, to: number): void {
  const tr = view.state.tr.setSelection(
    TextSelection.create(view.state.doc, from, to)
  );
  view.dispatch(tr);
}

/**
 * Simulate a clipboard event, returning what was written to clipboard.
 * We track whether our plugin wrote livemark-export HTML to distinguish
 * from ProseMirror's built-in clipboard handler.
 */
function simulateCopy(
  view: EditorView,
  type: "copy" | "cut" = "copy"
): { html: string; plain: string; intercepted: boolean } {
  const data: Record<string, string> = {};
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: {
      setData(format: string, value: string) {
        data[format] = value;
      },
      getData(format: string) {
        return data[format] || "";
      },
      clearData() {
        // ProseMirror's built-in handler calls this; noop for jsdom
      },
    },
  });
  Object.defineProperty(event, "preventDefault", {
    value: () => {},
    writable: true,
  });
  try {
    view.dom.dispatchEvent(event);
  } catch {
    // ProseMirror's built-in handler can throw in jsdom — safe to ignore
  }
  const intercepted = (data["text/html"] || "").includes("livemark-export");
  return {
    html: data["text/html"] || "",
    plain: data["text/plain"] || "",
    intercepted,
  };
}

// --- Reusable helper: mimics plugin's slice → serialize pipeline ---

function sliceAndSerialize(d: Node, from: number, to: number): string {
  const slice = d.slice(from, to);
  const $from = d.resolve(from);
  let wrapped = slice.content;

  let allInline = true;
  slice.content.forEach((node) => {
    if (node.isBlock) allInline = false;
  });

  if (allInline && slice.content.childCount > 0) {
    for (let depth = $from.depth; depth > 0; depth--) {
      const ancestor = $from.node(depth);
      wrapped = Fragment.from(ancestor.type.create(ancestor.attrs, wrapped));
    }
  } else if (slice.openStart > 0) {
    for (let depth = slice.openStart; depth > 0; depth--) {
      const node = $from.node($from.depth - depth + 1);
      wrapped = Fragment.from(node.type.create(node.attrs, wrapped));
    }
  }

  const tempDoc = schema.topNodeType.create(null, wrapped);
  return markdownSerializer.serialize(tempDoc);
}

// --- Tests ---

describe("Smart Copy Plugin", () => {
  let view: EditorView;

  beforeEach(() => {
    mockSourceView = false;
  });

  afterEach(() => {
    if (view) {
      const container = view.dom.parentElement;
      view.destroy();
      container?.remove();
    }
  });

  describe("basic copy behavior", () => {
    it("copies selected paragraph text as plain text", () => {
      view = createView(doc(p("Hello world")));
      select(view, 1, 6); // "Hello"
      const result = simulateCopy(view);
      expect(result.intercepted).toBe(true);
      expect(result.plain).toContain("Hello");
    });

    it("does not intercept when selection is collapsed", () => {
      view = createView(doc(p("Hello world")));
      select(view, 3, 3);
      const result = simulateCopy(view);
      // Our plugin should not have written livemark-export HTML
      expect(result.intercepted).toBe(false);
    });

    it("does not intercept in Source View mode", () => {
      mockSourceView = true;
      view = createView(doc(p("Hello world")));
      select(view, 1, 6);
      const result = simulateCopy(view);
      // Our plugin should not have written livemark-export HTML
      expect(result.intercepted).toBe(false);
    });

    it("produces both text/html and text/plain", () => {
      view = createView(doc(p("Hello world")));
      select(view, 1, 12);
      const result = simulateCopy(view);
      expect(result.intercepted).toBe(true);
      expect(result.plain).toContain("Hello world");
      expect(result.html).toContain("livemark-export");
    });
  });

  describe("cross-block selections", () => {
    it("copies heading + paragraph as markdown", () => {
      view = createView(doc(heading(2, "Title"), p("Body text")));
      // Select from start of heading content to end of paragraph content
      select(view, 1, 17);
      const result = simulateCopy(view);
      expect(result.intercepted).toBe(true);
      expect(result.plain).toContain("## Title");
      expect(result.plain).toContain("Body text");
    });

    it("copies bullet list items as markdown", () => {
      view = createView(
        doc(bulletList(listItem(p("Item 1")), listItem(p("Item 2"))))
      );
      // Select all text across both list items
      // Positions: 0=doc, 1=bullet_list, 2=li, 3=p, 4..9="Item 1", 10=/p, 11=/li,
      //   12=li, 13=p, 14..19="Item 2", 20=/p, 21=/li, 22=/bullet_list
      // TextSelection endpoints must be in inline-content nodes (paragraphs)
      select(view, 4, 19);
      const result = simulateCopy(view);
      expect(result.intercepted).toBe(true);
      // Partial first item ("tem 1") is expected since we start at pos 4 (skipping "I")
      expect(result.plain).toContain("tem 1");
      expect(result.plain).toContain("Item 2");
    });
  });

  describe("inline marks", () => {
    it("preserves bold markdown in plain text", () => {
      view = createView(doc(p("Hello ", bold("world"), " end")));
      const size = view.state.doc.content.size;
      select(view, 1, size - 1);
      const result = simulateCopy(view);
      expect(result.intercepted).toBe(true);
      expect(result.plain).toContain("**world**");
    });

    it("preserves italic markdown in plain text", () => {
      view = createView(doc(p("Say ", italic("hello"), " now")));
      const size = view.state.doc.content.size;
      select(view, 1, size - 1);
      const result = simulateCopy(view);
      expect(result.intercepted).toBe(true);
      expect(result.plain).toContain("*hello*");
    });

    it("preserves inline code in plain text", () => {
      view = createView(doc(p("Use ", inlineCode("console.log"), " here")));
      const size = view.state.doc.content.size;
      select(view, 1, size - 1);
      const result = simulateCopy(view);
      expect(result.intercepted).toBe(true);
      expect(result.plain).toContain("`console.log`");
    });
  });

  describe("code block special case", () => {
    it("copies raw code (no fences) when inside a single code block", () => {
      view = createView(doc(codeBlock("const x = 1;\nconst y = 2;", "js")));
      select(view, 1, 14);
      const result = simulateCopy(view);
      expect(result.intercepted).toBe(true);
      expect(result.plain).toBe("const x = 1;\n");
      expect(result.plain).not.toContain("```");
    });

    it("includes fences when selecting across paragraph + code block", () => {
      view = createView(doc(p("Before"), codeBlock("const x = 1;", "js")));
      const size = view.state.doc.content.size;
      select(view, 1, size - 1);
      const result = simulateCopy(view);
      expect(result.intercepted).toBe(true);
      expect(result.plain).toContain("```");
      expect(result.plain).toContain("const x = 1;");
    });
  });

  describe("cut behavior", () => {
    it("removes selection from editor on cut", () => {
      view = createView(doc(p("Hello world")));
      select(view, 1, 6);
      const result = simulateCopy(view, "cut");
      expect(result.intercepted).toBe(true);
      expect(result.plain).toContain("Hello");
      expect(view.state.doc.textContent).toBe(" world");
    });

    it("produces same clipboard data as copy for marked content", () => {
      view = createView(doc(p("Hello ", bold("world"))));
      const size = view.state.doc.content.size;
      select(view, 1, size - 1);
      const result = simulateCopy(view, "cut");
      expect(result.plain).toContain("**world**");
      expect(result.html).toContain("livemark-export");
    });
  });

  describe("HTML output", () => {
    it("wraps content in livemark-export div with styles", () => {
      view = createView(doc(p("Test")));
      select(view, 1, 5);
      const result = simulateCopy(view);
      expect(result.html).toMatch(/^<div class="livemark-export">/);
      expect(result.html).toContain("<style>");
    });
  });
});

// --- Pure serialization pipeline tests (no DOM needed) ---

describe("Smart Copy — serialization pipeline", () => {
  it("slice of heading serializes with # prefix", () => {
    const d = doc(heading(3, "My Heading"));
    const md = sliceAndSerialize(d, 1, 11);
    expect(md.trim()).toBe("### My Heading");
  });

  it("multi-block slice preserves structure", () => {
    const d = doc(heading(1, "Title"), p("Paragraph"), p("Another"));
    const md = sliceAndSerialize(d, 0, d.content.size);
    expect(md).toContain("# Title");
    expect(md).toContain("Paragraph");
    expect(md).toContain("Another");
  });

  it("bold text serializes with ** markers", () => {
    const d = doc(p("Say ", bold("hello"), " friend"));
    const md = sliceAndSerialize(d, 1, d.content.size - 1);
    expect(md.trim()).toBe("Say **hello** friend");
  });

  it("code block serializes with fences", () => {
    const d = doc(codeBlock("x = 1", "python"));
    const md = sliceAndSerialize(d, 0, d.content.size);
    expect(md).toContain("```python");
    expect(md).toContain("x = 1");
    expect(md).toContain("```");
  });

  it("partial bold selection preserves marks", () => {
    const d = doc(p("A ", bold("BOLD"), " Z"));
    // Select just "BOLD": pos 3..7
    const md = sliceAndSerialize(d, 3, 7);
    expect(md.trim()).toBe("**BOLD**");
  });

  it("italic text serializes with * markers", () => {
    const d = doc(p("Some ", italic("emphasis"), " here"));
    const md = sliceAndSerialize(d, 1, d.content.size - 1);
    expect(md.trim()).toBe("Some *emphasis* here");
  });
});

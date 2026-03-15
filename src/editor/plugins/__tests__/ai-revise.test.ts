// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Node } from "prosemirror-model";
import { schema } from "../../schema";
import {
  aiRevisePlugin,
  aiReviseKey,
  startRevision,
  completeRevision,
  cancelRevision,
  rejectRevision,
  isAIReviseActive,
} from "../ai-revise";

// Mock parseMarkdown and md to avoid full markdown-it dependency in tests
vi.mock("../../markdown/parser", () => ({
  parseMarkdown: (text: string) => {
    const textNode = schema.text(text);
    return schema.node("doc", null, [schema.node("paragraph", null, [textNode])]);
  },
  md: {
    render: (text: string) => {
      // Minimal Markdown rendering for tests: **bold** → <strong>bold</strong>
      const escaped = text
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code>$1</code>");
      return `<p>${escaped}</p>\n`;
    },
  },
}));

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

function table(): Node {
  const cell = (text: string) =>
    schema.node("table_cell", {}, [schema.node("paragraph", null, [schema.text(text)])]);
  const row = (...cells: Node[]) => schema.node("table_row", {}, cells);
  return schema.node("table", {}, [
    row(cell("A"), cell("B")),
    row(cell("C"), cell("D")),
  ]);
}

// --- Helpers ---

function createState(d: Node, cursorPos?: number): EditorState {
  const state = EditorState.create({
    doc: d,
    plugins: [aiRevisePlugin()],
  });
  if (cursorPos !== undefined) {
    return state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, cursorPos))
    );
  }
  return state;
}

function createView(d: Node): EditorView {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return new EditorView(container, {
    state: createState(d),
  });
}

function getPluginState(state: EditorState) {
  return aiReviseKey.getState(state)!;
}

function selectRange(view: EditorView, from: number, to: number) {
  const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to));
  view.dispatch(tr);
}

// --- Plugin state machine tests ---

describe("AI Revise plugin: state machine", () => {
  it("initializes in idle state", () => {
    const d = doc(p("Hello world"));
    const state = createState(d);
    const ps = getPluginState(state);
    expect(ps.status).toBe("idle");
    expect(ps.revisionId).toBe(0);
  });

  it("start transitions to loading with shimmer + pill decorations", () => {
    const view = createView(doc(p("Hello world")));
    startRevision(view, 1, 6, "Hello", 1);

    const ps = getPluginState(view.state);
    expect(ps.status).toBe("loading");
    expect(ps.originalFrom).toBe(1);
    expect(ps.originalTo).toBe(6);
    expect(ps.originalText).toBe("Hello");
    expect(ps.revisionId).toBe(1);

    // Should have 2 decorations: inline shimmer + widget pill
    const decos = ps.decorations.find(0, view.state.doc.content.size);
    expect(decos.length).toBe(2);
    view.destroy();
  });

  it("cancel from loading returns to idle", () => {
    const view = createView(doc(p("Hello world")));
    startRevision(view, 1, 6, "Hello", 1);
    expect(getPluginState(view.state).status).toBe("loading");

    cancelRevision(view);
    expect(getPluginState(view.state).status).toBe("idle");
    view.destroy();
  });

  it("complete with matching revisionId transitions to diff", () => {
    const view = createView(doc(p("Hello world")));
    startRevision(view, 1, 6, "Hello", 42);
    completeRevision(view, "Hi there", 42);

    const ps = getPluginState(view.state);
    expect(ps.status).toBe("diff");
    expect(ps.revisedText).toBe("Hi there");
    view.destroy();
  });

  it("complete with stale revisionId is ignored", () => {
    const view = createView(doc(p("Hello world")));
    startRevision(view, 1, 6, "Hello", 42);
    completeRevision(view, "Hi there", 99); // wrong ID

    const ps = getPluginState(view.state);
    expect(ps.status).toBe("loading"); // still loading, not diff
    view.destroy();
  });

  it("reject from diff returns to idle", () => {
    const view = createView(doc(p("Hello world")));
    startRevision(view, 1, 6, "Hello", 1);
    completeRevision(view, "Hi", 1);
    expect(getPluginState(view.state).status).toBe("diff");

    rejectRevision(view);
    expect(getPluginState(view.state).status).toBe("idle");
    view.destroy();
  });

  it("complete when not in loading state is ignored", () => {
    const view = createView(doc(p("Hello world")));
    // Still idle — complete should be a no-op
    completeRevision(view, "Hi", 1);
    expect(getPluginState(view.state).status).toBe("idle");
    view.destroy();
  });
});

// --- isAIReviseActive ---

describe("AI Revise: isAIReviseActive", () => {
  it("returns false when idle", () => {
    const view = createView(doc(p("Hello")));
    expect(isAIReviseActive(view)).toBe(false);
    view.destroy();
  });

  it("returns true when loading", () => {
    const view = createView(doc(p("Hello")));
    startRevision(view, 1, 6, "Hello", 1);
    expect(isAIReviseActive(view)).toBe(true);
    view.destroy();
  });

  it("returns true when diff", () => {
    const view = createView(doc(p("Hello")));
    startRevision(view, 1, 6, "Hello", 1);
    completeRevision(view, "Hi", 1);
    expect(isAIReviseActive(view)).toBe(true);
    view.destroy();
  });
});

// --- Decoration remapping on external edits ---

describe("AI Revise: decoration remapping", () => {
  it("remaps positions when text is inserted before the shimmer range", () => {
    const view = createView(doc(p("Hello world")));
    startRevision(view, 1, 6, "Hello", 1);

    // Insert "XX" at position 1 (before "Hello")
    const tr = view.state.tr.insertText("XX", 1, 1);
    view.dispatch(tr);

    const ps = getPluginState(view.state);
    expect(ps.status).toBe("loading");
    expect(ps.originalFrom).toBe(3); // shifted by 2
    expect(ps.originalTo).toBe(8);
  });

  it("cancels if the shimmer range collapses to zero", () => {
    const view = createView(doc(p("Hello world")));
    startRevision(view, 1, 6, "Hello", 1);

    // Delete the entire "Hello" range
    const tr = view.state.tr.delete(1, 6);
    view.dispatch(tr);

    const ps = getPluginState(view.state);
    expect(ps.status).toBe("idle");
    view.destroy();
  });
});

// --- Loading widget structure ---

describe("AI Revise: loading widget", () => {
  it("loading pill widget has expected structure", () => {
    const view = createView(doc(p("Hello world")));
    startRevision(view, 1, 6, "Hello", 1);

    // Find the widget in the DOM
    const pill = view.dom.querySelector(".lm-ai-loading-pill");
    expect(pill).not.toBeNull();
    expect(pill!.querySelector(".lm-ai-loading-dot")).not.toBeNull();
    expect(pill!.querySelector(".lm-ai-loading-label")?.textContent).toBe("Revising\u2026");
    expect(pill!.querySelector(".lm-ai-loading-hint")?.textContent).toBe("Esc");
    expect(pill!.getAttribute("contenteditable")).toBe("false");
    view.destroy();
  });

  it("loading pill disappears after cancel", () => {
    const view = createView(doc(p("Hello world")));
    startRevision(view, 1, 6, "Hello", 1);
    expect(view.dom.querySelector(".lm-ai-loading-pill")).not.toBeNull();

    cancelRevision(view);
    expect(view.dom.querySelector(".lm-ai-loading-pill")).toBeNull();
    view.destroy();
  });
});

// --- Diff widget renders Markdown ---

describe("AI Revise: diff widget Markdown rendering", () => {
  it("diff widget renders Markdown formatting as HTML", () => {
    const view = createView(doc(p("Hello world")));
    startRevision(view, 1, 6, "Hello", 1);
    completeRevision(view, "**Hi** there", 1);

    const insert = view.dom.querySelector(".lm-ai-diff-insert");
    expect(insert).not.toBeNull();
    // Should contain rendered <strong>, not raw **
    expect(insert!.innerHTML).toContain("<strong>");
    expect(insert!.textContent).toContain("Hi");
    view.destroy();
  });
});

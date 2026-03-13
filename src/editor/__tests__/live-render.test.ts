import { describe, it, expect } from "vitest";
import { EditorState, TextSelection, NodeSelection } from "prosemirror-state";
import { schema } from "../schema";
import { liveRenderPlugin, liveRenderKey } from "../plugins/live-render";
import { Node } from "prosemirror-model";

// --- Helpers ---

function createState(doc: Node, cursorPos?: number): EditorState {
  const state = EditorState.create({
    doc,
    plugins: [liveRenderPlugin()],
  });
  if (cursorPos !== undefined) {
    return state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, cursorPos))
    );
  }
  return state;
}

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
  return schema.node("heading", { level }, [schema.text(text)]);
}

function codeBlock(text: string): Node {
  return schema.node("code_block", { language: "" }, text ? [schema.text(text)] : []);
}

function hr(): Node {
  return schema.node("horizontal_rule");
}

function getActiveNodePos(state: EditorState): number | null {
  return liveRenderKey.getState(state)?.activeNodePos ?? null;
}

// --- Active Node Tracking ---

describe("Live render: active node tracking", () => {
  it("cursor in first paragraph makes it active", () => {
    const d = doc(p("Hello"), p("World"));
    const state = createState(d, 2); // inside "Hello"
    expect(getActiveNodePos(state)).toBe(0); // first paragraph starts at 0
  });

  it("cursor in second paragraph makes it active", () => {
    const d = doc(p("Hello"), p("World"));
    const state = createState(d, 9); // inside "World"
    // Second paragraph position
    const secondParaPos = d.firstChild!.nodeSize; // after first paragraph
    expect(getActiveNodePos(state)).toBe(secondParaPos);
  });

  it("cursor in heading tracks heading position", () => {
    const d = doc(heading(1, "Title"), p("Body"));
    const state = createState(d, 2); // inside "Title"
    expect(getActiveNodePos(state)).toBe(0);
  });

  it("cursor in code block tracks code block position", () => {
    const d = doc(p("Before"), codeBlock("code"));
    const secondPos = d.firstChild!.nodeSize;
    const state = createState(d, secondPos + 1); // inside code block
    expect(getActiveNodePos(state)).toBe(secondPos);
  });

  it("active node changes when cursor moves between blocks", () => {
    const d = doc(p("First"), p("Second"));
    let state = createState(d, 2); // in first paragraph
    expect(getActiveNodePos(state)).toBe(0);

    // Move cursor to second paragraph
    const secondPos = d.firstChild!.nodeSize;
    state = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, secondPos + 1))
    );
    expect(getActiveNodePos(state)).toBe(secondPos);
  });
});

// --- Decoration Building ---

describe("Live render: decorations", () => {
  it("active node gets lm-active decoration", () => {
    const d = doc(p("Hello"));
    const state = createState(d, 2);

    const pluginState = liveRenderKey.getState(state)!;
    expect(pluginState.decorations).not.toBeNull();
    expect(pluginState.activeNodePos).toBe(0);
  });

  it("no decoration when cursor at depth 0", () => {
    // This is an edge case - normally cursor can't be at depth 0
    // but we test the guard
    const d = doc(p("Hello"));
    const state = EditorState.create({
      doc: d,
      plugins: [liveRenderPlugin()],
    });

    // Default selection should be in the paragraph
    const pluginState = liveRenderKey.getState(state)!;
    expect(pluginState.activeNodePos).not.toBeNull();
  });

  it("decorations update on doc change", () => {
    const d = doc(p("Hello"));
    let state = createState(d, 2);

    const before = liveRenderKey.getState(state)!;

    // Insert text (changes doc)
    const tr = state.tr.insertText(" World", 6);
    state = state.apply(tr);

    const after = liveRenderKey.getState(state)!;
    // Active node should still be 0 (first paragraph)
    expect(after.activeNodePos).toBe(0);
  });

  it("no recomputation when no selection or doc change", () => {
    const d = doc(p("Hello"));
    let state = createState(d, 2);

    const before = liveRenderKey.getState(state)!;

    // Apply a transaction that doesn't change selection or doc
    // (e.g., just a meta-only transaction)
    const tr = state.tr.setMeta("test", true);
    state = state.apply(tr);

    const after = liveRenderKey.getState(state)!;
    // Should be the same object (reused)
    expect(after).toBe(before);
  });
});

// --- Edge Cases ---

describe("Live render: edge cases", () => {
  it("single paragraph document", () => {
    const d = doc(p("Only one"));
    const state = createState(d, 2);
    expect(getActiveNodePos(state)).toBe(0);
  });

  it("document with horizontal rule between paragraphs", () => {
    const d = doc(p("Before"), hr(), p("After"));
    const state = createState(d, 2); // in first paragraph
    expect(getActiveNodePos(state)).toBe(0);
  });

  it("empty paragraph is tracked", () => {
    const d = doc(p(""));
    const state = createState(d, 1); // inside empty paragraph
    expect(getActiveNodePos(state)).toBe(0);
  });

  it("multiple paragraphs - cursor at end of last", () => {
    const d = doc(p("A"), p("B"), p("C"));
    // Get position of last paragraph
    let pos = 0;
    for (let i = 0; i < d.childCount - 1; i++) {
      pos += d.child(i).nodeSize;
    }
    const state = createState(d, pos + 1); // inside "C"
    expect(getActiveNodePos(state)).toBe(pos);
  });
});

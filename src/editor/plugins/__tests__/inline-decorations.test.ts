import { describe, it, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { DecorationSet, Decoration } from "prosemirror-view";
import { Node } from "prosemirror-model";
import { schema } from "../../schema";
import { liveRenderPlugin } from "../live-render";
import { inlineDecorationsPlugin } from "../inline-decorations";

// --- Helpers ---

function createPlugins() {
  return [liveRenderPlugin(), inlineDecorationsPlugin()];
}

function createState(doc: Node, cursorPos?: number): EditorState {
  const state = EditorState.create({
    doc,
    plugins: createPlugins(),
  });
  if (cursorPos !== undefined) {
    return state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, cursorPos))
    );
  }
  return state;
}

function getDecorations(state: EditorState): DecorationSet {
  const plugin = state.plugins.find(
    (p) => p.spec.state && (p as any).key?.startsWith("plugin$")
  );
  // The inlineDecorationsPlugin is the second plugin
  return state.plugins[1].getState(state) as DecorationSet;
}

function getDecorationSpecs(state: EditorState) {
  const decos = getDecorations(state);
  // Find all widget decorations in the document range
  const found = decos.find(0, state.doc.content.size);
  return found.map((d) => ({
    from: d.from,
    to: d.to,
    // Widget decorations have from === to
  }));
}

function countDecorations(state: EditorState): number {
  const decos = getDecorations(state);
  return decos.find(0, state.doc.content.size).length;
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

function heading(level: number, ...children: (Node | string)[]): Node {
  const nodes = children
    .filter((c) => c !== "")
    .map((c) => (typeof c === "string" ? schema.text(c) : c));
  return schema.node("heading", { level }, nodes.length > 0 ? nodes : undefined);
}

function blockquote(...children: Node[]): Node {
  return schema.node("blockquote", null, children);
}

function bold(text: string): Node {
  return schema.text(text, [schema.marks.strong.create()]);
}

function italic(text: string): Node {
  return schema.text(text, [schema.marks.em.create()]);
}

function strike(text: string): Node {
  return schema.text(text, [schema.marks.strikethrough.create()]);
}

function code(text: string): Node {
  return schema.text(text, [schema.marks.code.create()]);
}

// --- Tests ---

describe("Inline decorations: paragraph (top-level textblock)", () => {
  it("creates decorations for bold text in active paragraph", () => {
    // doc: <p>Hello <strong>Bold</strong> world</p>
    // positions: 0=p_open, 1=H, 7=B(strong), 11=space, 17=p_close
    const d = doc(p("Hello ", bold("Bold"), " world"));
    const state = createState(d, 2); // cursor inside paragraph
    const count = countDecorations(state);
    // 2 decorations: opening ** and closing **
    expect(count).toBe(2);
  });

  it("creates decorations for italic text", () => {
    const d = doc(p("Some ", italic("text"), " here"));
    const state = createState(d, 2);
    expect(countDecorations(state)).toBe(2);
  });

  it("creates decorations for strikethrough text", () => {
    const d = doc(p("Some ", strike("deleted"), " text"));
    const state = createState(d, 2);
    expect(countDecorations(state)).toBe(2);
  });

  it("creates decorations for inline code", () => {
    const d = doc(p("Use ", code("func()"), " here"));
    const state = createState(d, 2);
    expect(countDecorations(state)).toBe(2);
  });

  it("no decorations for plain text paragraph", () => {
    const d = doc(p("No marks here"));
    const state = createState(d, 2);
    expect(countDecorations(state)).toBe(0);
  });

  it("multiple marks create correct number of decorations", () => {
    // Both bold and italic → 4 decorations (2 pairs)
    const d = doc(p(bold("Bold"), " and ", italic("Italic")));
    const state = createState(d, 2);
    expect(countDecorations(state)).toBe(4);
  });
});

describe("Inline decorations: heading (top-level textblock)", () => {
  it("creates decorations for bold text in heading", () => {
    const d = doc(heading(2, "Title ", bold("Bold")));
    const state = createState(d, 2);
    expect(countDecorations(state)).toBe(2);
  });
});

describe("Inline decorations: blockquote (nested textblock)", () => {
  it("creates decorations for bold in blockquote paragraph", () => {
    const d = doc(blockquote(p("Quote ", bold("Bold"), " text")));
    const state = createState(d, 3); // inside the paragraph within blockquote
    expect(countDecorations(state)).toBe(2);
  });

  it("decoration positions are correct for blockquote content", () => {
    // doc: <blockquote><p>A <strong>B</strong> C</p></blockquote>
    // Positions:
    //   0 = blockquote open
    //   1 = paragraph open
    //   2 = "A " starts
    //   4 = "B" (strong) starts
    //   5 = "B" (strong) ends
    //   5 = " C" starts
    //   7 = paragraph close
    //   8 = blockquote close
    const d = doc(blockquote(p("A ", bold("B"), " C")));
    const state = createState(d, 3); // cursor inside

    const decos = getDecorations(state);
    const found = decos.find(0, state.doc.content.size);

    // Opening ** at position 4, closing ** at position 5
    expect(found.length).toBe(2);
    expect(found[0].from).toBe(4);
    expect(found[1].from).toBe(5);
  });
});

describe("Inline decorations: render/edit/blur cycle", () => {
  it("no decorations when cursor is outside the block (rendered mode)", () => {
    const d = doc(p("Plain text"), p("Has ", bold("Bold")));
    const state = createState(d, 2); // cursor in first paragraph
    // Bold is in second paragraph, which is NOT active
    expect(countDecorations(state)).toBe(0);
  });

  it("decorations appear when cursor enters block (edit mode)", () => {
    const d = doc(p("Plain text"), p("Has ", bold("Bold")));
    // Move cursor to second paragraph (after first paragraph)
    const secondParaPos = d.child(0).nodeSize;
    const state = createState(d, secondParaPos + 2); // inside second paragraph
    expect(countDecorations(state)).toBe(2);
  });

  it("decorations disappear when cursor leaves block (blur/re-render)", () => {
    const d = doc(p("Plain text"), p("Has ", bold("Bold")));
    const secondParaPos = d.child(0).nodeSize;

    // First: cursor in second paragraph (edit mode)
    let state = createState(d, secondParaPos + 2);
    expect(countDecorations(state)).toBe(2);

    // Then: move cursor back to first paragraph (blur)
    state = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, 2))
    );
    expect(countDecorations(state)).toBe(0);
  });

  it("repeated focus/blur cycles produce consistent decorations", () => {
    const d = doc(p("Plain"), p("Has ", bold("Bold"), " end"));
    const secondParaPos = d.child(0).nodeSize;

    let state = createState(d, 2); // start in first paragraph

    for (let i = 0; i < 5; i++) {
      // Focus second paragraph
      state = state.apply(
        state.tr.setSelection(
          TextSelection.create(state.doc, secondParaPos + 2)
        )
      );
      expect(countDecorations(state)).toBe(2);

      // Blur back to first paragraph
      state = state.apply(
        state.tr.setSelection(TextSelection.create(state.doc, 2))
      );
      expect(countDecorations(state)).toBe(0);
    }
  });
});

describe("Inline decorations: decoration positions are correct", () => {
  it("bold decoration positions match mark boundaries in paragraph", () => {
    // doc: <p><strong>Bold</strong></p>
    // Positions: 0=p_open, 1=B, 2=o, 3=l, 4=d, 5=p_close
    const d = doc(p(bold("Bold")));
    const state = createState(d, 2);

    const decos = getDecorations(state);
    const found = decos.find(0, state.doc.content.size);

    expect(found.length).toBe(2);
    // Opening ** at position 1 (start of "Bold")
    expect(found[0].from).toBe(1);
    // Closing ** at position 5 (end of "Bold")
    expect(found[1].from).toBe(5);
  });

  it("bold in middle of text has correct positions", () => {
    // doc: <p>A <strong>B</strong> C</p>
    // Positions: 0=p, 1=A, 2=space, 3=B(strong), 4=space, 5=C, 6=p_close
    const d = doc(p("A ", bold("B"), " C"));
    const state = createState(d, 1);

    const decos = getDecorations(state);
    const found = decos.find(0, state.doc.content.size);

    expect(found.length).toBe(2);
    expect(found[0].from).toBe(3); // opening ** before "B"
    expect(found[1].from).toBe(4); // closing ** after "B"
  });
});

describe("Inline decorations: no document corruption", () => {
  it("document content unchanged after decoration cycle", () => {
    const d = doc(p("Hello ", bold("World")));
    let state = createState(d, 2);

    // Verify doc content
    const textBefore = state.doc.textContent;

    // Trigger decoration rebuild by moving selection
    state = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, 4))
    );

    expect(state.doc.textContent).toBe(textBefore);
    expect(state.doc.textContent).toBe("Hello World");
  });

  it("document marks unchanged after decoration cycle", () => {
    const d = doc(p("A ", bold("B"), " C"));
    let state = createState(d, 1);

    // Check marks on the bold text node
    const para = state.doc.firstChild!;
    const boldNode = para.child(1);
    expect(boldNode.marks.length).toBe(1);
    expect(boldNode.marks[0].type.name).toBe("strong");

    // Move cursor around
    state = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, 4))
    );

    // Marks should still be intact
    const paraAfter = state.doc.firstChild!;
    const boldNodeAfter = paraAfter.child(1);
    expect(boldNodeAfter.marks.length).toBe(1);
    expect(boldNodeAfter.marks[0].type.name).toBe("strong");
  });
});

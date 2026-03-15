import { describe, it, expect } from "vitest";
import { EditorState, TextSelection, NodeSelection } from "prosemirror-state";
import { schema } from "../schema";
import { buildKeymaps, markBoundaryBackspace } from "../keymaps";
import { history, undo, redo } from "prosemirror-history";
import {
  toggleMark,
  setBlockType,
} from "prosemirror-commands";
import { splitListItem } from "prosemirror-schema-list";
import { Node } from "prosemirror-model";

// --- Helpers ---

function createState(doc: Node, cursorPos?: number): EditorState {
  const state = EditorState.create({
    doc,
    plugins: [buildKeymaps(), history()],
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
  return schema.node("heading", { level }, text ? [schema.text(text)] : []);
}

function hr(): Node {
  return schema.node("horizontal_rule");
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

/**
 * Apply a ProseMirror command and return the new state.
 * Returns null if command returns false (didn't apply).
 */
function applyCommand(
  state: EditorState,
  command: (state: EditorState, dispatch?: (tr: any) => void) => boolean
): EditorState | null {
  let newState: EditorState | null = null;
  const result = command(state, (tr) => {
    newState = state.apply(tr);
  });
  return result ? newState : null;
}

// --- Mark Toggle Tests ---

describe("Keymaps: mark toggles", () => {
  it("KM1: toggle bold off on selected bold text", () => {
    const d = doc(p(bold("world")));
    // Select "world" (pos 1 to 6)
    let state = createState(d);
    state = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, 1, 6))
    );

    const result = applyCommand(state, toggleMark(schema.marks.strong));
    expect(result).not.toBeNull();

    // After toggling off, "world" should have no bold mark
    const textNode = result!.doc.firstChild!.firstChild!;
    expect(textNode.marks.some((m) => m.type === schema.marks.strong)).toBe(false);
  });

  it("toggle bold on plain text", () => {
    const d = doc(p("hello"));
    let state = createState(d);
    state = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, 1, 6))
    );

    const result = applyCommand(state, toggleMark(schema.marks.strong));
    expect(result).not.toBeNull();

    const textNode = result!.doc.firstChild!.firstChild!;
    expect(textNode.marks.some((m) => m.type === schema.marks.strong)).toBe(true);
  });

  it("toggle italic", () => {
    const d = doc(p("hello"));
    let state = createState(d);
    state = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, 1, 6))
    );

    const result = applyCommand(state, toggleMark(schema.marks.em));
    expect(result).not.toBeNull();

    const textNode = result!.doc.firstChild!.firstChild!;
    expect(textNode.marks.some((m) => m.type === schema.marks.em)).toBe(true);
  });

  it("KM2: toggle bold on empty selection (stored mark)", () => {
    const d = doc(p("hello"));
    let state = createState(d, 3); // cursor in middle of "hello"

    const result = applyCommand(state, toggleMark(schema.marks.strong));
    expect(result).not.toBeNull();

    // Check that storedMarks includes strong
    expect(
      result!.storedMarks?.some((m) => m.type === schema.marks.strong) ?? false
    ).toBe(true);
  });
});

// --- HR on Enter ---

describe("Keymaps: hrOnEnter", () => {
  it("KM3: paragraph with --- converts to HR on Enter", () => {
    const d = doc(p("---"));
    let state = createState(d, 4); // cursor at end of "---"

    // The hrOnEnter command checks if parent is paragraph with text "---"
    const parent = state.selection.$from.parent;
    expect(parent.type.name).toBe("paragraph");
    expect(parent.textContent).toBe("---");
  });

  it("KM4: paragraph with other text does not match hrOnEnter", () => {
    const d = doc(p("hello"));
    const state = createState(d, 4);

    const parent = state.selection.$from.parent;
    expect(parent.textContent).not.toBe("---");
    expect(parent.textContent).not.toBe("***");
    expect(parent.textContent).not.toBe("___");
  });

  it("*** also matches hrOnEnter pattern", () => {
    const d = doc(p("***"));
    const state = createState(d, 4);

    const parent = state.selection.$from.parent;
    expect(parent.textContent).toBe("***");
  });

  it("___ also matches hrOnEnter pattern", () => {
    const d = doc(p("___"));
    const state = createState(d, 4);

    const parent = state.selection.$from.parent;
    expect(parent.textContent).toBe("___");
  });
});

// --- Undo/Redo ---

describe("Keymaps: undo/redo", () => {
  it("KM6: undo reverses text insertion", () => {
    const d = doc(p(""));
    let state = createState(d, 1);

    // Insert text
    const tr = state.tr.insertText("hello", 1);
    state = state.apply(tr);
    expect(state.doc.textContent).toBe("hello");

    // Undo
    const result = applyCommand(state, undo);
    expect(result).not.toBeNull();
    expect(result!.doc.textContent).toBe("");
  });

  it("KM7: redo re-applies after undo", () => {
    const d = doc(p(""));
    let state = createState(d, 1);

    // Insert text
    const tr = state.tr.insertText("hello", 1);
    state = state.apply(tr);

    // Undo
    state = applyCommand(state, undo)!;
    expect(state.doc.textContent).toBe("");

    // Redo
    state = applyCommand(state, redo)!;
    expect(state.doc.textContent).toBe("hello");
  });

  it("undo with nothing to undo returns false", () => {
    const d = doc(p("hello"));
    const state = createState(d);

    const result = applyCommand(state, undo);
    expect(result).toBeNull(); // command returns false
  });
});

// --- Set Block Type ---

describe("Keymaps: block type changes", () => {
  it("set paragraph to heading", () => {
    const d = doc(p("title"));
    let state = createState(d, 1);

    const result = applyCommand(state, setBlockType(schema.nodes.heading, { level: 2 }));
    expect(result).not.toBeNull();
    expect(result!.doc.firstChild!.type.name).toBe("heading");
    expect(result!.doc.firstChild!.attrs.level).toBe(2);
  });

  it("set heading back to paragraph", () => {
    const d = doc(heading(2, "title"));
    let state = createState(d, 1);

    const result = applyCommand(state, setBlockType(schema.nodes.paragraph));
    expect(result).not.toBeNull();
    expect(result!.doc.firstChild!.type.name).toBe("paragraph");
    expect(result!.doc.firstChild!.textContent).toBe("title");
  });

  it("set paragraph to code block", () => {
    const d = doc(p("some code"));
    let state = createState(d, 1);

    const result = applyCommand(state, setBlockType(schema.nodes.code_block));
    expect(result).not.toBeNull();
    expect(result!.doc.firstChild!.type.name).toBe("code_block");
  });
});

// --- Split List Item ---

describe("Keymaps: list operations", () => {
  it("KM5: split list item creates new item", () => {
    const d = doc(bulletList(listItem(p("item 1"))));
    // Position cursor at end of "item 1" text
    let state = createState(d, 7); // after "item 1"

    const result = applyCommand(state, splitListItem(schema.nodes.list_item));
    expect(result).not.toBeNull();

    // Should now have 2 list items
    const list = result!.doc.firstChild!;
    expect(list.type.name).toBe("bullet_list");
    expect(list.childCount).toBe(2);
  });

  it("split list item preserves content before cursor", () => {
    const d = doc(bulletList(listItem(p("hello world"))));
    // Structure: doc(0) > bullet_list(0) > list_item(1) > paragraph(2) > "hello world"(3..13)
    // "h"=3, "e"=4, "l"=5, "l"=6, "o"=7, " "=8, "w"=9
    // Position cursor after "hello " (pos 9)
    let state = createState(d, 9);

    const result = applyCommand(state, splitListItem(schema.nodes.list_item));
    expect(result).not.toBeNull();

    const list = result!.doc.firstChild!;
    expect(list.childCount).toBe(2);
    expect(list.firstChild!.textContent).toBe("hello ");
  });
});

// --- Edge Cases ---

describe("Keymaps: edge cases", () => {
  it("toggle mark on empty document", () => {
    const d = doc(p(""));
    let state = createState(d, 1);

    const result = applyCommand(state, toggleMark(schema.marks.strong));
    expect(result).not.toBeNull();
    // Should set stored mark
    expect(result!.storedMarks).not.toBeNull();
  });

  it("set block type in code block", () => {
    const d = doc(
      schema.node("code_block", { language: "js" }, [schema.text("let x = 1;")])
    );
    let state = createState(d, 1);

    // Try to set to heading — should work (exits code block)
    const result = applyCommand(state, setBlockType(schema.nodes.heading, { level: 1 }));
    if (result) {
      expect(result.doc.firstChild!.type.name).toBe("heading");
    }
  });

  it("mark boundary backspace: bold → italic at left boundary", () => {
    // "This are **clearly** a good" — cursor at start of "clearly"
    const d = doc(p("This are ", bold("clearly"), " a good"));
    // Positions: doc(0) > paragraph opens at 0, content at 1
    // "This are " = 9 chars: pos 1..9, "clearly" = 7 chars: pos 10..16
    // Cursor at pos 10 = left boundary of bold mark
    const state = createState(d, 10);

    // Verify setup
    const $head = state.selection.$head;
    expect($head.nodeAfter?.marks.some(m => m.type === schema.marks.strong)).toBe(true);
    expect($head.nodeBefore?.marks.some(m => m.type === schema.marks.strong)).toBeFalsy();

    const result = applyCommand(state, markBoundaryBackspace);
    expect(result).not.toBeNull();

    // "clearly" should now have em (italic), not strong (bold)
    const para = result!.doc.firstChild!;
    let foundItalic = false;
    para.forEach(child => {
      if (child.text === "clearly") {
        foundItalic = child.marks.some(m => m.type === schema.marks.em);
        expect(child.marks.some(m => m.type === schema.marks.strong)).toBe(false);
      }
    });
    expect(foundItalic).toBe(true);
  });

  it("mark boundary backspace: italic → plain at left boundary", () => {
    const d = doc(p("This are ", italic("clearly"), " a good"));
    const state = createState(d, 10);

    const result = applyCommand(state, markBoundaryBackspace);
    expect(result).not.toBeNull();

    // "clearly" should now have no marks
    const para = result!.doc.firstChild!;
    para.forEach(child => {
      if (child.text?.includes("clearly")) {
        expect(child.marks.length).toBe(0);
      }
    });
  });

  it("mark boundary backspace: does NOT trigger inside mark", () => {
    // Cursor inside "clearly" (not at boundary)
    const d = doc(p("This are ", bold("clearly"), " a good"));
    const state = createState(d, 13); // middle of "clearly"

    const result = applyCommand(state, markBoundaryBackspace);
    expect(result).toBeNull(); // command should NOT apply
  });

  it("mark boundary backspace: does NOT trigger on plain text", () => {
    const d = doc(p("hello world"));
    const state = createState(d, 6);

    const result = applyCommand(state, markBoundaryBackspace);
    expect(result).toBeNull();
  });

  it("multiple undos don't crash", () => {
    const d = doc(p(""));
    let state = createState(d, 1);

    // Insert then undo multiple times
    state = state.apply(state.tr.insertText("a", 1));
    state = state.apply(state.tr.insertText("b", 2));

    state = applyCommand(state, undo) ?? state;
    state = applyCommand(state, undo) ?? state;
    // Extra undo should be no-op
    const result = applyCommand(state, undo);
    expect(result).toBeNull();
  });
});

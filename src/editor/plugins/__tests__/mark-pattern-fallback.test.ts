import { describe, it, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { schema } from "../../schema";
import { markPatternFallbackPlugin } from "../mark-pattern-fallback";
import { Node } from "prosemirror-model";

function createState(doc: Node, cursorPos?: number): EditorState {
  const state = EditorState.create({
    doc,
    plugins: [markPatternFallbackPlugin()],
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

/**
 * Simulate inserting a character — triggers appendTransaction.
 */
function insertChar(state: EditorState, char: string): EditorState {
  const { from } = state.selection;
  const tr = state.tr.insertText(char, from);
  return state.apply(tr);
}

describe("markPatternFallbackPlugin", () => {
  it("converts **bold** to strong mark", () => {
    // Simulate: user typed "**bold*" and now types the last "*"
    const d = doc(p("**bold*"));
    let state = createState(d, 8); // cursor at end
    state = insertChar(state, "*"); // now: "**bold**"

    const para = state.doc.firstChild!;
    expect(para.textContent).toBe("bold");
    expect(
      para.firstChild!.marks.some((m) => m.type === schema.marks.strong)
    ).toBe(true);
  });

  it("converts **bold** after text", () => {
    const d = doc(p("This are **clearly*"));
    let state = createState(d, 20); // cursor at end
    state = insertChar(state, "*"); // now: "This are **clearly**"

    const para = state.doc.firstChild!;
    expect(para.textContent).toBe("This are clearly");

    let hasBold = false;
    para.forEach((child) => {
      if (child.text === "clearly") {
        hasBold = child.marks.some((m) => m.type === schema.marks.strong);
      }
    });
    expect(hasBold).toBe(true);
  });

  it("converts **bold** with trailing text (no data corruption)", () => {
    // This is the exact user scenario that was causing bugs:
    // "This are **clearly** a a a a good writing, let test"
    // The cursor is right after the closing "**", with trailing text after.
    const d = doc(p("This are **clearly* a a a a good writing, let test"));
    // cursor at position after "clearly*" = 1 + 19 = 20
    let state = createState(d, 20);
    state = insertChar(state, "*"); // inserts "*" at pos 20

    // After insertion, text is: "This are **clearly** a a a a good writing, let test"
    // The plugin should convert "**clearly**" to bold "clearly"
    // and leave " a a a a good writing, let test" untouched.

    const para = state.doc.firstChild!;
    expect(para.textContent).toBe("This are clearly a a a a good writing, let test");

    let hasBold = false;
    para.forEach((child) => {
      if (child.text === "clearly") {
        hasBold = child.marks.some((m) => m.type === schema.marks.strong);
      }
    });
    expect(hasBold).toBe(true);

    // Verify trailing text is NOT bold
    let trailingIsBold = false;
    para.forEach((child) => {
      if (child.text?.includes("good writing")) {
        trailingIsBold = child.marks.some((m) => m.type === schema.marks.strong);
      }
    });
    expect(trailingIsBold).toBe(false);
  });

  it("converts *italic* to em mark", () => {
    const d = doc(p("hello *world"));
    let state = createState(d, 13);
    state = insertChar(state, "*"); // now: "hello *world*"

    const para = state.doc.firstChild!;
    expect(para.textContent).toBe("hello world");

    let hasItalic = false;
    para.forEach((child) => {
      if (child.text === "world") {
        hasItalic = child.marks.some((m) => m.type === schema.marks.em);
      }
    });
    expect(hasItalic).toBe(true);
  });

  it("converts ~~strike~~ to strikethrough mark", () => {
    const d = doc(p("~~deleted~"));
    let state = createState(d, 11);
    state = insertChar(state, "~"); // now: "~~deleted~~"

    const para = state.doc.firstChild!;
    expect(para.textContent).toBe("deleted");
    expect(
      para.firstChild!.marks.some((m) => m.type === schema.marks.strikethrough)
    ).toBe(true);
  });

  it("converts `code` to code mark", () => {
    const d = doc(p("use `this"));
    let state = createState(d, 10);
    state = insertChar(state, "`"); // now: "use `this`"

    const para = state.doc.firstChild!;
    expect(para.textContent).toBe("use this");

    let hasCode = false;
    para.forEach((child) => {
      if (child.text === "this") {
        hasCode = child.marks.some((m) => m.type === schema.marks.code);
      }
    });
    expect(hasCode).toBe(true);
  });

  it("does not double-apply to already marked text", () => {
    // Text already has the mark — should not modify
    const boldText = schema.text("hello", [schema.marks.strong.create()]);
    const d = doc(p(boldText));
    let state = createState(d, 6);
    state = insertChar(state, " "); // insert a space

    // Should still be bold, no changes to the mark
    const para = state.doc.firstChild!;
    expect(para.firstChild!.marks.some((m) => m.type === schema.marks.strong)).toBe(true);
  });

  it("does not fire when there's no pattern", () => {
    const d = doc(p("hello world"));
    let state = createState(d, 12);
    state = insertChar(state, "!");

    expect(state.doc.firstChild!.textContent).toBe("hello world!");
  });

  it("does not fire when cursor is not at the closing marker", () => {
    // Pattern exists but cursor is in the middle, not at the end
    const d = doc(p("**bold** some more text"));
    // Cursor at end of paragraph (after "text"), not after "**"
    // Text is 23 chars, parentStart=1, so end pos = 24
    let state = createState(d, 24);
    state = insertChar(state, "!");

    // Should NOT convert the pattern since cursor is far from it
    const para = state.doc.firstChild!;
    expect(para.textContent).toBe("**bold** some more text!");
  });
});

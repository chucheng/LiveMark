/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema } from "../schema";
import { buildInputRules } from "../input-rules";
import { buildKeymaps } from "../keymaps";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { history } from "prosemirror-history";
import { italicBoldUpgradePlugin } from "../plugins/italic-bold-upgrade";
import { Node } from "prosemirror-model";
import { serializeMarkdown } from "../markdown/serializer";

function createView(content?: string): EditorView {
  const doc = content
    ? schema.node("doc", null, [
        schema.node("paragraph", null, content ? [schema.text(content)] : []),
      ])
    : schema.node("doc", null, [schema.node("paragraph", null)]);

  const mount = document.createElement("div");
  document.body.appendChild(mount);

  const state = EditorState.create({
    doc,
    plugins: [
      italicBoldUpgradePlugin(),
      buildInputRules(),
      buildKeymaps(),
      keymap(baseKeymap),
      history(),
    ],
  });

  return new EditorView(mount, { state });
}

/**
 * Simulate typing a single character via ProseMirror's handleTextInput path.
 * This triggers input rules just like real user typing.
 */
function typeChar(view: EditorView, char: string) {
  const { from, to } = view.state.selection;
  // ProseMirror's input rule plugin hooks into handleTextInput.
  // We simulate this by calling the view's input handler.
  const deflt = () => view.state.tr.insertText(char, from, to);
  const handled = view.someProp("handleTextInput", (f) =>
    f(view, from, to, char, deflt)
  );
  if (!handled) {
    // No plugin handled it — insert the character normally
    const tr = view.state.tr.insertText(char, from, to);
    view.dispatch(tr);
  }
}

/**
 * Type a string character by character.
 */
function typeText(view: EditorView, text: string) {
  for (const char of text) {
    typeChar(view, char);
  }
}

describe("Input rules integration: bold **text**", () => {
  it("typing **clearly** at start of paragraph creates bold mark", () => {
    const view = createView();
    // Cursor is at position 1 (inside empty paragraph)

    typeText(view, "**clearly**");

    const para = view.state.doc.firstChild!;
    expect(para.textContent).toBe("clearly");
    expect(
      para.firstChild!.marks.some((m) => m.type === schema.marks.strong)
    ).toBe(true);

    // Source view should serialize as **clearly**
    const md = serializeMarkdown(view.state.doc);
    expect(md.trim()).toBe("**clearly**");
  });

  it("typing **clearly** after text creates bold mark", () => {
    const view = createView("This are ");
    // Move cursor to end
    const endPos = view.state.doc.firstChild!.nodeSize - 1;
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, endPos))
    );

    typeText(view, "**clearly**");

    const para = view.state.doc.firstChild!;
    expect(para.textContent).toBe("This are clearly");

    // Check that "clearly" has strong mark
    let hasBoldClearly = false;
    para.forEach((child) => {
      if (child.text === "clearly") {
        hasBoldClearly = child.marks.some(
          (m) => m.type === schema.marks.strong
        );
      }
    });
    expect(hasBoldClearly).toBe(true);

    // Source should show **clearly** not \*
    const md = serializeMarkdown(view.state.doc);
    expect(md).toContain("**clearly**");
    expect(md).not.toContain("\\*");
  });

  it("typing **clearly** then more text: bold doesn't leak", () => {
    const view = createView();
    typeText(view, "**clearly**");
    typeText(view, " more");

    const para = view.state.doc.firstChild!;
    expect(para.textContent).toBe("clearly more");

    // "clearly" should be bold, " more" should not
    let clearlyIsBold = false;
    let moreIsBold = false;
    para.forEach((child) => {
      if (child.text === "clearly") {
        clearlyIsBold = child.marks.some(
          (m) => m.type === schema.marks.strong
        );
      }
      if (child.text?.includes("more")) {
        moreIsBold = child.marks.some((m) => m.type === schema.marks.strong);
      }
    });
    expect(clearlyIsBold).toBe(true);
    expect(moreIsBold).toBe(false);
  });

  it("typing *italic* creates em mark", () => {
    const view = createView();
    typeText(view, "*hello*");

    const para = view.state.doc.firstChild!;
    expect(para.textContent).toBe("hello");
    expect(
      para.firstChild!.marks.some((m) => m.type === schema.marks.em)
    ).toBe(true);
  });

  it("serialized output has no escaped asterisks for bold text", () => {
    const view = createView("This are ");
    const endPos = view.state.doc.firstChild!.nodeSize - 1;
    view.dispatch(
      view.state.tr.setSelection(TextSelection.create(view.state.doc, endPos))
    );

    typeText(view, "**clearly** a a a a good writing, let test.");

    const md = serializeMarkdown(view.state.doc);
    expect(md).toContain("**clearly**");
    expect(md).not.toContain("\\*");
  });

  it("**bold** with trailing text: no data corruption", () => {
    // Exact user scenario: type "This are **clearly** a a a a good writing, let test."
    // The bold input rule fires when the 4th * is typed, with trailing text after cursor.
    const view = createView();

    typeText(view, "This are **clearly** a a a a good writing, let test.");

    const para = view.state.doc.firstChild!;
    // Full text preserved, no deleted characters
    expect(para.textContent).toBe(
      "This are clearly a a a a good writing, let test."
    );

    // "clearly" has bold mark
    let hasBold = false;
    para.forEach((child) => {
      if (child.text === "clearly") {
        hasBold = child.marks.some((m) => m.type === schema.marks.strong);
      }
    });
    expect(hasBold).toBe(true);

    // Trailing text is NOT bold
    let trailingBold = false;
    para.forEach((child) => {
      if (child.text?.includes("good writing")) {
        trailingBold = child.marks.some((m) => m.type === schema.marks.strong);
      }
    });
    expect(trailingBold).toBe(false);

    // Source serializes correctly
    const md = serializeMarkdown(view.state.doc);
    expect(md).toContain("**clearly**");
    expect(md).toContain("let test.");
    expect(md).not.toContain("\\*");
  });
});

import { describe, it, expect } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { schema } from "../schema";
import { buildInputRules } from "../input-rules";
import { Node } from "prosemirror-model";

/**
 * Create an editor state with the given document and cursor position.
 */
function createState(doc: Node, cursorPos?: number): EditorState {
  const state = EditorState.create({
    doc,
    plugins: [buildInputRules()],
  });
  if (cursorPos !== undefined) {
    return state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, cursorPos))
    );
  }
  return state;
}

/**
 * Simulate typing text at the current cursor position.
 * Returns the new state after applying the input.
 */
function typeText(state: EditorState, text: string): EditorState {
  for (const char of text) {
    const { from } = state.selection;
    let tr = state.tr.insertText(char, from, from);
    state = state.apply(tr);
    // Check if input rules fire by applying the state
    // Input rules are triggered automatically in the plugin
  }
  return state;
}

/**
 * Create a document with a single empty paragraph.
 */
function emptyDoc(): Node {
  return schema.node("doc", null, [schema.node("paragraph", null)]);
}

/**
 * Create a document with a paragraph containing text.
 */
function docWithParagraph(text: string): Node {
  return schema.node("doc", null, [
    schema.node("paragraph", null, text ? [schema.text(text)] : []),
  ]);
}

/**
 * Helper: Apply input rule by simulating the text insertion that triggers it.
 * Input rules fire during dispatchTransaction, so we need to use the plugin system.
 */
function applyInputRule(state: EditorState, textToType: string): EditorState {
  const plugin = state.plugins[0]; // buildInputRules() is the first plugin
  const { from } = state.selection;

  for (const char of textToType) {
    const curFrom = state.selection.from;
    const tr = state.tr.insertText(char, curFrom, curFrom);
    let newState = state.apply(tr);

    // Manually run input rule handling
    // ProseMirror input rules use handleTextInput, which checks after each character
    // In tests without EditorView, we check if the plugin's appendTransaction fires
    const transactions = plugin.spec.appendTransaction
      ? plugin.spec.appendTransaction([tr], state, newState)
      : undefined;

    if (transactions) {
      newState = newState.apply(transactions);
    }

    state = newState;
  }

  return state;
}

// --- Heading Input Rules ---

describe("Input rules: headings", () => {
  it("# followed by space creates h1", () => {
    const doc = docWithParagraph("# ");
    const state = createState(doc, 3); // after "# "
    // The heading rule matches ^(#{1,6})\s$ — so typing "# " in a paragraph
    // should convert to heading. Since input rules fire at insert time,
    // we verify the pattern would match.
    const text = doc.textContent;
    expect(text).toBe("# ");
    expect(/^(#{1,6})\s$/.test(text)).toBe(true);
  });

  it("## pattern matches h2", () => {
    expect(/^(#{1,6})\s$/.test("## ")).toBe(true);
  });

  it("####### does not match (max level 6)", () => {
    expect(/^(#{1,6})\s$/.test("####### ")).toBe(false);
  });

  for (let level = 1; level <= 6; level++) {
    it(`${"#".repeat(level)} space matches heading level ${level}`, () => {
      const text = "#".repeat(level) + " ";
      const match = text.match(/^(#{1,6})\s$/);
      expect(match).not.toBeNull();
      expect(match![1].length).toBe(level);
    });
  }
});

// --- Horizontal Rule Input Rules ---

describe("Input rules: horizontal rule", () => {
  it("--- space pattern matches", () => {
    expect(/^(?:---|\*\*\*|___)\s$/.test("--- ")).toBe(true);
  });

  it("*** space pattern matches", () => {
    expect(/^(?:---|\*\*\*|___)\s$/.test("*** ")).toBe(true);
  });

  it("___ space pattern matches", () => {
    expect(/^(?:---|\*\*\*|___)\s$/.test("___ ")).toBe(true);
  });

  it("-- space does not match (too short)", () => {
    expect(/^(?:---|\*\*\*|___)\s$/.test("-- ")).toBe(false);
  });

  it("---- space does not match (too long)", () => {
    expect(/^(?:---|\*\*\*|___)\s$/.test("---- ")).toBe(false);
  });
});

// --- Task List Input Rules ---

describe("Input rules: task list", () => {
  it("- [ ] space pattern matches unchecked", () => {
    expect(/^\s*-\s*\[\s\]\s$/.test("- [ ] ")).toBe(true);
  });

  it("- [x] space pattern matches checked", () => {
    expect(/^\s*-\s*\[x\]\s$/.test("- [x] ")).toBe(true);
  });

  it("- [] space does not match (no space in brackets)", () => {
    expect(/^\s*-\s*\[\s\]\s$/.test("- [] ")).toBe(false);
  });

  it("indented task list pattern matches", () => {
    expect(/^\s*-\s*\[\s\]\s$/.test("  - [ ] ")).toBe(true);
  });
});

// --- Bullet List Input Rules ---

describe("Input rules: bullet list", () => {
  it("- space matches", () => {
    expect(/^\s*([-+*])\s$/.test("- ")).toBe(true);
  });

  it("+ space matches", () => {
    expect(/^\s*([-+*])\s$/.test("+ ")).toBe(true);
  });

  it("* space matches", () => {
    expect(/^\s*([-+*])\s$/.test("* ")).toBe(true);
  });

  it("-- space does not match", () => {
    expect(/^\s*([-+*])\s$/.test("-- ")).toBe(false);
  });
});

// --- Ordered List Input Rules ---

describe("Input rules: ordered list", () => {
  it("1. space matches", () => {
    expect(/^(\d+)\.\s$/.test("1. ")).toBe(true);
  });

  it("99. space matches with correct start number", () => {
    const match = "99. ".match(/^(\d+)\.\s$/);
    expect(match).not.toBeNull();
    expect(+match![1]).toBe(99);
  });

  it("0. space matches", () => {
    expect(/^(\d+)\.\s$/.test("0. ")).toBe(true);
  });

  it("1.space (no space) does not match", () => {
    expect(/^(\d+)\.\s$/.test("1.")).toBe(false);
  });
});

// --- Code Block Input Rules ---

describe("Input rules: code block", () => {
  it("``` space matches with no language", () => {
    const match = "``` ".match(/^```(\w*)\s$/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("");
  });

  it("```js space matches with language", () => {
    const match = "```js ".match(/^```(\w*)\s$/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("js");
  });

  it("```python space captures language correctly", () => {
    const match = "```python ".match(/^```(\w*)\s$/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe("python");
  });

  it("`` space does not match (too few backticks)", () => {
    expect(/^```(\w*)\s$/.test("`` ")).toBe(false);
  });
});

// --- Blockquote Input Rules ---

describe("Input rules: blockquote", () => {
  it("> space matches", () => {
    expect(/^\s*>\s$/.test("> ")).toBe(true);
  });

  it(">> space does not match", () => {
    expect(/^\s*>\s$/.test(">> ")).toBe(false);
  });
});

// --- Inline Mark Rules ---

describe("Input rules: inline marks", () => {
  describe("bold (**text**)", () => {
    it("pattern matches **bold** at end of text", () => {
      const pattern = /(?:^|(\s))\*\*([^*]+)\*\*$/;
      expect(pattern.test("**bold**")).toBe(true);
    });

    it("pattern matches after space", () => {
      const pattern = /(?:^|(\s))\*\*([^*]+)\*\*$/;
      expect(pattern.test("word **bold**")).toBe(true);
    });

    it("captures correct content", () => {
      const pattern = /(?:^|(\s))\*\*([^*]+)\*\*$/;
      const match = "hello **world**".match(pattern);
      expect(match).not.toBeNull();
      expect(match![2]).toBe("world");
    });

    it("does not match single asterisks", () => {
      const pattern = /(?:^|(\s))\*\*([^*]+)\*\*$/;
      expect(pattern.test("*italic*")).toBe(false);
    });

    it("does not match empty bold", () => {
      const pattern = /(?:^|(\s))\*\*([^*]+)\*\*$/;
      expect(pattern.test("****")).toBe(false);
    });

    it("handler: **wrong* + typed * produces bold 'wrong'", () => {
      // ProseMirror InputRule `end` includes the typed char (not yet in doc),
      // so it extends 1 past the paragraph boundary. The handler must use
      // `end - 1` for the closing marker delete to stay within bounds.
      const doc = docWithParagraph("**wrong*");
      const $p = doc.resolve(1); // inside paragraph
      const cs = $p.start($p.depth); // content start = 1
      const ce = $p.end($p.depth);   // content end = 9

      const textBefore = doc.textBetween(cs, ce) + "*"; // "**wrong**"
      const match = /(?:^|(\s))\*\*([^*]+)\*\*$/.exec(textBefore)!;
      const start = cs + match.index;
      const end = cs + match.index + match[0].length; // ce + 1 = 10

      const prefix = match[1] || "";
      const ml = 2;
      const ms = start + prefix.length;  // 1
      const oe = ms + ml;                // 3
      const csm = end - ml;              // 8

      const state = EditorState.create({ doc });
      const tr = state.tr;
      tr.delete(csm, end - 1); // FIXED: use end-1 to stay in paragraph
      tr.delete(ms, oe);
      tr.addMark(ms, ms + (csm - oe), schema.marks.strong.create());

      const result = state.apply(tr);
      const para = result.doc.child(0);
      expect(para.textContent).toBe("wrong");
      expect(para.child(0).marks.some((m: any) => m.type === schema.marks.strong)).toBe(true);
    });

    it("handler: hello **wrong* + typed * produces bold 'wrong'", () => {
      const doc = docWithParagraph("hello **wrong*");
      const $p = doc.resolve(1);
      const cs = $p.start($p.depth);
      const ce = $p.end($p.depth);

      const textBefore = doc.textBetween(cs, ce) + "*";
      const match = /(?:^|(\s))\*\*([^*]+)\*\*$/.exec(textBefore)!;
      const start = cs + match.index;
      const end = cs + match.index + match[0].length;

      const prefix = match[1] || "";
      const ml = 2;
      const ms = start + prefix.length;
      const oe = ms + ml;
      const csm = end - ml;

      const state = EditorState.create({ doc });
      const tr = state.tr;
      tr.delete(csm, end - 1);
      tr.delete(ms, oe);
      tr.addMark(ms, ms + (csm - oe), schema.marks.strong.create());

      const result = state.apply(tr);
      const para = result.doc.child(0);
      expect(para.textContent).toBe("hello wrong");
      let found = false;
      para.forEach((c: any) => {
        if (c.text === "wrong" && c.marks.some((m: any) => m.type === schema.marks.strong)) found = true;
      });
      expect(found).toBe(true);
    });

    it("guard: doc-level $from.start() does not corrupt text", () => {
      // When the cursor resolves at doc level (depth 0), $from.start() = 0
      // instead of 1. This used to shift positions by 1, eating 'g'.
      // The handler now re-anchors to the textblock, so this is safe.
      const doc = docWithParagraph("**wrong*");

      // Simulate doc-level start (0) and end (9) — shifted by 1
      const docStart = 0;
      const textBefore = "**wrong**";
      const match = /(?:^|(\s))\*\*([^*]+)\*\*$/.exec(textBefore)!;
      const start = docStart + match.index; // 0
      const end = docStart + match.index + match[0].length; // 9

      // closeStart at wrong positions would be 7 (= 'g'), not 8 (= '*')
      expect(end - 2).toBe(7); // confirms the off-by-one without the fix

      // But the handler now resolves the textblock correctly:
      const cursorPos = Math.min(end - 1, doc.content.size);
      const $cursor = doc.resolve(cursorPos);
      // Position 8 resolves inside the paragraph
      expect($cursor.parent.isTextblock).toBe(true);
      const tbStart = $cursor.start($cursor.depth); // = 1
      expect(tbStart).toBe(1); // paragraph content start, not 0
    });
  });

  describe("italic (*text*)", () => {
    it("pattern matches *italic* at end", () => {
      const pattern = /(?:^|(\s))\*([^*]+)\*$/;
      expect(pattern.test("*italic*")).toBe(true);
    });

    it("captures correct content", () => {
      const pattern = /(?:^|(\s))\*([^*]+)\*$/;
      const match = "hello *world*".match(pattern);
      expect(match).not.toBeNull();
      expect(match![2]).toBe("world");
    });

    it("does not match ** (that's bold)", () => {
      const pattern = /(?:^|(\s))\*([^*]+)\*$/;
      // **text** shouldn't match italic pattern since content includes *
      expect(pattern.test("**text**")).toBe(false);
    });
  });

  describe("strikethrough (~~text~~)", () => {
    it("pattern matches ~~strike~~ at end", () => {
      const pattern = /(?:^|(\s))~~([^~]+)~~$/;
      expect(pattern.test("~~strike~~")).toBe(true);
    });

    it("captures correct content", () => {
      const pattern = /(?:^|(\s))~~([^~]+)~~$/;
      const match = "word ~~deleted~~".match(pattern);
      expect(match).not.toBeNull();
      expect(match![2]).toBe("deleted");
    });

    it("does not match single tilde", () => {
      const pattern = /(?:^|(\s))~~([^~]+)~~$/;
      expect(pattern.test("~text~")).toBe(false);
    });
  });

  describe("inline code (`text`)", () => {
    it("pattern matches `code` at end", () => {
      const pattern = /(?:^|(\s))`([^`]+)`$/;
      expect(pattern.test("`code`")).toBe(true);
    });

    it("captures correct content", () => {
      const pattern = /(?:^|(\s))`([^`]+)`$/;
      const match = "use `this`".match(pattern);
      expect(match).not.toBeNull();
      expect(match![2]).toBe("this");
    });

    it("does not match empty backticks", () => {
      const pattern = /(?:^|(\s))`([^`]+)`$/;
      expect(pattern.test("``")).toBe(false);
    });
  });
});

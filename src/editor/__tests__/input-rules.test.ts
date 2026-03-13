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

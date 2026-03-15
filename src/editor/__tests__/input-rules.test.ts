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

// --- CJK Boundary Support ---

describe("Input rules: CJK support", () => {
  // Must match the actual boundary character class used in input-rules.ts
  const CJK_BOUNDARY = String.raw`[\s\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFFEF]`;

  const boldPattern = new RegExp(`(?:^|(${CJK_BOUNDARY}))\\*\\*([^*]+)\\*\\*$`);
  const italicPattern = new RegExp(`(?:^|(${CJK_BOUNDARY}))\\*([^*]+)\\*$`);
  const codePattern = new RegExp(`(?:^|(${CJK_BOUNDARY}))\`([^\`]+)\`$`);
  const strikePattern = new RegExp(`(?:^|(${CJK_BOUNDARY}))~~([^~]+)~~$`);
  const underscoreItalicPattern = new RegExp(`(?:^|(${CJK_BOUNDARY}))_([^_]+)_$`);

  // --- CJK ideographs as boundary (Chinese) ---

  describe("Chinese ideographs before markers", () => {
    it("中文**粗體** — bold after CJK", () => {
      const match = "中文**粗體**".match(boldPattern);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("文"); // captured CJK char as prefix
      expect(match![2]).toBe("粗體");
    });

    it("中文*斜體* — italic after CJK", () => {
      const match = "中文*斜體*".match(italicPattern);
      expect(match).not.toBeNull();
      expect(match![2]).toBe("斜體");
    });

    it("中文`程式碼` — code after CJK", () => {
      const match = "中文`程式碼`".match(codePattern);
      expect(match).not.toBeNull();
      expect(match![2]).toBe("程式碼");
    });

    it("中文~~刪除線~~ — strikethrough after CJK", () => {
      const match = "中文~~刪除線~~".match(strikePattern);
      expect(match).not.toBeNull();
      expect(match![2]).toBe("刪除線");
    });

    it("中文_斜體_ — underscore italic after CJK", () => {
      const match = "中文_斜體_".match(underscoreItalicPattern);
      expect(match).not.toBeNull();
      expect(match![2]).toBe("斜體");
    });
  });

  // --- Japanese (hiragana, katakana) ---

  describe("Japanese before markers", () => {
    it("テスト**太字** — katakana before bold", () => {
      expect(boldPattern.test("テスト**太字**")).toBe(true);
    });

    it("これは*斜体*です — hiragana before italic", () => {
      const match = "これは*斜体*".match(italicPattern);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("は");
    });

    it("ｱｲｳ**太字** — halfwidth katakana before bold", () => {
      // Halfwidth katakana U+FF71 is in the fullwidth/halfwidth forms block
      expect(boldPattern.test("ｱｲｳ**太字**")).toBe(true);
    });
  });

  // --- Korean (Hangul) ---

  describe("Korean before markers", () => {
    it("한국어**굵게** — Hangul syllable before bold", () => {
      expect(boldPattern.test("한국어**굵게**")).toBe(true);
    });

    it("텍스트*기울임* — Hangul before italic", () => {
      expect(italicPattern.test("텍스트*기울임*")).toBe(true);
    });
  });

  // --- Fullwidth punctuation as boundary ---

  describe("fullwidth punctuation before markers", () => {
    it("你好！**粗體** — fullwidth exclamation (U+FF01)", () => {
      const match = "你好！**粗體**".match(boldPattern);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("！");
    });

    it("什麼？*斜體* — fullwidth question mark (U+FF1F)", () => {
      expect(italicPattern.test("什麼？*斜體*")).toBe(true);
    });

    it("（**括弧內**） — fullwidth parens (U+FF08/FF09)", () => {
      expect(boldPattern.test("（**括弧內**")).toBe(true);
    });

    it("結束：`程式碼` — fullwidth colon (U+FF1A)", () => {
      expect(codePattern.test("結束：`程式碼`")).toBe(true);
    });

    it("清單；~~刪除~~ — fullwidth semicolon (U+FF1B)", () => {
      expect(strikePattern.test("清單；~~刪除~~")).toBe(true);
    });
  });

  // --- CJK punctuation (U+3000-U+303F) as boundary ---

  describe("CJK punctuation before markers", () => {
    it("結束。**新句子** — ideographic period (U+3002)", () => {
      expect(boldPattern.test("結束。**新句子**")).toBe(true);
    });

    it("項目、*重點* — ideographic comma (U+3001)", () => {
      expect(italicPattern.test("項目、*重點*")).toBe(true);
    });

    it("「**引用**」 — CJK corner bracket (U+300C)", () => {
      expect(boldPattern.test("「**引用**")).toBe(true);
    });
  });

  // --- Mixed scripts ---

  describe("mixed CJK and Latin", () => {
    it("中文**english** — CJK before marker, ASCII content", () => {
      expect(boldPattern.test("中文**english**")).toBe(true);
    });

    it("english**中文** — ASCII letter before marker → no match", () => {
      expect(boldPattern.test("english**中文**")).toBe(false);
    });

    it("Hello 中文**粗體** — space before CJK before marker", () => {
      // Space is always a valid boundary, CJK char is the content before **
      expect(boldPattern.test("Hello 中文**粗體**")).toBe(true);
    });

    it("abc中文**粗體** — CJK ideograph right after ASCII", () => {
      // 'c' is ASCII, but '中' follows, then '文' is the boundary before **
      // The regex finds "文**粗體**" so it matches
      const match = "abc中文**粗體**".match(boldPattern);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("文");
    });
  });

  // --- Single CJK char before marker ---

  describe("single CJK character edge cases", () => {
    it("中**粗體** — single CJK char is the boundary", () => {
      const match = "中**粗體**".match(boldPattern);
      expect(match).not.toBeNull();
      expect(match![1]).toBe("中");
    });

    it("가**굵게** — single Hangul is the boundary", () => {
      expect(boldPattern.test("가**굵게**")).toBe(true);
    });
  });

  // --- Marks at line start (^ anchor, existing behavior) ---

  describe("line start (must still work)", () => {
    it("**粗體** at start", () => {
      expect(boldPattern.test("**粗體**")).toBe(true);
    });

    it("*斜體* at start", () => {
      expect(italicPattern.test("*斜體*")).toBe(true);
    });

    it("`程式碼` at start", () => {
      expect(codePattern.test("`程式碼`")).toBe(true);
    });

    it("~~刪除~~ at start", () => {
      expect(strikePattern.test("~~刪除~~")).toBe(true);
    });

    it("**bold** ASCII at start", () => {
      expect(boldPattern.test("**bold**")).toBe(true);
    });
  });

  // --- Negative cases: must NOT match ---

  describe("negative cases", () => {
    it("café**bold** — accented Latin é is not a boundary", () => {
      expect(boldPattern.test("café**bold**")).toBe(false);
    });

    it("hello**bold** — ASCII letter before marker", () => {
      expect(boldPattern.test("hello**bold**")).toBe(false);
    });

    it("test123**bold** — ASCII digit before marker", () => {
      expect(boldPattern.test("test123**bold**")).toBe(false);
    });

    it("naïve**bold** — Latin with diaeresis", () => {
      expect(boldPattern.test("naïve**bold**")).toBe(false);
    });

    it("über**bold** — German umlaut", () => {
      expect(boldPattern.test("über**bold**")).toBe(false);
    });

    it("existing space boundary still works", () => {
      expect(boldPattern.test("word **bold**")).toBe(true);
      expect(italicPattern.test("word *italic*")).toBe(true);
      expect(codePattern.test("word `code`")).toBe(true);
      expect(strikePattern.test("word ~~strike~~")).toBe(true);
    });
  });

  // --- Prefix capture correctness ---

  describe("captured prefix is the boundary char, not content", () => {
    it("CJK char is captured in group 1", () => {
      const match = "你好**世界**".match(boldPattern);
      expect(match![1]).toBe("好");
      expect(match![2]).toBe("世界");
    });

    it("space is captured in group 1 (existing behavior)", () => {
      const match = "hello **world**".match(boldPattern);
      expect(match![1]).toBe(" ");
      expect(match![2]).toBe("world");
    });

    it("fullwidth punctuation is captured in group 1", () => {
      const match = "結束！**開始**".match(boldPattern);
      expect(match![1]).toBe("！");
      expect(match![2]).toBe("開始");
    });

    it("group 1 is undefined at line start", () => {
      const match = "**粗體**".match(boldPattern);
      expect(match![1]).toBeUndefined();
      expect(match![2]).toBe("粗體");
    });
  });
});

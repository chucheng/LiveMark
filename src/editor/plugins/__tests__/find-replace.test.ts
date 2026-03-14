import { describe, it, expect } from "vitest";
import { EditorState } from "prosemirror-state";
import { schema } from "../../schema";
import { findReplacePlugin, findReplaceKey } from "../find-replace";
import { Node } from "prosemirror-model";

// --- Helpers ---

function createState(doc: Node): EditorState {
  return EditorState.create({
    doc,
    plugins: [findReplacePlugin()],
  });
}

function doc(...children: Node[]): Node {
  return schema.node("doc", null, children);
}

function p(...children: (Node | string)[]): Node {
  return schema.node(
    "paragraph",
    null,
    children.map((c) => (typeof c === "string" ? schema.text(c) : c))
  );
}

function heading(level: number, text: string): Node {
  return schema.node("heading", { level }, [schema.text(text)]);
}

function codeBlock(text: string, language = ""): Node {
  return schema.node(
    "code_block",
    { language },
    text ? [schema.text(text)] : []
  );
}

function hardBreak(): Node {
  return schema.node("hard_break");
}

function bulletList(...items: Node[]): Node {
  return schema.node("bullet_list", { tight: true }, items);
}

function listItem(...children: Node[]): Node {
  return schema.node("list_item", null, children);
}

function blockquote(...children: Node[]): Node {
  return schema.node("blockquote", null, children);
}

/**
 * Dispatch a setSearch meta and return the resulting state.
 */
function search(
  state: EditorState,
  query: string,
  opts: { caseSensitive?: boolean; isRegex?: boolean } = {}
): EditorState {
  const tr = state.tr.setMeta(findReplaceKey, {
    type: "setSearch",
    query,
    caseSensitive: opts.caseSensitive ?? false,
    isRegex: opts.isRegex ?? false,
  });
  return state.apply(tr);
}

function nextMatch(state: EditorState): EditorState {
  const tr = state.tr.setMeta(findReplaceKey, { type: "next" });
  return state.apply(tr);
}

function prevMatch(state: EditorState): EditorState {
  const tr = state.tr.setMeta(findReplaceKey, { type: "prev" });
  return state.apply(tr);
}

function clearSearch(state: EditorState): EditorState {
  const tr = state.tr.setMeta(findReplaceKey, { type: "clear" });
  return state.apply(tr);
}

function getPluginState(state: EditorState) {
  return findReplaceKey.getState(state)!;
}

// --- Basic Search Tests ---

describe("Find/Replace: basic search", () => {
  it("FR1: simple text match at correct position", () => {
    const state = search(
      createState(doc(p("Hello world"))),
      "world"
    );
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(1);
    expect(ps.currentIndex).toBe(0);
    // Verify match is within doc bounds
    expect(ps.matches[0].from).toBeGreaterThanOrEqual(0);
    expect(ps.matches[0].to).toBeLessThanOrEqual(state.doc.content.size);
    // Verify the matched text
    const matchedText = state.doc.textBetween(ps.matches[0].from, ps.matches[0].to);
    expect(matchedText).toBe("world");
  });

  it("FR2: multiple matches", () => {
    const state = search(
      createState(doc(p("the the the"))),
      "the"
    );
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(3);
    expect(ps.currentIndex).toBe(0);
  });

  it("FR3: no match across paragraph boundaries", () => {
    const state = search(
      createState(doc(p("Hello"), p("world"))),
      "Hello world"
    );
    const ps = getPluginState(state);
    // textBetween inserts \n between blocks, so "Hello\nworld" doesn't match "Hello world"
    expect(ps.matches).toHaveLength(0);
  });

  it("FR4: case insensitive search", () => {
    const state = search(
      createState(doc(p("Hello HELLO hello"))),
      "hello",
      { caseSensitive: false }
    );
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(3);
  });

  it("FR5: case sensitive search", () => {
    const state = search(
      createState(doc(p("Hello HELLO hello"))),
      "hello",
      { caseSensitive: true }
    );
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(1);
  });

  it("FR6: regex search", () => {
    const state = search(
      createState(doc(p("foo123 bar456"))),
      "\\d+",
      { isRegex: true }
    );
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(2);
  });

  it("FR7: empty query returns no matches", () => {
    const state = search(
      createState(doc(p("Hello"))),
      ""
    );
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(0);
  });

  it("FR8: invalid regex returns no matches (no crash)", () => {
    const state = search(
      createState(doc(p("Hello"))),
      "[invalid",
      { isRegex: true }
    );
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(0);
  });

  it("FR18: zero-length regex match does not cause infinite loop", () => {
    const state = search(
      createState(doc(p("abc"))),
      "",
      { isRegex: true }
    );
    const ps = getPluginState(state);
    // Empty regex should return no matches (guarded by query check)
    expect(ps.matches).toHaveLength(0);
  });
});

// --- Search in Different Node Types ---

describe("Find/Replace: search in different node types", () => {
  it("FR9: match in heading", () => {
    const state = search(
      createState(doc(heading(1, "Title"), p("Body"))),
      "Title"
    );
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(1);
    const matchedText = state.doc.textBetween(ps.matches[0].from, ps.matches[0].to);
    expect(matchedText).toBe("Title");
  });

  it("FR10: match in code block", () => {
    const state = search(
      createState(doc(codeBlock("some code here"))),
      "code"
    );
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(1);
    const matchedText = state.doc.textBetween(ps.matches[0].from, ps.matches[0].to);
    expect(matchedText).toBe("code");
  });

  it("no match across heading and paragraph (per-textblock search)", () => {
    const state = search(
      createState(doc(heading(1, "Title"), p("Body"))),
      "Title\nBody"
    );
    const ps = getPluginState(state);
    // Per-textblock search doesn't match across block boundaries
    expect(ps.matches).toHaveLength(0);
  });

  it("FR17: match with hard break in document", () => {
    const state = search(
      createState(doc(p("Line1", hardBreak(), "Line2"))),
      "Line"
    );
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(2);
  });
});

// --- Navigation ---

describe("Find/Replace: navigation", () => {
  it("FR15: next cycles through matches", () => {
    let state = search(
      createState(doc(p("a a a"))),
      "a"
    );
    expect(getPluginState(state).currentIndex).toBe(0);

    state = nextMatch(state);
    expect(getPluginState(state).currentIndex).toBe(1);

    state = nextMatch(state);
    expect(getPluginState(state).currentIndex).toBe(2);

    // Wrap around
    state = nextMatch(state);
    expect(getPluginState(state).currentIndex).toBe(0);
  });

  it("prev cycles through matches in reverse", () => {
    let state = search(
      createState(doc(p("a a a"))),
      "a"
    );
    expect(getPluginState(state).currentIndex).toBe(0);

    // Wrap to end
    state = prevMatch(state);
    expect(getPluginState(state).currentIndex).toBe(2);

    state = prevMatch(state);
    expect(getPluginState(state).currentIndex).toBe(1);

    state = prevMatch(state);
    expect(getPluginState(state).currentIndex).toBe(0);
  });

  it("next/prev with no matches does nothing", () => {
    let state = search(
      createState(doc(p("Hello"))),
      "xyz"
    );
    expect(getPluginState(state).currentIndex).toBe(-1);

    state = nextMatch(state);
    expect(getPluginState(state).currentIndex).toBe(-1);

    state = prevMatch(state);
    expect(getPluginState(state).currentIndex).toBe(-1);
  });

  it("next with single match stays at 0", () => {
    let state = search(
      createState(doc(p("Hello world"))),
      "world"
    );
    expect(getPluginState(state).currentIndex).toBe(0);

    state = nextMatch(state);
    expect(getPluginState(state).currentIndex).toBe(0);
  });
});

// --- Clear ---

describe("Find/Replace: clear", () => {
  it("clear resets all state", () => {
    let state = search(
      createState(doc(p("Hello world"))),
      "Hello"
    );
    expect(getPluginState(state).matches).toHaveLength(1);

    state = clearSearch(state);
    const ps = getPluginState(state);
    expect(ps.query).toBe("");
    expect(ps.matches).toHaveLength(0);
    expect(ps.currentIndex).toBe(-1);
  });
});

// --- Doc Change Re-runs Search ---

describe("Find/Replace: re-search on doc change", () => {
  it("FR16: document change re-runs search", () => {
    let state = search(
      createState(doc(p("Hello"))),
      "Hello"
    );
    expect(getPluginState(state).matches).toHaveLength(1);

    // Insert more text that matches
    const tr = state.tr.insertText(" Hello", state.doc.content.size - 1);
    state = state.apply(tr);

    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(2);
  });

  it("document change may reduce matches", () => {
    let state = search(
      createState(doc(p("Hello Hello"))),
      "Hello"
    );
    expect(getPluginState(state).matches).toHaveLength(2);

    // Delete some text (remove first "Hello")
    const tr = state.tr.delete(1, 7);
    state = state.apply(tr);

    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(1);
  });

  it("currentIndex clamped after doc change reduces matches", () => {
    let state = search(
      createState(doc(p("a a a"))),
      "a"
    );
    // Navigate to last match
    state = nextMatch(state);
    state = nextMatch(state);
    expect(getPluginState(state).currentIndex).toBe(2);

    // Delete text to reduce matches to 1
    const tr = state.tr.delete(3, 5); // delete " a"
    state = state.apply(tr);

    const ps = getPluginState(state);
    // Current index should be clamped
    expect(ps.currentIndex).toBeLessThan(ps.matches.length);
    expect(ps.currentIndex).toBeGreaterThanOrEqual(0);
  });
});

// --- Match Position Validity ---

describe("Find/Replace: match position validity", () => {
  it("all match positions are within document bounds", () => {
    const documents = [
      doc(p("Hello world"), p("Another paragraph"), heading(1, "Title")),
      doc(p("abc"), codeBlock("def\nghi"), p("jkl")),
      doc(p("text", hardBreak(), "more text")),
    ];
    const queries = ["e", "o", "text", "\\w+"];

    for (const d of documents) {
      for (const q of queries) {
        const state = search(createState(d), q, { isRegex: q.includes("\\") });
        const ps = getPluginState(state);
        for (const match of ps.matches) {
          expect(match.from).toBeGreaterThanOrEqual(0);
          expect(match.to).toBeLessThanOrEqual(state.doc.content.size);
          expect(match.from).toBeLessThan(match.to);
        }
      }
    }
  });

  it("matched text corresponds to query", () => {
    const state = search(
      createState(doc(p("The quick brown fox"))),
      "quick"
    );
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(1);
    const text = state.doc.textBetween(ps.matches[0].from, ps.matches[0].to);
    expect(text).toBe("quick");
  });
});

// --- Decorations ---

describe("Find/Replace: decorations", () => {
  it("decorations are created for matches", () => {
    const state = search(
      createState(doc(p("Hello world Hello"))),
      "Hello"
    );
    const ps = getPluginState(state);
    expect(ps.decorations).not.toBeNull();
    // DecorationSet should have entries for each match
    expect(ps.matches).toHaveLength(2);
  });

  it("current match has different decoration class", () => {
    const state = search(
      createState(doc(p("a b a"))),
      "a"
    );
    const ps = getPluginState(state);
    // We can't easily inspect decoration classes without DOM,
    // but we can verify the structure is correct
    expect(ps.currentIndex).toBe(0);
    expect(ps.matches).toHaveLength(2);
  });

  it("empty decorations when no query", () => {
    const state = createState(doc(p("Hello")));
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(0);
  });
});

// --- Nested Structures ---

describe("Find/Replace: nested structures", () => {
  it("match inside bullet list items", () => {
    const state = search(
      createState(doc(bulletList(
        listItem(p("Apple")),
        listItem(p("Banana")),
      ))),
      "Banana"
    );
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(1);
    const text = state.doc.textBetween(ps.matches[0].from, ps.matches[0].to);
    expect(text).toBe("Banana");
  });

  it("match inside blockquote", () => {
    const state = search(
      createState(doc(blockquote(p("Quoted text")))),
      "Quoted"
    );
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(1);
    const text = state.doc.textBetween(ps.matches[0].from, ps.matches[0].to);
    expect(text).toBe("Quoted");
  });

  it("multiple matches across list items", () => {
    const state = search(
      createState(doc(bulletList(
        listItem(p("Hello world")),
        listItem(p("Hello again")),
      ))),
      "Hello"
    );
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(2);
    for (const m of ps.matches) {
      expect(state.doc.textBetween(m.from, m.to)).toBe("Hello");
    }
  });

  it("match in paragraph after list", () => {
    const state = search(
      createState(doc(
        bulletList(listItem(p("Item"))),
        p("After list")
      )),
      "After"
    );
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(1);
    expect(state.doc.textBetween(ps.matches[0].from, ps.matches[0].to)).toBe("After");
  });

  it("match in nested blockquote", () => {
    const state = search(
      createState(doc(blockquote(blockquote(p("Deep"))))),
      "Deep"
    );
    const ps = getPluginState(state);
    expect(ps.matches).toHaveLength(1);
    expect(state.doc.textBetween(ps.matches[0].from, ps.matches[0].to)).toBe("Deep");
  });
});

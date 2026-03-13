import { describe, it, expect } from "vitest";
import { parseMarkdown } from "../parser";
import { serializeMarkdown } from "../serializer";
import { schema } from "../../schema";
import { Node } from "prosemirror-model";

// --- Helpers ---

function roundTrip(md: string): string {
  const doc = parseMarkdown(md);
  if (!doc) throw new Error("parseMarkdown returned null");
  return serializeMarkdown(doc);
}

function expectRoundTrip(md: string) {
  expect(roundTrip(md).trim()).toBe(md.trim());
}

function expectStructuralRoundTrip(md: string) {
  const doc1 = parseMarkdown(md);
  if (!doc1) throw new Error("parseMarkdown returned null");
  const serialized = serializeMarkdown(doc1);
  const doc2 = parseMarkdown(serialized);
  if (!doc2) throw new Error("second parseMarkdown returned null");
  expect(doc2.toJSON()).toEqual(doc1.toJSON());
}

function doc(...children: Node[]): Node {
  return schema.node("doc", null, children);
}

function heading(level: number, ...children: (Node | string)[]): Node {
  return schema.node(
    "heading",
    { level },
    children.map((c) => (typeof c === "string" ? schema.text(c) : c))
  );
}

// --- Table Edge Cases ---

describe("Serializer: table edge cases", () => {
  it("empty table cells round-trip structurally", () => {
    expectStructuralRoundTrip("| | |\n| --- | --- |\n| | |");
  });

  it("table cell with bold", () => {
    expectStructuralRoundTrip(
      "| **bold** | text |\n| --- | --- |\n| a | b |"
    );
  });

  it("table cell with link", () => {
    expectStructuralRoundTrip(
      "| [link](https://example.com) | cell |\n| --- | --- |\n| a | b |"
    );
  });

  it("table cell with escaped pipe", () => {
    const md = "| a \\| b | c |\n| --- | --- |\n| d | e |";
    const doc1 = parseMarkdown(md);
    if (!doc1) throw new Error("parseMarkdown returned null");
    const serialized = serializeMarkdown(doc1);
    const doc2 = parseMarkdown(serialized);
    if (!doc2) throw new Error("second parseMarkdown returned null");
    expect(doc2.toJSON()).toEqual(doc1.toJSON());
  });

  it("single-column table", () => {
    expectStructuralRoundTrip("| header |\n| --- |\n| cell |");
  });

  it("table with inline code in cell", () => {
    expectStructuralRoundTrip(
      "| `code` | text |\n| --- | --- |\n| a | b |"
    );
  });

  it("table with strikethrough in cell", () => {
    expectStructuralRoundTrip(
      "| ~~struck~~ | text |\n| --- | --- |\n| a | b |"
    );
  });

  it("table with many rows", () => {
    const rows = Array.from({ length: 10 }, (_, i) => `| r${i}a | r${i}b |`);
    const md = "| H1 | H2 |\n| --- | --- |\n" + rows.join("\n");
    expectStructuralRoundTrip(md);
  });
});

// --- Code Block Edge Cases ---

describe("Serializer: code block edge cases", () => {
  it("code block with backticks in content", () => {
    expectRoundTrip("```\nsome ``` content\n```");
  });

  it("code block without language", () => {
    expectRoundTrip("```\ncode\n```");
  });

  it("code block with empty content", () => {
    // Serializer produces "```\n```" (no extra newline) for empty code blocks.
    // This is correct behavior — ensureNewLine() doesn't add blank line.
    // Use structural comparison since string differs slightly.
    expectStructuralRoundTrip("```\n\n```");
  });

  it("code block preserves indentation", () => {
    expectRoundTrip("```\n  indented\n    more\n```");
  });

  it("code block with language", () => {
    expectRoundTrip("```python\nprint('hello')\n```");
  });

  it("code block with special characters", () => {
    expectRoundTrip("```\n<div class=\"test\">&amp;</div>\n```");
  });
});

// --- Nested Structure Edge Cases ---

describe("Serializer: nested structures", () => {
  it("nested blockquote structural fidelity", () => {
    expectStructuralRoundTrip("> outer\n>\n> > inner");
  });

  it("blockquote with list", () => {
    expectStructuralRoundTrip("> - item 1\n> - item 2");
  });

  it("blockquote with heading", () => {
    expectStructuralRoundTrip("> ## Heading inside quote");
  });

  it("deeply nested list", () => {
    expectStructuralRoundTrip(
      "- level 1\n\n  - level 2\n\n    - level 3"
    );
  });

  it("list item with multiple paragraphs", () => {
    expectStructuralRoundTrip("- First paragraph\n\n  Second paragraph");
  });
});

// --- Ordered List Edge Cases ---

describe("Serializer: ordered list edge cases", () => {
  it("ordered list starting at 0", () => {
    expectStructuralRoundTrip("0. Zero\n1. One");
  });

  it("ordered list starting at large number", () => {
    expectStructuralRoundTrip("99. Ninety-nine\n100. One hundred");
  });

  it("single-item ordered list", () => {
    expectStructuralRoundTrip("1. Only item");
  });
});

// --- Image Edge Cases ---

describe("Serializer: image edge cases", () => {
  it("image with spaces in title", () => {
    expectRoundTrip('![alt](https://example.com/img.png "title with spaces")');
  });

  it("image with empty alt", () => {
    expectRoundTrip("![](https://example.com/img.png)");
  });

  it("image with title", () => {
    expectRoundTrip('![alt](url "title")');
  });

  it("image with no alt and no title", () => {
    expectRoundTrip("![](url)");
  });
});

// --- Hard Break Edge Cases ---

describe("Serializer: hard breaks", () => {
  it("multiple consecutive hard breaks", () => {
    expectRoundTrip("a  \nb  \nc");
  });

  it("hard break preserves surrounding text", () => {
    expectRoundTrip("before  \nafter");
  });

  it("hard break with marks", () => {
    expectStructuralRoundTrip("**bold**  \n*italic*");
  });
});

// --- Inline Mark Edge Cases ---

describe("Serializer: inline mark edge cases", () => {
  it("inline code with backticks uses double backticks", () => {
    const md = "Use `` ` `` here";
    expectStructuralRoundTrip(md);
  });

  it("strikethrough with nested bold", () => {
    expectStructuralRoundTrip("~~deleted **nested bold**~~");
  });

  it("link with title", () => {
    expectRoundTrip('[text](https://example.com "Title")');
  });

  it("adjacent inline marks separated by space", () => {
    expectStructuralRoundTrip("**bold** *italic*");
  });

  it("bold and italic combined", () => {
    expectStructuralRoundTrip("***bold italic***");
  });

  it("inline code preserves special characters", () => {
    expectRoundTrip("This is `<div>` code.");
  });

  it("link inside bold", () => {
    expectStructuralRoundTrip("**[link](url)**");
  });

  it("code span with multiple backticks", () => {
    const md = "`` `code` ``";
    expectStructuralRoundTrip(md);
  });
});

// --- Heading Edge Cases ---

describe("Serializer: heading edge cases", () => {
  it("empty heading preserves structure after serialization", () => {
    const d = doc(heading(1));
    const serialized = serializeMarkdown(d);
    expect(serialized.trim()).toContain("#");
    // After reparsing, should produce same heading structure
    expectStructuralRoundTrip(serialized.trim());
  });

  it("heading with inline marks", () => {
    expectRoundTrip("# **Bold** heading");
  });

  it("heading with code", () => {
    expectRoundTrip("## `code` in heading");
  });

  it("heading with link", () => {
    expectRoundTrip("### [link](url) in heading");
  });
});

// --- Task List Edge Cases ---

describe("Serializer: task list edge cases", () => {
  it("single task list item", () => {
    expectStructuralRoundTrip("- [ ] only item");
  });

  it("mixed checked and unchecked", () => {
    expectStructuralRoundTrip("- [x] done\n- [ ] todo\n- [x] also done");
  });

  it("task list with bold text", () => {
    expectStructuralRoundTrip("- [ ] **important** task");
  });

  it("task list with link", () => {
    expectStructuralRoundTrip("- [x] [link](url) task");
  });

  it("task list with code", () => {
    expectStructuralRoundTrip("- [ ] `code` task");
  });
});

// --- Full Document Edge Cases ---

describe("Serializer: complex documents", () => {
  it("document with every node type", () => {
    const md = `# Heading 1

Paragraph with **bold**, *italic*, \`code\`, and ~~strike~~.

- Bullet 1
- Bullet 2

1. Ordered 1
2. Ordered 2

- [ ] Task unchecked
- [x] Task checked

> Blockquote

\`\`\`js
const x = 1;
\`\`\`

---

| A | B |
| --- | --- |
| 1 | 2 |

![img](url)

[link](url "title")`;
    expectStructuralRoundTrip(md);
  });

  it("document with only horizontal rule", () => {
    expectRoundTrip("---");
  });

  it("multiple horizontal rules", () => {
    expectStructuralRoundTrip("---\n\n---\n\n---");
  });

  it("alternating headings and paragraphs", () => {
    expectRoundTrip("# H1\n\nPara 1\n\n## H2\n\nPara 2\n\n### H3\n\nPara 3");
  });
});

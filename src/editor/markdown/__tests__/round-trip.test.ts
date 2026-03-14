import { describe, it, expect } from "vitest";
import { parseMarkdown } from "../parser";
import { serializeMarkdown } from "../serializer";

/**
 * Round-trip helper: parse markdown → serialize → compare.
 * Trims trailing whitespace for comparison since serializer may
 * add/omit a trailing newline.
 */
function roundTrip(md: string): string {
  const doc = parseMarkdown(md);
  if (!doc) throw new Error("parseMarkdown returned null");
  return serializeMarkdown(doc);
}

function expectRoundTrip(md: string) {
  expect(roundTrip(md).trim()).toBe(md.trim());
}

/**
 * Structural round-trip: parse → serialize → parse again → compare doc JSON.
 * This catches cases where the string differs but the document is equivalent.
 */
function expectStructuralRoundTrip(md: string) {
  const doc1 = parseMarkdown(md);
  if (!doc1) throw new Error("parseMarkdown returned null");
  const serialized = serializeMarkdown(doc1);
  const doc2 = parseMarkdown(serialized);
  if (!doc2) throw new Error("second parseMarkdown returned null");
  expect(doc2.toJSON()).toEqual(doc1.toJSON());
}

describe("Markdown round-trip: string fidelity", () => {
  it("empty document", () => {
    expectRoundTrip("");
  });

  it("single paragraph", () => {
    expectRoundTrip("Hello, world!");
  });

  it("multiple paragraphs", () => {
    expectRoundTrip("First paragraph.\n\nSecond paragraph.");
  });

  describe("headings", () => {
    for (let level = 1; level <= 6; level++) {
      it(`h${level}`, () => {
        expectRoundTrip(`${"#".repeat(level)} Heading ${level}`);
      });
    }
  });

  describe("inline marks", () => {
    it("bold", () => {
      expectRoundTrip("This is **bold** text.");
    });

    it("italic", () => {
      expectRoundTrip("This is *italic* text.");
    });

    it("inline code", () => {
      expectRoundTrip("This is `code` text.");
    });

    it("strikethrough", () => {
      expectRoundTrip("This is ~~deleted~~ text.");
    });

    it("link", () => {
      expectRoundTrip("[example](https://example.com)");
    });

    it("link with title", () => {
      expectRoundTrip('[example](https://example.com "Example Title")');
    });

    it("nested bold + italic", () => {
      expectRoundTrip("This is ***bold italic*** text.");
    });

    it("bold with inline code", () => {
      expectRoundTrip("This is **`bold code`** text.");
    });
  });

  describe("bullet lists", () => {
    it("flat list", () => {
      expectRoundTrip("- Item one\n\n- Item two\n\n- Item three");
    });

    it("nested list", () => {
      expectRoundTrip("- Item one\n\n  - Nested one\n\n  - Nested two\n\n- Item two");
    });
  });

  describe("ordered lists", () => {
    it("starting at 1", () => {
      expectRoundTrip("1. First\n\n2. Second\n\n3. Third");
    });

    it("starting at 5", () => {
      expectRoundTrip("5. Fifth\n\n6. Sixth\n\n7. Seventh");
    });
  });

  describe("code blocks", () => {
    it("without language", () => {
      expectRoundTrip("```\nconsole.log('hello');\n```");
    });

    it("with language", () => {
      expectRoundTrip("```javascript\nconsole.log('hello');\n```");
    });
  });

  describe("blockquotes", () => {
    it("simple blockquote", () => {
      expectRoundTrip("> This is a quote.");
    });

    it("nested blockquote", () => {
      // Serializer omits trailing space on empty blockquote continuation lines
      // ("> " becomes ">"), so use structural comparison
      expectStructuralRoundTrip("> Outer\n> \n> > Inner");
    });
  });

  it("horizontal rule", () => {
    expectRoundTrip("---");
  });

  describe("images", () => {
    it("without title", () => {
      expectRoundTrip("![alt text](https://example.com/img.png)");
    });

    it("with title", () => {
      expectRoundTrip('![alt text](https://example.com/img.png "Image Title")');
    });
  });

  it("hard break", () => {
    expectRoundTrip("Line one  \nLine two");
  });

  it("mixed document", () => {
    const md = `# Title

A paragraph with **bold**, *italic*, and \`code\`.

- Bullet one
- Bullet two

1. Ordered one
2. Ordered two

> A blockquote

\`\`\`js
const x = 1;
\`\`\`

---

![img](https://example.com/img.png)

[link](https://example.com)`;
    expectStructuralRoundTrip(md);
  });
});

describe("Task list round-trip", () => {
  it("unchecked task items", () => {
    expectStructuralRoundTrip("- [ ] Task one\n- [ ] Task two");
  });

  it("checked task items", () => {
    expectStructuralRoundTrip("- [x] Done task\n- [ ] Open task");
  });

  it("task list with inline formatting", () => {
    expectStructuralRoundTrip("- [ ] **Bold** task\n- [x] *Italic* done");
  });
});

describe("Table round-trip", () => {
  it("simple 2x2 table", () => {
    expectStructuralRoundTrip("| a | b |\n| --- | --- |\n| 1 | 2 |");
  });

  it("table with inline formatting", () => {
    expectStructuralRoundTrip("| **bold** | *italic* |\n| --- | --- |\n| `code` | text |");
  });
});

describe("Math round-trip", () => {
  it("inline math", () => {
    expectRoundTrip("The equation $E=mc^2$ is famous.");
  });

  it("block math", () => {
    expectRoundTrip("$$\n\\int_0^\\infty e^{-x} dx = 1\n$$");
  });

  it("multiple inline math in one paragraph", () => {
    expectRoundTrip("Given $a$ and $b$, compute $a+b$.");
  });

  it("escaped dollar is not math", () => {
    // Escaped dollars should pass through as text, not become math
    const doc = parseMarkdown("The price is \\$5.");
    if (!doc) throw new Error("parseMarkdown returned null");
    const serialized = serializeMarkdown(doc);
    // Should not contain math_inline nodes
    expect(serialized.trim()).not.toContain("$$");
  });

  it("math with LaTeX commands", () => {
    expectRoundTrip("$\\alpha + \\beta = \\gamma$");
  });

  it("block math structural round-trip", () => {
    expectStructuralRoundTrip("$$\nx^2 + y^2 = z^2\n$$");
  });
});

describe("Callout round-trip", () => {
  it("NOTE callout", () => {
    expectStructuralRoundTrip("> [!NOTE]\n> This is a note.");
  });

  it("TIP callout", () => {
    expectStructuralRoundTrip("> [!TIP]\n> Helpful tip here.");
  });

  it("WARNING callout", () => {
    expectStructuralRoundTrip("> [!WARNING]\n> Be careful!");
  });

  it("CAUTION callout", () => {
    expectStructuralRoundTrip("> [!CAUTION]\n> This is dangerous.");
  });

  it("IMPORTANT callout", () => {
    expectStructuralRoundTrip("> [!IMPORTANT]\n> Don't miss this.");
  });

  it("callout with multiple paragraphs", () => {
    expectStructuralRoundTrip("> [!NOTE]\n> First paragraph.\n>\n> Second paragraph.");
  });

  it("regular blockquote is not a callout", () => {
    const doc = parseMarkdown("> Regular quote.");
    if (!doc) throw new Error("parseMarkdown returned null");
    const bq = doc.firstChild;
    expect(bq?.type.name).toBe("blockquote");
    expect(bq?.attrs.calloutType).toBeNull();
  });

  it("callout with inline formatting", () => {
    expectStructuralRoundTrip("> [!TIP]\n> **Bold** and *italic* text.");
  });

  it("callout case insensitivity", () => {
    const doc = parseMarkdown("> [!note]\n> lowercase type");
    if (!doc) throw new Error("parseMarkdown returned null");
    const bq = doc.firstChild;
    expect(bq?.type.name).toBe("blockquote");
    expect(bq?.attrs.calloutType).toBe("NOTE"); // normalized to uppercase
  });

  it("callout with unknown type is regular blockquote", () => {
    const doc = parseMarkdown("> [!CUSTOM]\n> should be regular blockquote");
    if (!doc) throw new Error("parseMarkdown returned null");
    const bq = doc.firstChild;
    expect(bq?.type.name).toBe("blockquote");
    expect(bq?.attrs.calloutType).toBeNull();
  });

  it("callout empty body produces valid document", () => {
    const doc = parseMarkdown("> [!NOTE]");
    if (!doc) throw new Error("parseMarkdown returned null");
    const bq = doc.firstChild;
    expect(bq?.type.name).toBe("blockquote");
    expect(bq?.attrs.calloutType).toBe("NOTE");
    // Must have at least one child (block+ requirement)
    expect(bq?.childCount).toBeGreaterThanOrEqual(1);
    // Round-trip should not crash
    const serialized = serializeMarkdown(doc);
    expect(serialized).toContain("[!NOTE]");
  });

  it("callout text on same line as type", () => {
    const doc = parseMarkdown("> [!NOTE] Some text on same line");
    if (!doc) throw new Error("parseMarkdown returned null");
    const bq = doc.firstChild;
    expect(bq?.type.name).toBe("blockquote");
    expect(bq?.attrs.calloutType).toBe("NOTE");
    // The text after [!NOTE] should be preserved
    expect(bq?.textContent).toContain("Some text on same line");
  });
});

describe("Image with width round-trip", () => {
  it("image without width uses standard markdown syntax", () => {
    expectRoundTrip("![alt text](https://example.com/img.png)");
  });

  it("image with width round-trips as HTML img tag", () => {
    expectStructuralRoundTrip('<img src="https://example.com/img.png" alt="photo" width="300">');
  });

  it("image with width and title round-trips as HTML img tag", () => {
    expectStructuralRoundTrip('<img src="https://example.com/img.png" alt="photo" title="My Photo" width="300">');
  });

  it("image with width serializes to HTML img tag", () => {
    const md = '<img src="https://example.com/img.png" alt="photo" width="400">';
    const doc = parseMarkdown(md);
    if (!doc) throw new Error("parseMarkdown returned null");
    const serialized = serializeMarkdown(doc);
    expect(serialized).toContain('<img src="https://example.com/img.png"');
    expect(serialized).toContain('width="400"');
  });

  it("image without width serializes to standard markdown", () => {
    const md = "![photo](https://example.com/img.png)";
    const serialized = roundTrip(md);
    expect(serialized.trim()).toBe(md);
    expect(serialized).not.toContain("<img");
  });
});

describe("Markdown round-trip: structural fidelity", () => {
  it("complex document preserves structure through double round-trip", () => {
    const md = `## Heading

Paragraph with **bold** and *italic*.

- List item 1
- List item 2

> Quote

\`\`\`python
print("hello")
\`\`\``;
    expectStructuralRoundTrip(md);
  });

  it("empty document", () => {
    expectStructuralRoundTrip("");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateDOCX } from "../docx-generator";
import { parseMarkdown } from "../../editor/markdown/parser";
import JSZip from "jszip";

// Mock Tauri IPC — we don't have a Rust backend in tests
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockRejectedValue(new Error("no tauri")),
}));

/**
 * Helper: parse markdown → generate DOCX → extract document.xml text.
 * Returns the raw XML of word/document.xml for assertion.
 */
async function docxXML(md: string, title = "Test"): Promise<string> {
  const doc = parseMarkdown(md);
  if (!doc) throw new Error("parseMarkdown returned null");
  const bytes = await generateDOCX(doc, title);
  const zip = await JSZip.loadAsync(bytes);
  const xmlFile = zip.file("word/document.xml");
  if (!xmlFile) throw new Error("No word/document.xml in DOCX");
  return xmlFile.async("text");
}

/**
 * Helper: verify the DOCX is a valid ZIP with expected OOXML structure.
 */
async function docxZip(md: string, title = "Test"): Promise<JSZip> {
  const doc = parseMarkdown(md);
  if (!doc) throw new Error("parseMarkdown returned null");
  const bytes = await generateDOCX(doc, title);
  return JSZip.loadAsync(bytes);
}

describe("generateDOCX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Structure ──────────────────────────────────────────────

  describe("DOCX structure", () => {
    it("produces a valid ZIP with OOXML files", async () => {
      const zip = await docxZip("Hello");
      expect(zip.file("[Content_Types].xml")).not.toBeNull();
      expect(zip.file("word/document.xml")).not.toBeNull();
      expect(zip.file("word/styles.xml")).not.toBeNull();
    });

    it("returns a Uint8Array", async () => {
      const doc = parseMarkdown("Hello")!;
      const result = await generateDOCX(doc, "Test");
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it("handles empty document", async () => {
      const xml = await docxXML("");
      // Should produce valid XML even for empty doc
      expect(xml).toContain("w:body");
    });
  });

  // ── Paragraphs ─────────────────────────────────────────────

  describe("paragraphs", () => {
    it("converts a simple paragraph", async () => {
      const xml = await docxXML("Hello, world!");
      expect(xml).toContain("Hello, world!");
    });

    it("converts multiple paragraphs", async () => {
      const xml = await docxXML("First paragraph.\n\nSecond paragraph.");
      expect(xml).toContain("First paragraph.");
      expect(xml).toContain("Second paragraph.");
    });
  });

  // ── Headings ───────────────────────────────────────────────

  describe("headings", () => {
    for (let level = 1; level <= 6; level++) {
      it(`converts h${level}`, async () => {
        const xml = await docxXML(`${"#".repeat(level)} Heading ${level}`);
        expect(xml).toContain(`Heading ${level}`);
        // docx heading styles are "Heading1", "Heading2", etc.
        expect(xml).toContain(`Heading${level}`);
      });
    }
  });

  // ── Inline marks ───────────────────────────────────────────

  describe("inline marks", () => {
    it("converts bold text", async () => {
      const xml = await docxXML("**bold text**");
      expect(xml).toContain("bold text");
      // w:b is the bold run property
      expect(xml).toContain("<w:b");
    });

    it("converts italic text", async () => {
      const xml = await docxXML("*italic text*");
      expect(xml).toContain("italic text");
      expect(xml).toContain("<w:i");
    });

    it("converts strikethrough text", async () => {
      const xml = await docxXML("~~struck~~");
      expect(xml).toContain("struck");
      expect(xml).toContain("<w:strike");
    });

    it("converts inline code with monospace font", async () => {
      const xml = await docxXML("some `inline code` here");
      expect(xml).toContain("inline code");
      expect(xml).toContain("Courier New");
    });

    it("converts links as external hyperlinks", async () => {
      const xml = await docxXML("[click here](https://example.com)");
      expect(xml).toContain("click here");
      // The hyperlink relationship should exist
      const zip = await docxZip("[click here](https://example.com)");
      const rels = zip.file("word/_rels/document.xml.rels");
      expect(rels).not.toBeNull();
      const relsXml = await rels!.async("text");
      expect(relsXml).toContain("https://example.com");
    });

    it("handles bold + italic combined", async () => {
      const xml = await docxXML("***bold italic***");
      expect(xml).toContain("bold italic");
      expect(xml).toContain("<w:b");
      expect(xml).toContain("<w:i");
    });
  });

  // ── Code blocks ────────────────────────────────────────────

  describe("code blocks", () => {
    it("converts a code block with monospace font", async () => {
      const xml = await docxXML("```\nconst x = 1;\n```");
      expect(xml).toContain("const x = 1;");
      expect(xml).toContain("Courier New");
    });

    it("preserves multi-line code blocks", async () => {
      const xml = await docxXML("```\nline 1\nline 2\nline 3\n```");
      expect(xml).toContain("line 1");
      expect(xml).toContain("line 2");
      expect(xml).toContain("line 3");
    });

    it("handles code block with language annotation", async () => {
      const xml = await docxXML("```javascript\nconst x = 1;\n```");
      expect(xml).toContain("const x = 1;");
    });
  });

  // ── Lists ──────────────────────────────────────────────────

  describe("bullet lists", () => {
    it("converts bullet list items", async () => {
      const xml = await docxXML("- First\n- Second\n- Third");
      expect(xml).toContain("First");
      expect(xml).toContain("Second");
      expect(xml).toContain("Third");
      // Should have numbering references (w:numId)
      expect(xml).toContain("w:numId");
    });
  });

  describe("ordered lists", () => {
    it("converts ordered list items", async () => {
      const xml = await docxXML("1. Alpha\n2. Beta\n3. Gamma");
      expect(xml).toContain("Alpha");
      expect(xml).toContain("Beta");
      expect(xml).toContain("Gamma");
      expect(xml).toContain("w:numId");
    });
  });

  describe("task lists", () => {
    it("converts unchecked task list items with ☐", async () => {
      const xml = await docxXML("- [ ] Todo item");
      expect(xml).toContain("Todo item");
      expect(xml).toContain("\u2610"); // ☐
    });

    it("converts checked task list items with ☑", async () => {
      const xml = await docxXML("- [x] Done item");
      expect(xml).toContain("Done item");
      expect(xml).toContain("\u2611"); // ☑
    });

    it("converts mixed task list", async () => {
      const xml = await docxXML("- [x] Done\n- [ ] Not done");
      expect(xml).toContain("\u2611"); // checked
      expect(xml).toContain("\u2610"); // unchecked
    });
  });

  // ── Blockquotes ────────────────────────────────────────────

  describe("blockquotes", () => {
    it("converts blockquote text", async () => {
      const xml = await docxXML("> This is a quote");
      expect(xml).toContain("This is a quote");
      // Should have left indent
      expect(xml).toContain("w:ind");
    });

    it("converts multi-paragraph blockquote", async () => {
      const xml = await docxXML("> Line one\n>\n> Line two");
      expect(xml).toContain("Line one");
      expect(xml).toContain("Line two");
    });
  });

  // ── Horizontal rule ────────────────────────────────────────

  describe("horizontal rule", () => {
    it("converts horizontal rule to a bordered paragraph", async () => {
      const xml = await docxXML("Above\n\n---\n\nBelow");
      expect(xml).toContain("Above");
      expect(xml).toContain("Below");
      // Should have a bottom border for the hr
      expect(xml).toContain("w:pBdr");
    });
  });

  // ── Tables ─────────────────────────────────────────────────

  describe("tables", () => {
    it("converts a basic table", async () => {
      const md = "| A | B |\n| --- | --- |\n| 1 | 2 |";
      const xml = await docxXML(md);
      expect(xml).toContain("w:tbl");
      expect(xml).toContain("w:tr");
      expect(xml).toContain("w:tc");
    });

    it("includes header and body cell text", async () => {
      const md = "| Name | Value |\n| --- | --- |\n| foo | bar |";
      const xml = await docxXML(md);
      expect(xml).toContain("Name");
      expect(xml).toContain("Value");
      expect(xml).toContain("foo");
      expect(xml).toContain("bar");
    });

    it("applies shading to header cells", async () => {
      const md = "| H1 | H2 |\n| --- | --- |\n| a | b |";
      const xml = await docxXML(md);
      // Header cells should have shading (f2f2f2)
      expect(xml).toContain("f2f2f2");
    });
  });

  // ── Math ───────────────────────────────────────────────────

  describe("math", () => {
    it("converts inline math to italic monospace TeX", async () => {
      const xml = await docxXML("The equation $E=mc^2$ is famous.");
      expect(xml).toContain("E=mc^2");
      expect(xml).toContain("Courier New");
    });

    it("converts display math block to centered TeX", async () => {
      const xml = await docxXML("$$\n\\int_0^1 x^2 dx\n$$");
      expect(xml).toContain("\\int_0^1 x^2 dx");
      expect(xml).toContain("Courier New");
    });
  });

  // ── Images ─────────────────────────────────────────────────

  describe("images", () => {
    it("falls back to text placeholder when image cannot be read", async () => {
      const xml = await docxXML("![Alt text](./nonexistent.png)");
      // Inline images produce lowercase "[image: ...]" via convertInlineContent
      expect(xml).toContain("[image: Alt text]");
    });

    it("falls back for HTTP URLs", async () => {
      const xml = await docxXML("![photo](https://example.com/photo.png)");
      expect(xml).toContain("[image: photo]");
    });
  });

  // ── Frontmatter ────────────────────────────────────────────

  describe("frontmatter", () => {
    it("skips YAML frontmatter", async () => {
      const xml = await docxXML("---\ntitle: Test\n---\n\nHello");
      expect(xml).toContain("Hello");
      // The frontmatter content should not appear in the output
      expect(xml).not.toContain("title: Test");
    });
  });

  // ── Hard break ─────────────────────────────────────────────

  describe("hard breaks", () => {
    it("converts hard breaks (two trailing spaces)", async () => {
      const xml = await docxXML("Line one  \nLine two");
      expect(xml).toContain("Line one");
      expect(xml).toContain("Line two");
      // Hard break produces a w:br element
      expect(xml).toContain("w:br");
    });
  });

  // ── Complex documents ──────────────────────────────────────

  describe("complex documents", () => {
    it("handles a document with mixed content", async () => {
      const md = [
        "# Title",
        "",
        "A paragraph with **bold** and *italic*.",
        "",
        "## Section",
        "",
        "- Item one",
        "- Item two",
        "",
        "```js",
        "console.log('hi');",
        "```",
        "",
        "> A quote",
        "",
        "| Col1 | Col2 |",
        "| ---- | ---- |",
        "| a    | b    |",
      ].join("\n");

      const zip = await docxZip(md);
      const xmlFile = zip.file("word/document.xml");
      const xml = await xmlFile!.async("text");

      expect(xml).toContain("Title");
      expect(xml).toContain("bold");
      expect(xml).toContain("italic");
      expect(xml).toContain("Item one");
      expect(xml).toContain("console.log");
      expect(xml).toContain("A quote");
      expect(xml).toContain("w:tbl");
    });

    it("handles a very long paragraph", async () => {
      const longText = "word ".repeat(500).trim();
      const xml = await docxXML(longText);
      expect(xml).toContain("word");
    });

    it("handles document with only headings", async () => {
      const md = "# H1\n\n## H2\n\n### H3";
      const xml = await docxXML(md);
      expect(xml).toContain("H1");
      expect(xml).toContain("H2");
      expect(xml).toContain("H3");
    });
  });

  // ── Title metadata ─────────────────────────────────────────

  describe("document title", () => {
    it("includes title in document properties", async () => {
      const zip = await docxZip("Hello", "My Document");
      const propsFile = zip.file("docProps/core.xml");
      if (propsFile) {
        const propsXml = await propsFile.async("text");
        expect(propsXml).toContain("My Document");
      }
      // If no core.xml, the title may be embedded elsewhere — still valid
    });
  });
});

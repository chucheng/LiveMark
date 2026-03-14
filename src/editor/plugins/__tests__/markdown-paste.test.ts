// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { hasMarkdownSyntax, hasStructuralHTML } from "../markdown-paste";

// =============================================================================
// hasMarkdownSyntax
// =============================================================================
describe("hasMarkdownSyntax", () => {
  // ── Strong patterns (single-line triggers) ──────────────────────────────
  describe("strong patterns", () => {
    it("detects ATX headings at column 0", () => {
      expect(hasMarkdownSyntax("# Heading")).toBe(true);
      expect(hasMarkdownSyntax("## Sub")).toBe(true);
      expect(hasMarkdownSyntax("###### Deep")).toBe(true);
    });

    it("rejects indented headings (code context)", () => {
      expect(hasMarkdownSyntax("    # comment")).toBe(false);
    });

    it("rejects bare hash without space", () => {
      expect(hasMarkdownSyntax("#hashtag")).toBe(false);
    });

    it("detects code fences", () => {
      expect(hasMarkdownSyntax("```js\nconsole.log('hi')\n```")).toBe(true);
      expect(hasMarkdownSyntax("```")).toBe(true);
    });

    it("detects blockquotes at column 0", () => {
      expect(hasMarkdownSyntax("> quote")).toBe(true);
    });

    it("rejects indented blockquotes", () => {
      expect(hasMarkdownSyntax("  > not a blockquote trigger")).toBe(false);
    });

    it("detects table rows with 2+ cells", () => {
      expect(hasMarkdownSyntax("| A | B | C |")).toBe(true);
      expect(hasMarkdownSyntax("| --- | --- |")).toBe(true);
    });

    it("rejects single-pipe expressions", () => {
      expect(hasMarkdownSyntax("|err|")).toBe(false);
    });

    it("detects task list items", () => {
      expect(hasMarkdownSyntax("- [ ] Todo")).toBe(true);
      expect(hasMarkdownSyntax("- [x] Done")).toBe(true);
      expect(hasMarkdownSyntax("- [X] Done")).toBe(true);
    });
  });

  // ── Soft patterns (need 2+ lines) ──────────────────────────────────────
  describe("soft patterns", () => {
    it("detects 2+ unordered list items", () => {
      expect(hasMarkdownSyntax("- first\n- second")).toBe(true);
      expect(hasMarkdownSyntax("* a\n* b")).toBe(true);
      expect(hasMarkdownSyntax("+ a\n+ b")).toBe(true);
    });

    it("rejects a single list item", () => {
      expect(hasMarkdownSyntax("- just one")).toBe(false);
    });

    it("detects 2+ ordered list items", () => {
      expect(hasMarkdownSyntax("1. first\n2. second")).toBe(true);
    });

    it("rejects a single ordered item", () => {
      expect(hasMarkdownSyntax("3. I went to the store")).toBe(false);
    });

    it("rejects indented list items", () => {
      expect(hasMarkdownSyntax("  - a\n  - b")).toBe(false);
    });
  });

  // ── Inline Markdown in multi-line text ──────────────────────────────────
  describe("inline patterns", () => {
    it("detects links in multi-line text", () => {
      expect(hasMarkdownSyntax("Hello\n[link](url)\nWorld")).toBe(true);
    });

    it("detects images in multi-line text", () => {
      expect(hasMarkdownSyntax("Hello\n![alt](img.png)\nWorld")).toBe(true);
    });

    it("rejects links in single-line text", () => {
      expect(hasMarkdownSyntax("[link](url)")).toBe(false);
    });

    it("rejects images in single-line text", () => {
      expect(hasMarkdownSyntax("![alt](img.png)")).toBe(false);
    });
  });

  // ── Plain text (no Markdown) ────────────────────────────────────────────
  describe("plain text", () => {
    it("rejects plain text", () => {
      expect(hasMarkdownSyntax("Hello world")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(hasMarkdownSyntax("")).toBe(false);
    });

    it("rejects multi-line plain text", () => {
      expect(hasMarkdownSyntax("Hello\nWorld\nFoo")).toBe(false);
    });

    it("rejects text that looks like code", () => {
      expect(hasMarkdownSyntax("const x = 1;\nconst y = 2;")).toBe(false);
    });

    it("rejects text with inline emphasis only", () => {
      expect(hasMarkdownSyntax("This is **bold** and *italic*")).toBe(false);
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────
  describe("edge cases", () => {
    it("handles mixed strong + soft correctly", () => {
      expect(hasMarkdownSyntax("# Title\n- item one")).toBe(true);
    });

    it("handles Windows line endings", () => {
      expect(hasMarkdownSyntax("- a\r\n- b")).toBe(true);
    });

    it("handles horizontal rules", () => {
      // --- is not in strong patterns, so should not trigger alone
      expect(hasMarkdownSyntax("---")).toBe(false);
    });

    it("handles heading with only hash and space", () => {
      expect(hasMarkdownSyntax("# ")).toBe(true);
    });
  });
});

// =============================================================================
// hasStructuralHTML
// =============================================================================
describe("hasStructuralHTML", () => {
  describe("detects structural tags", () => {
    it("detects <p> tags", () => {
      expect(hasStructuralHTML("<p>Hello</p>")).toBe(true);
    });

    it("detects heading tags", () => {
      expect(hasStructuralHTML("<h1>Title</h1>")).toBe(true);
      expect(hasStructuralHTML("<h3>Sub</h3>")).toBe(true);
    });

    it("detects list tags", () => {
      expect(hasStructuralHTML("<ul><li>item</li></ul>")).toBe(true);
      expect(hasStructuralHTML("<ol><li>item</li></ol>")).toBe(true);
    });

    it("detects table tags", () => {
      expect(hasStructuralHTML("<table><tr><td>cell</td></tr></table>")).toBe(true);
    });

    it("detects blockquote", () => {
      expect(hasStructuralHTML("<blockquote>quote</blockquote>")).toBe(true);
    });

    it("detects pre tags", () => {
      expect(hasStructuralHTML("<pre>code</pre>")).toBe(true);
    });

    it("detects div tags", () => {
      expect(hasStructuralHTML("<div>block</div>")).toBe(true);
    });

    it("detects anchor tags", () => {
      expect(hasStructuralHTML('<a href="url">link</a>')).toBe(true);
    });

    it("detects img tags", () => {
      expect(hasStructuralHTML('<img src="pic.png">')).toBe(true);
    });
  });

  describe("ignores boilerplate-only HTML", () => {
    it("rejects empty string", () => {
      expect(hasStructuralHTML("")).toBe(false);
    });

    it("rejects HTML with only meta tags", () => {
      expect(hasStructuralHTML('<meta charset="utf-8">')).toBe(false);
    });

    it("rejects HTML with only style tags", () => {
      expect(hasStructuralHTML("<style>body { color: red; }</style>")).toBe(false);
    });

    it("rejects VS Code-style boilerplate (meta + style only)", () => {
      const vscodeHtml = `<meta charset='utf-8'><style>body { font-family: monospace; }</style>`;
      expect(hasStructuralHTML(vscodeHtml)).toBe(false);
    });

    it("rejects html/head/body wrapper without content", () => {
      expect(hasStructuralHTML("<html><head></head><body></body></html>")).toBe(false);
    });

    it("rejects plain text wrapped in html/body", () => {
      expect(hasStructuralHTML("<html><body>just text</body></html>")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("detects structural tags inside boilerplate wrappers", () => {
      const html = `<html><head><meta charset="utf-8"></head><body><p>content</p></body></html>`;
      expect(hasStructuralHTML(html)).toBe(true);
    });

    it("handles case-insensitive tags", () => {
      expect(hasStructuralHTML("<P>content</P>")).toBe(true);
      expect(hasStructuralHTML("<DIV>content</DIV>")).toBe(true);
    });

    it("handles tags with attributes", () => {
      expect(hasStructuralHTML('<p class="foo">content</p>')).toBe(true);
    });

    it("rejects <span> (inline, not structural)", () => {
      expect(hasStructuralHTML("<span>text</span>")).toBe(false);
    });

    it("rejects <b>/<i>/<em>/<strong> (inline formatting)", () => {
      expect(hasStructuralHTML("<b>bold</b>")).toBe(false);
      expect(hasStructuralHTML("<em>italic</em>")).toBe(false);
    });
  });
});

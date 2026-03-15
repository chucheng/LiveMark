// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { schema } from "../schema";
import { extractPlainTextAndMarks, reapplyMarks } from "../ai-format-preservation";
import type { Node, Mark } from "prosemirror-model";

// Mock serializeMarkdown to avoid full serializer dependency in unit tests
vi.mock("../markdown/serializer", () => ({
  serializeMarkdown: (doc: Node) => {
    const parts: string[] = [];
    doc.content.forEach((block) => {
      const inlineParts: string[] = [];
      block.content.forEach((child) => {
        if (!child.isText) return;
        let text = child.text ?? "";
        const marks = child.marks;
        // Apply marks in order: link wraps everything, then strong, em, code, strikethrough
        for (const m of marks) {
          if (m.type.name === "strong") text = `**${text}**`;
          else if (m.type.name === "em") text = `*${text}*`;
          else if (m.type.name === "code") text = `\`${text}\``;
          else if (m.type.name === "strikethrough") text = `~~${text}~~`;
          else if (m.type.name === "link") text = `[${text}](${m.attrs.href})`;
        }
        inlineParts.push(text);
      });
      parts.push(inlineParts.join(""));
    });
    return parts.join("\n\n") + "\n";
  },
}));

// --- Node builders ---

function doc(...children: Node[]): Node {
  return schema.node("doc", null, children);
}

function p(...parts: (Node | string)[]): Node {
  const nodes = parts
    .filter((c) => c !== "")
    .map((c) => (typeof c === "string" ? schema.text(c) : c));
  return schema.node("paragraph", null, nodes.length > 0 ? nodes : undefined);
}

function bold(text: string): Node {
  return schema.text(text, [schema.marks.strong.create()]);
}

function italic(text: string): Node {
  return schema.text(text, [schema.marks.em.create()]);
}

function code(text: string): Node {
  return schema.text(text, [schema.marks.code.create()]);
}

function boldItalic(text: string): Node {
  return schema.text(text, [schema.marks.strong.create(), schema.marks.em.create()]);
}

function linked(text: string, href: string): Node {
  return schema.text(text, [schema.marks.link.create({ href })]);
}

function strikethrough(text: string): Node {
  return schema.text(text, [schema.marks.strikethrough.create()]);
}

// --- extractPlainTextAndMarks ---

describe("extractPlainTextAndMarks", () => {
  it("extracts plain text with no marks", () => {
    const d = doc(p("Hello world"));
    // doc(p("Hello world")) → positions: 0=doc, 1=p_start, "Hello world", 12=p_end, 13=doc_end
    const result = extractPlainTextAndMarks(d, 1, 12);
    expect(result.plainText).toBe("Hello world");
    expect(result.markMap.length).toBe(11);
    expect(result.markMap[0]).toEqual([]);
    expect(result.codePlaceholders.size).toBe(0);
  });

  it("extracts bold marks into markMap", () => {
    const d = doc(p("say ", bold("hello"), " world"));
    const result = extractPlainTextAndMarks(d, 1, 16);
    expect(result.plainText).toBe("say hello world");
    // "hello" chars should have strong marks
    expect(result.markMap[4][0].type.name).toBe("strong");
    expect(result.markMap[8][0].type.name).toBe("strong");
    // "say " should have no marks
    expect(result.markMap[0]).toEqual([]);
  });

  it("replaces code spans with placeholders", () => {
    const d = doc(p("use ", code("npm install"), " to install"));
    const result = extractPlainTextAndMarks(d, 1, 27);
    expect(result.plainText).toContain("{{CODE_0}}");
    expect(result.plainText).not.toContain("npm install");
    expect(result.codePlaceholders.get("{{CODE_0}}")).toBe("npm install");
  });

  it("handles multi-paragraph with \\n\\n boundaries", () => {
    const d = doc(p("First paragraph"), p("Second paragraph"));
    const result = extractPlainTextAndMarks(d, 1, d.content.size - 1);
    expect(result.plainText).toContain("First paragraph");
    expect(result.plainText).toContain("\n\n");
    expect(result.plainText).toContain("Second paragraph");
  });

  it("extracts overlapping marks (bold+italic)", () => {
    const d = doc(p("say ", boldItalic("hello"), " world"));
    const result = extractPlainTextAndMarks(d, 1, 16);
    expect(result.plainText).toBe("say hello world");
    // "hello" chars should have both strong and em marks
    const hMarks = result.markMap[4];
    expect(hMarks.length).toBe(2);
    const markNames = hMarks.map((m) => m.type.name).sort();
    expect(markNames).toEqual(["em", "strong"]);
  });
});

// --- reapplyMarks ---

describe("reapplyMarks", () => {
  it("plain text passthrough (no marks)", () => {
    const d = doc(p("Hello world"));
    const extraction = extractPlainTextAndMarks(d, 1, 12);
    const result = reapplyMarks(extraction, "Hello world", schema);
    expect(result).toBe("Hello world");
  });

  it("preserves bold after rewording", () => {
    const d = doc(p("say ", bold("hello"), " world"));
    const extraction = extractPlainTextAndMarks(d, 1, 16);
    // LLM changes "say" to "speak" but keeps "hello world"
    const result = reapplyMarks(extraction, "speak hello world", schema);
    expect(result).toContain("**hello**");
    expect(result).toContain("speak");
  });

  it("preserves italic after rewording", () => {
    const d = doc(p("the ", italic("quick"), " fox"));
    const extraction = extractPlainTextAndMarks(d, 1, 14);
    const result = reapplyMarks(extraction, "the quick brown fox", schema);
    expect(result).toContain("*quick*");
  });

  it("preserves overlapping marks (bold+italic)", () => {
    const d = doc(p("say ", boldItalic("hello"), " world"));
    const extraction = extractPlainTextAndMarks(d, 1, 16);
    const result = reapplyMarks(extraction, "say hello world", schema);
    // Should contain bold+italic markup
    expect(result).toMatch(/\*{3}hello\*{3}|\*\*\*hello\*\*\*/);
  });

  it("code placeholder round-trip", () => {
    const d = doc(p("use ", code("npm install"), " to install"));
    const extraction = extractPlainTextAndMarks(d, 1, 27);
    // LLM keeps the placeholder intact
    const result = reapplyMarks(extraction, "use {{CODE_0}} for installation", schema);
    expect(result).toContain("`npm install`");
  });

  it("link text preserved with URL", () => {
    const d = doc(p("visit ", linked("our site", "https://example.com"), " today"));
    const extraction = extractPlainTextAndMarks(d, 1, 22);
    const result = reapplyMarks(extraction, "visit our site today", schema);
    expect(result).toContain("[our site](https://example.com)");
  });

  it("inserted text inherits marks from left neighbor", () => {
    const d = doc(p(bold("hello world")));
    const extraction = extractPlainTextAndMarks(d, 1, 12);
    // LLM inserts "beautiful " — should inherit bold
    const result = reapplyMarks(extraction, "hello beautiful world", schema);
    expect(result).toBe("**hello beautiful world**");
  });

  it("deleted text within a mark span", () => {
    // "truly" is bold, "beautiful" is bold — LLM removes "truly "
    const d = doc(p("say ", bold("truly"), " ", bold("beautiful"), " world"));
    const extraction = extractPlainTextAndMarks(d, 1, 26);
    // LLM removes "truly " → "beautiful" should still be bold
    const result = reapplyMarks(extraction, "say beautiful world", schema);
    expect(result).toContain("**beautiful**");
  });

  it("no-change passthrough", () => {
    const d = doc(p("say ", bold("hello"), " world"));
    const extraction = extractPlainTextAndMarks(d, 1, 16);
    const result = reapplyMarks(extraction, "say hello world", schema);
    expect(result).toContain("**hello**");
    expect(result).toMatch(/^say \*\*hello\*\* world$/);
  });

  it("multi-paragraph with \\n\\n boundaries", () => {
    const d = doc(p("First ", bold("bold"), " text"), p("Second paragraph"));
    const extraction = extractPlainTextAndMarks(d, 1, d.content.size - 1);
    const revised = extraction.plainText; // no changes
    const result = reapplyMarks(extraction, revised, schema);
    expect(result).toContain("**bold**");
    expect(result).toContain("Second paragraph");
  });
});

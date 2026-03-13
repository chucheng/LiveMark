import { describe, it, expect } from "vitest";
import { parseMarkdown } from "../markdown/parser";
import { serializeMarkdown } from "../markdown/serializer";
import { schema } from "../schema";
import { Node } from "prosemirror-model";

/**
 * Property-based tests for Markdown transformations.
 *
 * These tests generate various Markdown inputs and verify
 * structural invariants hold across the parse→serialize cycle.
 */

// --- Random Markdown Generators ---

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomWord(): string {
  const words = [
    "hello", "world", "test", "markdown", "editor", "live",
    "render", "prosemirror", "node", "schema", "text", "bold",
    "italic", "code", "link", "image", "table", "list", "item",
  ];
  return randomChoice(words);
}

function randomSentence(wordCount = 3): string {
  return Array.from({ length: wordCount }, () => randomWord()).join(" ");
}

function randomInlineText(): string {
  const formats = [
    () => randomWord(),
    () => `**${randomWord()}**`,
    () => `*${randomWord()}*`,
    () => `\`${randomWord()}\``,
    () => `~~${randomWord()}~~`,
    () => `[${randomWord()}](https://example.com)`,
  ];
  return randomChoice(formats)();
}

function randomParagraph(): string {
  const parts = Array.from(
    { length: 1 + Math.floor(Math.random() * 4) },
    () => randomInlineText()
  );
  return parts.join(" ");
}

function randomHeading(): string {
  const level = 1 + Math.floor(Math.random() * 6);
  return "#".repeat(level) + " " + randomSentence(2);
}

function randomBulletList(): string {
  const items = Array.from(
    { length: 1 + Math.floor(Math.random() * 3) },
    () => "- " + randomSentence(2)
  );
  return items.join("\n");
}

function randomOrderedList(): string {
  const count = 1 + Math.floor(Math.random() * 3);
  const start = Math.floor(Math.random() * 5) + 1;
  return Array.from(
    { length: count },
    (_, i) => `${start + i}. ${randomSentence(2)}`
  ).join("\n");
}

function randomCodeBlock(): string {
  const langs = ["", "js", "python", "rust", "go", "typescript"];
  const lang = randomChoice(langs);
  return "```" + lang + "\n" + randomSentence(3) + "\n```";
}

function randomBlockquote(): string {
  return "> " + randomSentence(3);
}

function randomTaskList(): string {
  const items = Array.from(
    { length: 1 + Math.floor(Math.random() * 3) },
    () => `- [${Math.random() > 0.5 ? "x" : " "}] ${randomSentence(2)}`
  );
  return items.join("\n");
}

function randomBlock(): string {
  const generators = [
    randomParagraph,
    randomHeading,
    randomBulletList,
    randomOrderedList,
    randomCodeBlock,
    randomBlockquote,
    randomTaskList,
    () => "---",
  ];
  return randomChoice(generators)();
}

function randomDocument(blockCount = 3): string {
  return Array.from({ length: blockCount }, () => randomBlock()).join("\n\n");
}

// --- Property Tests ---

describe("Property-based: double round-trip structural fidelity", () => {
  // Run multiple iterations with different random seeds
  const ITERATIONS = 50;

  for (let i = 0; i < ITERATIONS; i++) {
    it(`iteration ${i + 1}: parse→serialize→parse produces same structure`, () => {
      const md = randomDocument(2 + Math.floor(Math.random() * 4));
      const doc1 = parseMarkdown(md);
      if (!doc1) {
        // Some random inputs may not parse — that's OK, skip
        return;
      }

      const serialized = serializeMarkdown(doc1);
      const doc2 = parseMarkdown(serialized);

      expect(doc2).not.toBeNull();
      expect(doc2!.toJSON()).toEqual(doc1.toJSON());
    });
  }
});

describe("Property-based: serialized output is valid Markdown", () => {
  const ITERATIONS = 30;

  for (let i = 0; i < ITERATIONS; i++) {
    it(`iteration ${i + 1}: serialize then parse produces non-null doc`, () => {
      const md = randomDocument(2 + Math.floor(Math.random() * 3));
      const doc1 = parseMarkdown(md);
      if (!doc1) return;

      const serialized = serializeMarkdown(doc1);
      const doc2 = parseMarkdown(serialized);
      expect(doc2).not.toBeNull();
      expect(doc2!.childCount).toBeGreaterThanOrEqual(1);
    });
  }
});

describe("Property-based: parsed documents are schema-valid", () => {
  const ITERATIONS = 30;

  for (let i = 0; i < ITERATIONS; i++) {
    it(`iteration ${i + 1}: parsed doc passes schema check`, () => {
      const md = randomDocument(2 + Math.floor(Math.random() * 3));
      const doc = parseMarkdown(md);
      if (!doc) return;

      // Node.check() throws if content doesn't match schema
      expect(() => doc.check()).not.toThrow();
    });
  }
});

describe("Property-based: specific element round-trips", () => {
  it("random headings round-trip", () => {
    for (let i = 0; i < 20; i++) {
      const md = randomHeading();
      const doc1 = parseMarkdown(md);
      if (!doc1) continue;
      const serialized = serializeMarkdown(doc1);
      const doc2 = parseMarkdown(serialized);
      expect(doc2).not.toBeNull();
      expect(doc2!.toJSON()).toEqual(doc1.toJSON());
    }
  });

  it("random bullet lists round-trip", () => {
    for (let i = 0; i < 20; i++) {
      const md = randomBulletList();
      const doc1 = parseMarkdown(md);
      if (!doc1) continue;
      const serialized = serializeMarkdown(doc1);
      const doc2 = parseMarkdown(serialized);
      expect(doc2).not.toBeNull();
      expect(doc2!.toJSON()).toEqual(doc1.toJSON());
    }
  });

  it("random code blocks round-trip", () => {
    for (let i = 0; i < 20; i++) {
      const md = randomCodeBlock();
      const doc1 = parseMarkdown(md);
      if (!doc1) continue;
      const serialized = serializeMarkdown(doc1);
      const doc2 = parseMarkdown(serialized);
      expect(doc2).not.toBeNull();
      expect(doc2!.toJSON()).toEqual(doc1.toJSON());
    }
  });

  it("random task lists round-trip", () => {
    for (let i = 0; i < 20; i++) {
      const md = randomTaskList();
      const doc1 = parseMarkdown(md);
      if (!doc1) continue;
      const serialized = serializeMarkdown(doc1);
      const doc2 = parseMarkdown(serialized);
      expect(doc2).not.toBeNull();
      expect(doc2!.toJSON()).toEqual(doc1.toJSON());
    }
  });
});

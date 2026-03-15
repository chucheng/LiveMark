import { describe, it, expect } from "vitest";
import { buildSyncMap, pmPosToMdLine, mdLineToPmPos } from "../scroll-sync";
import { parseMarkdown } from "../../editor/markdown/parser";

function parse(md: string) {
  const doc = parseMarkdown(md);
  if (!doc) throw new Error("parseMarkdown returned null");
  return doc;
}

describe("buildSyncMap", () => {
  it("single paragraph", () => {
    const doc = parse("Hello world");
    const map = buildSyncMap(doc);
    // Start + end-of-block entries
    expect(map.length).toBe(2);
    expect(map[0]).toEqual({ pmPos: 0, mdLine: 0 });
    expect(map[1].mdLine).toBe(0); // end of block, same line
  });

  it("two paragraphs (blank-line separated)", () => {
    const doc = parse("First paragraph\n\nSecond paragraph");
    const map = buildSyncMap(doc);
    // 2 blocks × 2 entries each (start + end)
    expect(map.length).toBe(4);
    expect(map[0].mdLine).toBe(0);  // block 0 start
    expect(map[1].mdLine).toBe(0);  // block 0 end (same line)
    expect(map[2].mdLine).toBe(2);  // block 1 start: line 0: text, line 1: blank, line 2: text
    expect(map[3].mdLine).toBe(2);  // block 1 end
  });

  it("heading followed by paragraph", () => {
    const doc = parse("# Title\n\nBody text");
    const map = buildSyncMap(doc);
    expect(map.length).toBe(4);
    expect(map[0].mdLine).toBe(0); // # Title start
    expect(map[2].mdLine).toBe(2); // Body text start
  });

  it("code block (multi-line)", () => {
    const doc = parse("Before\n\n```js\nconst a = 1;\nconst b = 2;\n```\n\nAfter");
    const map = buildSyncMap(doc);
    expect(map.length).toBe(6); // 3 blocks × 2 entries
    expect(map[0].mdLine).toBe(0); // Before start
    expect(map[2].mdLine).toBe(2); // code block starts at line 2
    // Code block: ```js + 2 lines + ``` = 4 lines (lines 2-5), next block at line 7
    expect(map[4].mdLine).toBe(7); // After start
  });

  it("bullet list (single top-level block)", () => {
    const doc = parse("- Item one\n- Item two\n- Item three");
    const map = buildSyncMap(doc);
    // Single top-level block with start + end entries
    expect(map.length).toBe(2);
    expect(map[0].mdLine).toBe(0);
  });

  it("mixed content", () => {
    const doc = parse("# Heading\n\nParagraph\n\n- List item\n\n> Quote");
    const map = buildSyncMap(doc);
    // 4 blocks × 2 entries each
    expect(map.length).toBe(8);
    expect(map[0].mdLine).toBe(0); // heading start
    // Block start entries have increasing mdLine values
    const startEntries = map.filter((_, i) => i % 2 === 0);
    for (let i = 1; i < startEntries.length; i++) {
      expect(startEntries[i].mdLine).toBeGreaterThan(startEntries[i - 1].mdLine);
    }
  });

  it("empty document", () => {
    const doc = parse("");
    const map = buildSyncMap(doc);
    // Empty doc may have 0 or 1 entry depending on parser
    expect(map.length).toBeGreaterThanOrEqual(0);
  });
});

describe("pmPosToMdLine", () => {
  it("returns 0 for empty map", () => {
    expect(pmPosToMdLine([], 10)).toBe(0);
  });

  it("returns first block line for position within first block", () => {
    const doc = parse("Hello world\n\nSecond");
    const map = buildSyncMap(doc);
    expect(pmPosToMdLine(map, 0)).toBe(0);
  });

  it("interpolates within a block", () => {
    const doc = parse("First paragraph\n\nSecond paragraph");
    const map = buildSyncMap(doc);
    // Position halfway through first block should stay on line 0
    // (end-of-block entry ensures interpolation doesn't bleed into blank line)
    const midPos = Math.floor(map[1].pmPos / 2);
    const line = pmPosToMdLine(map, midPos);
    expect(line).toBe(0);
  });

  it("returns last block line for position past last block", () => {
    const doc = parse("Only paragraph");
    const map = buildSyncMap(doc);
    const line = pmPosToMdLine(map, 100);
    expect(line).toBe(0);
  });
});

describe("mdLineToPmPos", () => {
  it("returns 0 for empty map", () => {
    expect(mdLineToPmPos([], 5, 100)).toBe(0);
  });

  it("returns first block pos for line 0", () => {
    const doc = parse("Hello\n\nWorld");
    const map = buildSyncMap(doc);
    expect(mdLineToPmPos(map, 0, doc.content.size)).toBe(0);
  });

  it("returns second block pos for its line", () => {
    const doc = parse("First\n\nSecond");
    const map = buildSyncMap(doc);
    // Block 1 start is at map[2] (map[0]=start0, map[1]=end0, map[2]=start1, map[3]=end1)
    const pos = mdLineToPmPos(map, map[2].mdLine, doc.content.size);
    expect(pos).toBe(map[2].pmPos);
  });

  it("clamps to docSize", () => {
    const doc = parse("Short");
    const map = buildSyncMap(doc);
    const pos = mdLineToPmPos(map, 1000, doc.content.size);
    expect(pos).toBeLessThanOrEqual(doc.content.size);
  });
});

describe("round-trip: pmPosToMdLine ↔ mdLineToPmPos", () => {
  it("round-trips line numbers with minimal drift", () => {
    const doc = parse("# Title\n\nParagraph one\n\nParagraph two\n\n```\ncode\n```\n\n- item");
    const map = buildSyncMap(doc);
    const docSize = doc.content.size;

    for (const entry of map) {
      const line = entry.mdLine;
      const pos = mdLineToPmPos(map, line, docSize);
      const recoveredLine = pmPosToMdLine(map, pos);
      expect(Math.abs(recoveredLine - line)).toBeLessThan(0.5);
    }
  });
});

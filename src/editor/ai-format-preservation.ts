import { diff_match_patch, DIFF_EQUAL, DIFF_DELETE, DIFF_INSERT } from "diff-match-patch";
import type { Node, Mark, Schema } from "prosemirror-model";
import { serializeMarkdown } from "./markdown/serializer";

export interface ExtractionResult {
  plainText: string;
  markMap: Mark[][];
  codePlaceholders: Map<string, string>;
}

/**
 * Extract plain text and a parallel mark map from a PM doc range.
 *
 * Code-marked spans are replaced with `{{CODE_N}}` placeholders so the LLM
 * cannot mangle them. Block boundaries become `\n\n`, hard breaks become `\n`.
 */
export function extractPlainTextAndMarks(
  doc: Node,
  from: number,
  to: number,
): ExtractionResult {
  const chars: string[] = [];
  const markMap: Mark[][] = [];
  const codePlaceholders = new Map<string, string>();
  let codeIndex = 0;
  let lastBlockEnd = -1;

  doc.nodesBetween(from, to, (node, pos) => {
    // Insert \n\n between block nodes (paragraphs, headings, etc.)
    if (node.isBlock && node.isTextblock && chars.length > 0 && pos >= lastBlockEnd) {
      chars.push("\n", "\n");
      markMap.push([], []);
    }

    if (node.isTextblock) {
      lastBlockEnd = pos + node.nodeSize;
    }

    if (node.isText && node.text) {
      // Clamp to selection range
      const nodeStart = pos;
      const startOffset = Math.max(0, from - nodeStart);
      const endOffset = Math.min(node.text.length, to - nodeStart);
      if (startOffset >= endOffset) return false;

      const text = node.text.slice(startOffset, endOffset);
      const marks = node.marks;

      // Check if this text node has a code mark
      const hasCode = marks.some((m) => m.type.name === "code");

      if (hasCode) {
        const placeholder = `{{CODE_${codeIndex}}}`;
        codePlaceholders.set(placeholder, text);
        codeIndex++;
        // Insert placeholder chars with the non-code marks
        const nonCodeMarks = marks.filter((m) => m.type.name !== "code");
        for (const ch of placeholder) {
          chars.push(ch);
          markMap.push(nonCodeMarks);
        }
      } else {
        for (const ch of text) {
          chars.push(ch);
          markMap.push([...marks]);
        }
      }

      return false; // don't descend into text nodes
    }

    // hard_break → \n
    if (node.type.name === "hard_break") {
      chars.push("\n");
      markMap.push([]);
      return false;
    }

    return true; // descend into other nodes
  });

  return {
    plainText: chars.join(""),
    markMap,
    codePlaceholders,
  };
}

/**
 * Re-apply original marks to revised plain text using diff alignment.
 *
 * 1. Diff original vs revised (both with {{CODE_N}} placeholders)
 * 2. Transfer marks based on alignment (EQUAL=copy, DELETE=skip, INSERT=inherit)
 * 3. Restore {{CODE_N}} placeholders → original code text with code mark
 * 4. Build PM doc with marks, then serialize to Markdown string
 */
export function reapplyMarks(
  extraction: ExtractionResult,
  revisedPlain: string,
  schema: Schema,
): string {
  const { plainText: originalPlain, markMap, codePlaceholders } = extraction;

  // 1. Diff original ↔ revised (both have {{CODE_N}} placeholders intact)
  const dmp = new diff_match_patch();
  const diffs = dmp.diff_main(originalPlain, revisedPlain);
  dmp.diff_cleanupSemantic(diffs);

  // 2. Walk diffs to build revised text + mark map
  const revisedChars: string[] = [];
  const revisedMarkMap: Mark[][] = [];
  let origIdx = 0;

  for (const [op, text] of diffs) {
    if (op === DIFF_EQUAL) {
      for (let i = 0; i < text.length; i++) {
        revisedChars.push(text[i]);
        revisedMarkMap.push(origIdx < markMap.length ? markMap[origIdx] : []);
        origIdx++;
      }
    } else if (op === DIFF_DELETE) {
      origIdx += text.length;
    } else if (op === DIFF_INSERT) {
      for (let i = 0; i < text.length; i++) {
        revisedChars.push(text[i]);
        // Inherit from left neighbor, or right if at position 0
        if (revisedMarkMap.length > 0) {
          revisedMarkMap.push(revisedMarkMap[revisedMarkMap.length - 1]);
        } else if (origIdx < markMap.length) {
          revisedMarkMap.push(markMap[origIdx]);
        } else {
          revisedMarkMap.push([]);
        }
      }
    }
  }

  let revisedText = revisedChars.join("");

  // 3. Restore code placeholders → original text with code mark added
  for (const [placeholder, original] of codePlaceholders) {
    const idx = revisedText.indexOf(placeholder);
    if (idx === -1) continue;

    const baseMarks = idx < revisedMarkMap.length ? revisedMarkMap[idx] : [];
    const codeMark = schema.marks.code.create();
    const codeMarks = [...baseMarks, codeMark];

    // Replace placeholder chars with original text chars, all with code marks
    const newMarks = Array.from({ length: original.length }, () => codeMarks);
    revisedMarkMap.splice(idx, placeholder.length, ...newMarks);
    revisedText = revisedText.slice(0, idx) + original + revisedText.slice(idx + placeholder.length);
  }

  // 4. Build PM nodes from revised text + marks
  //    Split on \n\n for paragraph boundaries
  const paragraphs: Node[] = [];
  const blocks = revisedText.split("\n\n");
  let charIdx = 0;

  for (let b = 0; b < blocks.length; b++) {
    const blockText = blocks[b];
    if (b > 0) charIdx += 2; // skip the \n\n

    const inlineNodes: Node[] = [];
    let runStart = charIdx;
    let runMarks: readonly Mark[] = revisedMarkMap[charIdx] ?? [];

    for (let i = 0; i < blockText.length; i++) {
      const idx = charIdx + i;
      const currentMarks: readonly Mark[] = revisedMarkMap[idx] ?? [];

      if (!marksEqual(currentMarks, runMarks)) {
        // Flush previous run
        const runText = blockText.slice(runStart - charIdx, i);
        if (runText) {
          inlineNodes.push(schema.text(runText, runMarks as Mark[]));
        }
        runStart = charIdx + i;
        runMarks = currentMarks;
      }
    }

    // Flush final run
    const finalText = blockText.slice(runStart - charIdx);
    if (finalText) {
      inlineNodes.push(schema.text(finalText, runMarks as Mark[]));
    }

    charIdx += blockText.length;

    if (inlineNodes.length > 0) {
      paragraphs.push(schema.node("paragraph", null, inlineNodes));
    }
  }

  if (paragraphs.length === 0) {
    return revisedText;
  }

  // 5. Serialize the built PM doc to Markdown
  const tempDoc = schema.topNodeType.create(null, paragraphs);
  return serializeMarkdown(tempDoc).trim();
}

/** Compare two mark arrays for equality (same types and attrs). */
function marksEqual(a: readonly Mark[], b: readonly Mark[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!a[i].eq(b[i])) return false;
  }
  return true;
}

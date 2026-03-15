import { Plugin } from "prosemirror-state";
import { Node } from "prosemirror-model";
import { schema } from "../schema";

/**
 * Pattern definitions for inline marks.
 * Each pattern defines the regex, mark type, and marker length.
 * Uses captured space group instead of lookbehind for WebKit compatibility.
 * match[1] = optional leading space, match[2] = content between markers.
 */
const MARK_PATTERNS = [
  { regex: /(?:^|(\s))\*\*([^*]+)\*\*/, mark: schema.marks.strong, markerLen: 2 },
  { regex: /(?:^|(\s))\*([^*]+)\*/, mark: schema.marks.em, markerLen: 1 },
  { regex: /(?:^|(\s))~~([^~]+)~~/, mark: schema.marks.strikethrough, markerLen: 2 },
  { regex: /(?:^|(\s))`([^`]+)`/, mark: schema.marks.code, markerLen: 1 },
];

/**
 * Fallback plugin that catches unprocessed mark patterns (e.g., **bold**)
 * left as literal text in the document when ProseMirror's handleTextInput
 * isn't called (common in Tauri/WKWebView).
 *
 * Runs as appendTransaction on doc changes, scanning only the paragraph
 * at the cursor position. Only fires when the cursor is right after a
 * completed pattern (i.e., the user just typed the closing marker).
 */
export function markPatternFallbackPlugin(): Plugin {
  return new Plugin({
    appendTransaction(transactions, _oldState, newState) {
      // Only run when text was actually inserted
      if (!transactions.some(tr => tr.docChanged)) return null;

      const { $cursor } = newState.selection as any;
      if (!$cursor) return null;

      const parent = $cursor.parent;
      if (!parent.isTextblock) return null;

      const text = parent.textContent;
      const parentStart = $cursor.start($cursor.depth);
      const cursorOffset = $cursor.pos - parentStart;

      for (const pattern of MARK_PATTERNS) {
        const match = pattern.regex.exec(text);
        if (!match) continue;

        const prefix = match[1] || ""; // captured leading space (or empty)
        const content = match[2];
        const fullMatch = match[0];
        const matchStart = match.index;

        // Only fire if the cursor is right after the closing marker
        const matchEnd = matchStart + fullMatch.length;
        if (cursorOffset !== matchEnd) continue;

        // Calculate document positions
        const markerStart = parentStart + matchStart + prefix.length;
        const openEnd = markerStart + pattern.markerLen;
        const closeStart = openEnd + content.length;
        const closeEnd = closeStart + pattern.markerLen;

        // Verify the markers are literal text (no existing mark of this type)
        let alreadyMarked = false;
        const nodeStart = matchStart + prefix.length;
        const nodeEnd = nodeStart + pattern.markerLen * 2 + content.length;
        parent.nodesBetween(nodeStart, Math.min(nodeEnd, text.length), (node: Node) => {
          if (node.isText && pattern.mark.isInSet(node.marks)) {
            alreadyMarked = true;
          }
        });
        if (alreadyMarked) continue;

        // Build the transaction: delete closing markers first (higher position),
        // then opening markers, then apply the mark.
        const tr = newState.tr;
        tr.delete(closeStart, closeEnd);
        tr.delete(markerStart, openEnd);

        const markFrom = markerStart;
        const markTo = markerStart + content.length;
        tr.addMark(markFrom, markTo, pattern.mark.create());
        tr.removeStoredMark(pattern.mark);

        return tr;
      }

      return null;
    },
  });
}

import {
  inputRules,
  wrappingInputRule,
  textblockTypeInputRule,
  InputRule,
} from "prosemirror-inputrules";
import { NodeType, MarkType } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { findWrapping } from "prosemirror-transform";
import { schema } from "./schema";

// --- Block-level rules ---

function headingRule(nodeType: NodeType, maxLevel: number) {
  return textblockTypeInputRule(
    new RegExp(`^(#{1,${maxLevel}})\\s$`),
    nodeType,
    (match) => ({ level: match[1].length })
  );
}

function blockquoteRule(nodeType: NodeType) {
  return wrappingInputRule(/^\s*>\s$/, nodeType);
}

function bulletListRule(nodeType: NodeType) {
  return wrappingInputRule(/^\s*([-+*])\s$/, nodeType);
}

function orderedListRule(nodeType: NodeType) {
  return wrappingInputRule(
    /^(\d+)\.\s$/,
    nodeType,
    (match) => ({ start: +match[1] }),
    (match, node) => node.childCount + node.attrs.start === +match[1]
  );
}

function codeBlockRule(nodeType: NodeType) {
  return textblockTypeInputRule(/^```(\w*)\s$/, nodeType, (match) => ({
    language: match[1] || "",
  }));
}

function mathBlockRule(nodeType: NodeType) {
  return textblockTypeInputRule(/^\$\$\s$/, nodeType);
}

function horizontalRuleRule(nodeType: NodeType) {
  return new InputRule(
    /^(?:---|\*\*\*|___)\s$/,
    (state: EditorState, _match, start, end) => {
      const paragraphType = state.schema.nodes.paragraph;
      const tr = state.tr.replaceRangeWith(start, end, nodeType.create());
      // Ensure a paragraph exists after the HR and move cursor there
      const hrEnd = tr.mapping.map(end);
      const $pos = tr.doc.resolve(hrEnd);
      const after = $pos.after($pos.depth);
      if (after >= tr.doc.content.size) {
        tr.insert(tr.doc.content.size, paragraphType.create());
      }
      tr.setSelection(TextSelection.create(tr.doc, after + 1));
      tr.scrollIntoView();
      return tr;
    }
  );
}

function taskListRule(checked: boolean) {
  const pattern = checked ? /^\s*-\s*\[x\]\s$/ : /^\s*-\s*\[\s\]\s$/;
  return new InputRule(pattern, (state: EditorState, _match, start, end) => {
    const taskListType = schema.nodes.task_list;
    const taskListItemType = schema.nodes.task_list_item;
    const $start = state.doc.resolve(start);
    const range = $start.blockRange();
    if (!range) return null;

    const tr = state.tr.delete(start, end);
    const $pos = tr.doc.resolve(tr.mapping.map(range.start));
    const blockRange = $pos.blockRange();
    if (!blockRange) return null;

    const wrap = findWrapping(blockRange, taskListType);
    if (!wrap) return null;

    tr.wrap(blockRange, wrap);
    // Set the task_list_item attrs on the inner node
    const taskItemPos = tr.mapping.map(range.start) + 1;
    const taskItemNode = tr.doc.nodeAt(taskItemPos);
    if (taskItemNode?.type === taskListItemType) {
      tr.setNodeMarkup(taskItemPos, undefined, { checked });
    }

    return tr;
  });
}

// --- Inline mark rules ---

/**
 * Input rule that detects completed Markdown mark syntax and applies the mark.
 *
 * Pattern: (before)(open)(content)(close)(trigger)
 * The regex captures: [1]=before, [2]=open+content+close
 * We strip the opening/closing markers and apply the mark to the content.
 */
function markWrappingRule(
  pattern: RegExp,
  markType: MarkType,
  markerLength: number,
  metaKey?: string
) {
  return new InputRule(pattern, (state: EditorState, match, start, end) => {
    // Guard: `end` includes the just-typed character (not yet in the doc).
    // The cursor position is `end - 1`. Resolve it and verify we're inside
    // a textblock — if $from resolved at the doc level the positions are
    // shifted and the delete would corrupt adjacent characters.
    const cursorPos = Math.min(end - 1, state.doc.content.size);
    const $cursor = state.doc.resolve(cursorPos);
    if (!$cursor.parent.isTextblock) return null;

    // Re-anchor positions to the textblock content start so they are correct
    // even when ProseMirror's InputRule computed `start` from a doc-level
    // $from.start() instead of the paragraph-level one.
    const tbStart = $cursor.start($cursor.depth);
    const textLen = $cursor.parent.textContent.length;
    const reStart = tbStart + (match.index ?? 0);

    // match[1] is the prefix before the marker (may be empty)
    const prefix = match[1] || "";

    // Calculate positions
    const markerStart = reStart + prefix.length;
    const openEnd = markerStart + markerLength;
    // `end` includes the typed char; the actual closing marker in the doc
    // has `markerLength - 1` characters (the last one is the typed char).
    const closeStart = tbStart + textLen - (markerLength - 1);

    // The text content is between the markers
    const tr = state.tr;

    // Delete the existing closing marker characters (not the typed char)
    if (closeStart < tbStart + textLen) {
      tr.delete(closeStart, tbStart + textLen);
    }
    // Delete opening marker
    tr.delete(markerStart, openEnd);

    // Apply mark to the text between where the markers were
    const markFrom = markerStart;
    const markTo = markerStart + (closeStart - openEnd);
    tr.addMark(markFrom, markTo, markType.create());
    tr.removeStoredMark(markType);

    if (metaKey) {
      tr.setMeta(metaKey, { from: markFrom, to: markTo });
    }

    return tr;
  });
}

function mathInlineRule() {
  // Match $content$ where content is non-empty and doesn't start/end with space
  return new InputRule(
    /(?:^|(?<=\s))\$([^\s$][^$]*[^\s$]|[^\s$])\$$/,
    (state: EditorState, match, start, end) => {
      const tex = match[1];
      const mathNode = schema.nodes.math_inline.create({ tex });
      // Adjust start to skip the leading whitespace if present
      const offset = match[0].length - match[1].length - 2; // 2 for the $ delimiters
      const from = start + offset;
      return state.tr.replaceWith(from, end, mathNode);
    }
  );
}

export function buildInputRules() {
  return inputRules({
    rules: [
      // Block rules
      // Task list rules must come before bullet list rule
      taskListRule(false),
      taskListRule(true),
      headingRule(schema.nodes.heading, 6),
      blockquoteRule(schema.nodes.blockquote),
      bulletListRule(schema.nodes.bullet_list),
      orderedListRule(schema.nodes.ordered_list),
      codeBlockRule(schema.nodes.code_block),
      mathBlockRule(schema.nodes.math_block),
      horizontalRuleRule(schema.nodes.horizontal_rule),

      // Inline mark rules
      // **bold**: match "**text**" with the closing ** just typed
      markWrappingRule(
        /(?:^|(\s))\*\*([^*]+)\*\*$/,
        schema.marks.strong,
        2
      ),
      // *italic*: match "*text*" but not "**"
      markWrappingRule(
        /(?:^|(\s))\*([^*]+)\*$/,
        schema.marks.em,
        1,
        "italic-star-applied"
      ),
      // _italic_: match "_text_"
      markWrappingRule(
        /(?:^|(\s))_([^_]+)_$/,
        schema.marks.em,
        1
      ),
      // ~~strikethrough~~
      markWrappingRule(
        /(?:^|(\s))~~([^~]+)~~$/,
        schema.marks.strikethrough,
        2
      ),
      // `code`
      markWrappingRule(
        /(?:^|(\s))`([^`]+)`$/,
        schema.marks.code,
        1
      ),

      // $math$ — inline math atom
      mathInlineRule(),
    ],
  });
}

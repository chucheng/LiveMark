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

/**
 * When inside a heading, typing "# " at the start increases the heading level.
 * E.g. H1 + "# " → H2, H2 + "# " → H3, up to H6.
 */
function headingUpgradeRule() {
  return new InputRule(/^#\s$/, (state: EditorState, _match, start, end) => {
    const $start = state.doc.resolve(start);
    const parent = $start.parent;
    if (parent.type !== schema.nodes.heading) return null;
    const level = parent.attrs.level as number;
    if (level >= 6) return null;
    // Delete the typed "# " and increase the heading level
    const tr = state.tr.delete(start, end);
    tr.setNodeMarkup($start.before(), undefined, { level: level + 1 });
    return tr;
  });
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
    // `end` is the cursor position (from = to in handleTextInput).
    // The typed char is NOT yet in the document.
    const $cursor = state.doc.resolve(Math.min(end, state.doc.content.size));
    if (!$cursor.parent.isTextblock) return null;

    const tbStart = $cursor.start($cursor.depth);
    const reStart = tbStart + (match.index ?? 0);

    // match[1] is the prefix before the marker (may be empty)
    const prefix = match[1] || "";

    // Calculate positions using cursor (`end`), NOT textblock length.
    // The closing marker chars in the doc are the (markerLength - 1) chars
    // immediately before the cursor. The typed char is the last marker char.
    const markerStart = reStart + prefix.length;
    const openEnd = markerStart + markerLength;
    const closeStart = end - (markerLength - 1);

    const tr = state.tr;

    // Delete the closing marker chars already in the doc (higher positions first)
    if (closeStart < end) {
      tr.delete(closeStart, end);
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
      headingUpgradeRule(),
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

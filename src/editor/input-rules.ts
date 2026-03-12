import {
  inputRules,
  wrappingInputRule,
  textblockTypeInputRule,
  InputRule,
} from "prosemirror-inputrules";
import { NodeType, MarkType } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
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

function horizontalRuleRule(nodeType: NodeType) {
  return new InputRule(
    /^(?:---|\*\*\*|___)\s$/,
    (state: EditorState, _match, start, end) => {
      return state.tr.replaceRangeWith(start, end, nodeType.create());
    }
  );
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
  markerLength: number
) {
  return new InputRule(pattern, (state: EditorState, match, start, end) => {
    // match[1] is the prefix before the marker (may be empty)
    const prefix = match[1] || "";
    const fullMatch = match[0];

    // Calculate positions
    const markerStart = start + prefix.length;
    const openEnd = markerStart + markerLength;
    const closeStart = end - markerLength;

    // The text content is between the markers
    const tr = state.tr;

    // Delete closing marker
    tr.delete(closeStart, end);
    // Delete opening marker
    tr.delete(markerStart, openEnd);

    // Apply mark to the text between where the markers were
    const markFrom = markerStart;
    const markTo = markerStart + (closeStart - openEnd);
    tr.addMark(markFrom, markTo, markType.create());
    tr.removeStoredMark(markType);

    return tr;
  });
}

export function buildInputRules() {
  return inputRules({
    rules: [
      // Block rules
      headingRule(schema.nodes.heading, 6),
      blockquoteRule(schema.nodes.blockquote),
      bulletListRule(schema.nodes.bullet_list),
      orderedListRule(schema.nodes.ordered_list),
      codeBlockRule(schema.nodes.code_block),
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
    ],
  });
}

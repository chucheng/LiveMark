import { keymap } from "prosemirror-keymap";
import { Command, TextSelection } from "prosemirror-state";
import {
  toggleMark,
  setBlockType,
  chainCommands,
  exitCode,
  joinUp,
  joinDown,
  lift,
  selectParentNode,
} from "prosemirror-commands";
import {
  liftListItem,
  sinkListItem,
  splitListItem,
} from "prosemirror-schema-list";
import { undo, redo } from "prosemirror-history";
import { goToNextCell } from "prosemirror-tables";
import { schema } from "./schema";
import { MarkType, ResolvedPos } from "prosemirror-model";

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

/**
 * Exit a code block when pressing Enter on an empty line at the end.
 * Creates a new paragraph below the code block. If the code block becomes
 * empty, it is converted to a paragraph instead.
 */
const exitCodeBlockOnEnter: Command = (state, dispatch) => {
  const { $head, empty } = state.selection;
  if (!empty) return false;

  const parent = $head.parent;
  if (parent.type !== schema.nodes.code_block) return false;

  const text = parent.textContent;
  // Only trigger when the cursor is at the very end and the last line is empty
  if ($head.parentOffset !== text.length) return false;
  if (!text.endsWith("\n") && text.length > 0) return false;

  if (dispatch) {
    const codeBlockPos = $head.before();
    const tr = state.tr;

    if (text === "" || text === "\n") {
      // Empty or single-newline code block: replace with paragraph
      tr.setNodeMarkup(codeBlockPos, schema.nodes.paragraph);
      if (text.length > 0) {
        tr.delete(codeBlockPos + 1, codeBlockPos + 1 + text.length);
      }
    } else {
      // Remove the trailing newline and insert a paragraph after
      const trimEnd = codeBlockPos + 1 + text.length;
      const trimStart = codeBlockPos + 1 + text.length - 1;
      const after = codeBlockPos + parent.nodeSize;
      tr.delete(trimStart, trimEnd);
      const mappedAfter = tr.mapping.map(after);
      tr.insert(mappedAfter, schema.nodes.paragraph.create());
      tr.setSelection(TextSelection.near(tr.doc.resolve(mappedAfter + 1)));
    }
    dispatch(tr.scrollIntoView());
  }
  return true;
};

/**
 * Toggle a mark on the current selection.
 */
function markCommand(markName: string): Command {
  const markType = schema.marks[markName];
  if (!markType) throw new Error(`Mark "${markName}" not found in schema`);
  return toggleMark(markType);
}

/**
 * Set the current block to a heading of the given level.
 */
function headingCommand(level: number): Command {
  return setBlockType(schema.nodes.heading, { level });
}

/**
 * Set the current block to a paragraph (useful for removing heading/codeblock).
 */
const toParagraph: Command = setBlockType(schema.nodes.paragraph);

/**
 * Set the current block to a code block.
 */
const toCodeBlock: Command = setBlockType(schema.nodes.code_block);

/**
 * Insert a hard break (<br>).
 */
const insertHardBreak: Command = (state, dispatch) => {
  if (dispatch) {
    dispatch(
      state.tr
        .replaceSelectionWith(schema.nodes.hard_break.create())
        .scrollIntoView()
    );
  }
  return true;
};

/**
 * Insert a horizontal rule.
 */
const insertHorizontalRule: Command = (state, dispatch) => {
  if (dispatch) {
    const { $from } = state.selection;
    const tr = state.tr;
    tr.replaceRangeWith($from.before(), $from.after(), schema.nodes.horizontal_rule.create());
    // Add a paragraph after so the user can continue typing
    tr.insert(tr.mapping.map($from.after()), schema.nodes.paragraph.create());
    dispatch(tr.scrollIntoView());
  }
  return true;
};

/**
 * On Enter, convert a paragraph containing only "---", "***", or "___"
 * into a horizontal rule. This complements the input rule which requires
 * a trailing space.
 */
const hrOnEnter: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty) return false;

  const parent = $from.parent;
  if (parent.type !== schema.nodes.paragraph) return false;

  const text = parent.textContent;
  if (text !== "---" && text !== "***" && text !== "___") return false;

  if (dispatch) {
    const pos = $from.before();
    const tr = state.tr;
    tr.replaceRangeWith(pos, pos + parent.nodeSize, schema.nodes.horizontal_rule.create());
    tr.insert(tr.mapping.map(pos + 1), schema.nodes.paragraph.create());
    dispatch(tr.scrollIntoView());
  }
  return true;
};

/**
 * On Enter, convert two consecutive paragraphs that form a Markdown table
 * (header row + separator row) into a ProseMirror table node.
 *
 * Pattern: paragraph "| H1 | H2 |" followed by paragraph "| --- | --- |"
 * with cursor at the end of the separator paragraph.
 */
const tableOnEnter: Command = (state, dispatch) => {
  const { $from, empty } = state.selection;
  if (!empty) return false;

  const parent = $from.parent;
  if (parent.type !== schema.nodes.paragraph) return false;

  const text = parent.textContent.trim();
  // Check if current line is a separator row: | --- | --- | ...
  if (!/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(text)) return false;

  // Find the preceding paragraph (header row)
  const sepPos = $from.before(); // position of separator paragraph
  const $sep = state.doc.resolve(sepPos);
  if ($sep.index($sep.depth - 1) === 0) return false; // no preceding sibling

  const headerNode = $sep.node($sep.depth - 1).child($sep.index($sep.depth - 1) - 1);
  if (headerNode.type !== schema.nodes.paragraph) return false;

  const headerText = headerNode.textContent.trim();
  // Check if header line looks like: | H1 | H2 | ...
  if (!/^\|?.+\|.+\|?\s*$/.test(headerText)) return false;

  // Parse columns from header
  const headerCells = headerText
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

  // Parse separator to check column count matches
  const sepCells = text
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

  if (headerCells.length !== sepCells.length || headerCells.length === 0) return false;

  if (dispatch) {
    const tr = state.tr;
    const { table, table_row, table_header, table_cell, paragraph } = schema.nodes;

    // Build header row with table_header cells
    const headerRowCells = headerCells.map((cellText) =>
      table_header.createAndFill(null, paragraph.create(null, cellText ? schema.text(cellText) : undefined))!
    );
    const headerRow = table_row.create(null, headerRowCells);

    // Build an empty data row
    const dataCells = headerCells.map(() =>
      table_cell.createAndFill(null, paragraph.create())!
    );
    const dataRow = table_row.create(null, dataCells);

    const tableNode = table.create(null, [headerRow, dataRow]);

    // Replace from start of header paragraph to end of separator paragraph
    const headerParaPos = sepPos - headerNode.nodeSize;
    const sepEnd = sepPos + parent.nodeSize;

    tr.replaceWith(headerParaPos, sepEnd, tableNode);
    // Place cursor in first data cell
    const tableStart = headerParaPos;
    // Navigate into table > dataRow > first cell > paragraph
    tr.setSelection(TextSelection.create(tr.doc, tableStart + headerRow.nodeSize + 3));
    dispatch(tr.scrollIntoView());
  }
  return true;
};

/**
 * Insert or toggle a link mark.
 * If text is selected and already linked, remove the link.
 * If text is selected and not linked, wrap it in a link with placeholder URL.
 * If no selection, insert [link](url) template.
 */
const insertLink: Command = (state, dispatch) => {
  const { from, to, empty } = state.selection;
  const linkMark = schema.marks.link;

  // If selection has a link, remove it
  if (!empty) {
    const hasLink = state.doc.rangeHasMark(from, to, linkMark);
    if (hasLink) {
      if (dispatch) {
        dispatch(state.tr.removeMark(from, to, linkMark));
      }
      return true;
    }
  }

  if (dispatch) {
    const tr = state.tr;
    if (empty) {
      // No selection — insert "link" text with a link mark (proper ProseMirror mark)
      const linkText = "link";
      const mark = linkMark.create({ href: "url" });
      tr.insertText(linkText, from);
      tr.addMark(from, from + linkText.length, mark);
      tr.setSelection(TextSelection.create(tr.doc, from, from + linkText.length));
    } else {
      // Selection exists — wrap selected text in a link with placeholder URL
      const mark = linkMark.create({ href: "" });
      tr.addMark(from, to, mark);
      // Place cursor at end of selection so user can continue typing
      tr.setSelection(TextSelection.create(tr.doc, to));
    }
    dispatch(tr.scrollIntoView());
  }
  return true;
};

/**
 * On Backspace at the start of a heading:
 * - If level > 1, decrease heading level (e.g. H2 → H1)
 * - If level === 1, convert to paragraph
 */
const headingBackspace: Command = (state, dispatch) => {
  const { $head, empty } = state.selection;
  if (!empty) return false;

  const parent = $head.parent;
  if (parent.type !== schema.nodes.heading) return false;
  if ($head.parentOffset !== 0) return false;

  if (dispatch) {
    const pos = $head.before();
    const level = parent.attrs.level as number;
    if (level > 1) {
      dispatch(state.tr.setNodeMarkup(pos, undefined, { level: level - 1 }).scrollIntoView());
    } else {
      dispatch(state.tr.setNodeMarkup(pos, schema.nodes.paragraph).scrollIntoView());
    }
  }
  return true;
};

/**
 * On Enter in an empty heading, convert it to a paragraph.
 * This lets users "escape" a heading by pressing Enter on a blank line.
 */
const exitHeadingOnEnter: Command = (state, dispatch) => {
  const { $head, empty } = state.selection;
  if (!empty) return false;

  const parent = $head.parent;
  if (parent.type !== schema.nodes.heading) return false;
  if (parent.textContent.length !== 0) return false;

  if (dispatch) {
    const pos = $head.before();
    dispatch(state.tr.setNodeMarkup(pos, schema.nodes.paragraph).scrollIntoView());
  }
  return true;
};

/**
 * Find the contiguous range of a mark type starting from the cursor position,
 * scanning forward through sibling inline nodes.
 */
function findMarkRangeForward($pos: ResolvedPos, markType: MarkType): { from: number; to: number } | null {
  const parent = $pos.parent;
  const index = $pos.index();
  let to = $pos.pos;

  for (let i = index; i < parent.childCount; i++) {
    const child = parent.child(i);
    if (markType.isInSet(child.marks)) {
      to += child.nodeSize;
    } else {
      break;
    }
  }

  return to === $pos.pos ? null : { from: $pos.pos, to };
}

/**
 * At the left boundary of a strong/em mark, Backspace peels off one emphasis level:
 *   **bold** → *italic* → plain
 *   ***bold+italic*** → **bold** (remove em) or *italic* (remove strong)
 *
 * This makes the widget-decoration syntax markers feel like real editable characters.
 */
const markBoundaryBackspace: Command = (state, dispatch) => {
  const { $head, empty } = state.selection;
  if (!empty) return false;

  // Must be inside a textblock
  if (!$head.parent.isTextblock) return false;

  const nodeAfter = $head.nodeAfter;
  if (!nodeAfter || !nodeAfter.isInline) return false;

  const strongType = schema.marks.strong;
  const emType = schema.marks.em;

  const hasStrongAfter = !!strongType.isInSet(nodeAfter.marks);
  const hasEmAfter = !!emType.isInSet(nodeAfter.marks);

  // Only care about emphasis marks
  if (!hasStrongAfter && !hasEmAfter) return false;

  const nodeBefore = $head.nodeBefore;
  const hasStrongBefore = nodeBefore ? !!strongType.isInSet(nodeBefore.marks) : false;
  const hasEmBefore = nodeBefore ? !!emType.isInSet(nodeBefore.marks) : false;

  // Must be at a mark boundary (mark starts here)
  if (hasStrongAfter && !hasStrongBefore) {
    // Peel strong: **text** → *text*
    if (dispatch) {
      const range = findMarkRangeForward($head, strongType);
      if (!range) return false;
      const tr = state.tr;
      tr.removeMark(range.from, range.to, strongType);
      // If it didn't already have em, add em (downgrade rather than strip)
      if (!hasEmAfter) {
        tr.addMark(range.from, range.to, emType.create());
      }
      dispatch(tr.scrollIntoView());
    }
    return true;
  }

  if (hasEmAfter && !hasEmBefore) {
    // Peel em: *text* → text
    if (dispatch) {
      const range = findMarkRangeForward($head, emType);
      if (!range) return false;
      const tr = state.tr;
      tr.removeMark(range.from, range.to, emType);
      dispatch(tr.scrollIntoView());
    }
    return true;
  }

  return false;
};

export function buildKeymaps() {
  const keys: Record<string, Command> = {};

  // History
  keys["Mod-z"] = undo;
  keys["Mod-Shift-z"] = redo;
  if (!isMac) keys["Mod-y"] = redo;

  // Marks
  keys["Mod-b"] = markCommand("strong");
  keys["Mod-i"] = markCommand("em");
  keys["Mod-`"] = markCommand("code");
  keys["Mod-Shift-x"] = markCommand("strikethrough");

  // Insert link
  keys["Mod-k"] = insertLink;

  // Headings (Cmd+1 through Cmd+6)
  for (let i = 1; i <= 6; i++) {
    keys[`Mod-${i}`] = headingCommand(i);
  }
  // Mod-0 intentionally omitted — reserved for Reset Zoom (Cmd+0) in App.tsx
  // Use Cmd+Shift+0 or command palette for "Convert to Paragraph"
  keys["Mod-Shift-0"] = toParagraph;

  // Lists + Tables (Tab/Shift-Tab context-aware)
  keys["Tab"] = chainCommands(goToNextCell(1), sinkListItem(schema.nodes.list_item), sinkListItem(schema.nodes.task_list_item));
  keys["Shift-Tab"] = chainCommands(goToNextCell(-1), liftListItem(schema.nodes.list_item), liftListItem(schema.nodes.task_list_item));
  keys["Enter"] = chainCommands(exitCodeBlockOnEnter, exitHeadingOnEnter, hrOnEnter, tableOnEnter, splitListItem(schema.nodes.list_item), splitListItem(schema.nodes.task_list_item));

  // Heading level adjustment + mark boundary peeling
  keys["Backspace"] = chainCommands(headingBackspace, markBoundaryBackspace);

  // Block operations
  keys["Mod-Alt-c"] = toCodeBlock;
  keys["Alt-ArrowUp"] = joinUp;
  keys["Alt-ArrowDown"] = joinDown;
  keys["Mod-["] = lift;
  keys["Escape"] = selectParentNode;

  // Hard break
  keys["Shift-Enter"] = chainCommands(exitCode, insertHardBreak);
  if (isMac) {
    keys["Ctrl-Enter"] = chainCommands(exitCode, insertHardBreak);
  }

  return keymap(keys);
}

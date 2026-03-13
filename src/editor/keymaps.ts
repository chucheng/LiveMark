import { keymap } from "prosemirror-keymap";
import { Command } from "prosemirror-state";
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

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

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

  // Headings (Cmd+1 through Cmd+6)
  for (let i = 1; i <= 6; i++) {
    keys[`Mod-${i}`] = headingCommand(i);
  }
  keys["Mod-0"] = toParagraph;

  // Lists + Tables (Tab/Shift-Tab context-aware)
  keys["Tab"] = chainCommands(goToNextCell(1), sinkListItem(schema.nodes.list_item));
  keys["Shift-Tab"] = chainCommands(goToNextCell(-1), liftListItem(schema.nodes.list_item));
  keys["Enter"] = chainCommands(hrOnEnter, splitListItem(schema.nodes.list_item));

  // Block operations
  keys["Mod-Shift-c"] = toCodeBlock;
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

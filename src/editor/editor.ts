import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { keymap } from "prosemirror-keymap";
import { history } from "prosemirror-history";
import { baseKeymap } from "prosemirror-commands";
import { Node } from "prosemirror-model";
import { schema } from "./schema";
import { buildKeymaps } from "./keymaps";
import { buildInputRules } from "./input-rules";
import { placeholderPlugin } from "./plugins/placeholder";
import { liveRenderPlugin } from "./plugins/live-render";
import { inlineDecorationsPlugin } from "./plugins/inline-decorations";
import { linkClickPlugin } from "./plugins/link-click";
import { imageDropPastePlugin } from "./plugins/image-drop-paste";
import { findReplacePlugin } from "./plugins/find-replace";
import { tableEditing } from "prosemirror-tables";
import { nodeViews } from "./nodeviews";
import { parseMarkdown } from "./markdown/parser";
import { serializeMarkdown } from "./markdown/serializer";

export interface EditorInstance {
  view: EditorView;
  /** Get the current document as a Markdown string */
  getMarkdown: () => string;
  /** Replace the editor content with parsed Markdown */
  setMarkdown: (content: string) => void;
  /** Get the ProseMirror document node */
  getDoc: () => Node;
  destroy: () => void;
}

export interface CursorPosition {
  line: number;
  col: number;
  selected: number;
}

export interface EditorOptions {
  /** Initial Markdown content */
  content?: string;
  /** Called whenever the document changes */
  onChange?: (doc: Node) => void;
  /** Called whenever the selection/cursor changes */
  onSelectionChange?: (pos: CursorPosition) => void;
}

/**
 * Create a ProseMirror editor instance mounted to the given DOM element.
 *
 * Milestone 2: full Markdown editing with input rules, keymaps,
 * parser, and serializer.
 */
export function createEditor(
  mount: HTMLElement,
  options: EditorOptions = {}
): EditorInstance {
  const { content = "", onChange, onSelectionChange } = options;

  // Parse initial content
  const doc = content
    ? parseMarkdown(content) ?? schema.topNodeType.createAndFill()!
    : schema.topNodeType.createAndFill()!;

  const state = EditorState.create({
    doc,
    plugins: [
      buildInputRules(),
      buildKeymaps(),
      keymap(baseKeymap),
      history(),
      placeholderPlugin(),
      liveRenderPlugin(),
      inlineDecorationsPlugin(),
      linkClickPlugin(),
      imageDropPastePlugin(),
      findReplacePlugin(),
      tableEditing(),
    ],
  });

  const view = new EditorView(mount, {
    state,
    nodeViews,
    dispatchTransaction(transaction) {
      const newState = view.state.apply(transaction);
      view.updateState(newState);
      if (transaction.docChanged && onChange) {
        onChange(newState.doc);
      }
      if (onSelectionChange && (transaction.selectionSet || transaction.docChanged)) {
        const { $head, from, to } = newState.selection;
        // Compute line/col by counting newlines before cursor
        const textBefore = newState.doc.textBetween(0, $head.pos, "\n");
        const lines = textBefore.split("\n");
        onSelectionChange({
          line: lines.length,
          col: lines[lines.length - 1].length + 1,
          selected: Math.abs(to - from),
        });
      }
    },
  });

  return {
    view,

    getMarkdown() {
      return serializeMarkdown(view.state.doc);
    },

    setMarkdown(content: string) {
      const newDoc = content
        ? parseMarkdown(content) ?? schema.topNodeType.createAndFill()!
        : schema.topNodeType.createAndFill()!;
      const newState = EditorState.create({
        doc: newDoc,
        plugins: view.state.plugins,
      });
      view.updateState(newState);
    },

    getDoc() {
      return view.state.doc;
    },

    destroy() {
      view.destroy();
    },
  };
}

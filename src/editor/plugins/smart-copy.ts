import { Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Fragment } from "prosemirror-model";
import { schema } from "../schema";
import { markdownSerializer } from "../markdown/serializer";
import { generateBeautifulHTML } from "../../export/beautiful-doc";
import { uiState } from "../../state/ui";

/**
 * Smart Copy plugin — intercepts copy/cut to produce:
 *   text/html  → styled HTML (pastes well into Google Docs, Notion)
 *   text/plain → raw Markdown (pastes well into VS Code, terminals)
 */
export function smartCopyPlugin(): Plugin {
  return new Plugin({
    props: {
      handleDOMEvents: {
        copy(view, event) {
          return handleCopyOrCut(view, event as ClipboardEvent, false);
        },
        cut(view, event) {
          return handleCopyOrCut(view, event as ClipboardEvent, true);
        },
      },
    },
  });
}

function handleCopyOrCut(
  view: EditorView,
  event: ClipboardEvent,
  isCut: boolean
): boolean {
  // Don't intercept in Source View — let textarea handle natively
  if (uiState.isSourceView()) return false;

  const { from, to } = view.state.selection;
  // Empty selection — let default behavior handle it
  if (from === to) return false;

  const clipboardData = event.clipboardData;
  if (!clipboardData) return false;

  // Build a temporary doc from the selection slice.
  // When the selection is within a single block (e.g. heading, paragraph),
  // slice.content is inline-only and loses the block wrapper. We detect
  // this and re-wrap in the ancestor block nodes so the markdown serializer
  // sees complete structure (heading levels, list markers, marks, etc.).
  const slice = view.state.doc.slice(from, to);
  const $from = view.state.doc.resolve(from);
  let wrapped = slice.content;

  // Check if content is inline-only (no block children)
  let allInline = true;
  slice.content.forEach((node) => {
    if (node.isBlock) allInline = false;
  });

  if (allInline && slice.content.childCount > 0) {
    // Re-wrap inline content in ancestor block nodes up to doc level
    for (let d = $from.depth; d > 0; d--) {
      const ancestor = $from.node(d);
      wrapped = Fragment.from(ancestor.type.create(ancestor.attrs, wrapped));
    }
  } else if (slice.openStart > 0) {
    // Cross-block selection with open ends — re-wrap open levels
    for (let d = slice.openStart; d > 0; d--) {
      const node = $from.node($from.depth - d + 1);
      wrapped = Fragment.from(node.type.create(node.attrs, wrapped));
    }
  }

  const tempDoc = schema.topNodeType.create(null, wrapped);

  // Determine plain text: raw code for code_block selections, markdown otherwise
  let plainText: string;
  const $to = view.state.doc.resolve(to);
  const sameCodeBlock =
    $from.parent.type.name === "code_block" &&
    $to.parent.type.name === "code_block" &&
    $from.parent === $to.parent;

  if (sameCodeBlock) {
    // Inside a single code block — copy raw code, no fences
    plainText = view.state.doc.textBetween(from, to);
  } else {
    plainText = markdownSerializer.serialize(tempDoc);
  }

  // Generate styled HTML for rich paste targets
  const html = generateBeautifulHTML(plainText);

  clipboardData.setData("text/html", html);
  clipboardData.setData("text/plain", plainText);
  event.preventDefault();

  if (isCut) {
    view.dispatch(view.state.tr.deleteSelection().scrollIntoView());
  }

  return true;
}

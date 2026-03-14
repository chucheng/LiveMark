import { Plugin, PluginKey, EditorState } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { Node } from "prosemirror-model";
import { createEffect } from "solid-js";
import { preferencesState } from "../../state/preferences";

const sentenceFocusKey = new PluginKey("sentenceFocus");

/** Common abbreviations that should NOT be treated as sentence endings. */
const ABBREVS = /(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|al|fig|vol|no|dept|inc|corp|ltd|approx)\.\s*$/i;

/**
 * Find sentence boundaries within a text string.
 * Returns an array of [start, end] offsets for each sentence.
 */
function findSentences(text: string): Array<[number, number]> {
  if (!text.length) return [];

  const sentences: Array<[number, number]> = [];
  let start = 0;

  // Sentence-ending pattern: .!? followed by space or end, plus CJK terminators
  const re = /[.!?。！？]+[\s]|[.!?。！？]+$/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const endPos = match.index + match[0].length;
    // Check for abbreviation — look at text up to this point
    const prefix = text.slice(start, endPos);
    if (ABBREVS.test(prefix)) continue;

    sentences.push([start, endPos]);
    start = endPos;
    // Skip leading whitespace for next sentence
    while (start < text.length && /\s/.test(text[start])) start++;
  }

  // Remaining text is the last sentence
  if (start < text.length) {
    sentences.push([start, text.length]);
  }

  return sentences;
}

/**
 * Find the nearest textblock the cursor is in, returning its position.
 * Walks up the depth tree to find the innermost textblock (works inside
 * blockquotes, list items, table cells, etc.).
 */
function getActiveTextblockPos(state: EditorState): number | null {
  const { $head } = state.selection;
  for (let d = $head.depth; d >= 1; d--) {
    const node = $head.node(d);
    if (node.isTextblock) {
      return $head.before(d);
    }
  }
  return null;
}

/**
 * Map a textContent offset to an absolute PM position within a textblock node.
 * Handles inline atoms (images, math_inline) whose nodeSize differs from their
 * text contribution (they contribute empty string or replacement char to textContent).
 */
function textOffsetToPos(node: Node, blockPos: number, offset: number): number {
  let textOffset = 0;
  let pos = blockPos + 1; // inside the textblock

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child.isText) {
      const textLen = child.text!.length;
      if (textOffset + textLen >= offset) {
        return pos + (offset - textOffset);
      }
      textOffset += textLen;
      pos += child.nodeSize;
    } else {
      // Inline atom (image, math_inline, hard_break). They contribute
      // empty or single-char to textContent but have nodeSize >= 1.
      const contribution = child.textContent.length;
      if (textOffset + contribution >= offset && contribution > 0) {
        return pos;
      }
      textOffset += contribution;
      pos += child.nodeSize;
    }
  }

  // Past end — clamp to end of node content
  return Math.min(pos, blockPos + node.nodeSize - 1);
}

function buildSentenceDecorations(state: EditorState): DecorationSet {
  if (preferencesState.focusMode() !== "sentence") return DecorationSet.empty;

  const blockPos = getActiveTextblockPos(state);
  if (blockPos === null) return DecorationSet.empty;

  const node = state.doc.nodeAt(blockPos);
  if (!node || !node.isTextblock) return DecorationSet.empty;

  const text = node.textContent;
  if (!text.length) return DecorationSet.empty;

  const sentences = findSentences(text);
  if (sentences.length === 0) return DecorationSet.empty;

  // Find cursor offset within textContent
  const cursorPos = state.selection.head;
  // Walk node children to compute textContent offset from PM position
  let cursorOffset = 0;
  {
    let pos = blockPos + 1;
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (cursorPos <= pos + child.nodeSize) {
        if (child.isText) {
          cursorOffset += Math.max(0, Math.min(cursorPos - pos, child.text!.length));
        }
        break;
      }
      cursorOffset += child.isText ? child.text!.length : child.textContent.length;
      pos += child.nodeSize;
    }
  }

  let activeSentence: [number, number] | null = null;
  for (const [s, e] of sentences) {
    if (cursorOffset >= s && cursorOffset <= e) {
      activeSentence = [s, e];
      break;
    }
  }
  if (!activeSentence) {
    activeSentence = sentences[sentences.length - 1];
  }

  const decos: Decoration[] = [];

  // Mark the parent block as having an active sentence
  decos.push(
    Decoration.node(blockPos, blockPos + node.nodeSize, {
      class: "lm-has-active-sentence",
    })
  );

  // Map text offsets to PM positions
  const sentStart = textOffsetToPos(node, blockPos, activeSentence[0]);
  const sentEnd = textOffsetToPos(node, blockPos, activeSentence[1]);

  // Clamp to node boundaries
  const maxPos = blockPos + node.nodeSize - 1;
  const clampedStart = Math.max(blockPos + 1, Math.min(sentStart, maxPos));
  const clampedEnd = Math.max(blockPos + 1, Math.min(sentEnd, maxPos));

  if (clampedStart < clampedEnd) {
    decos.push(
      Decoration.inline(clampedStart, clampedEnd, {
        class: "lm-sentence-active",
      })
    );
  }

  return DecorationSet.create(state.doc, decos);
}

export function sentenceFocusPlugin(): Plugin {
  return new Plugin({
    key: sentenceFocusKey,
    state: {
      init(_, state) {
        return buildSentenceDecorations(state);
      },
      apply(tr, _prev, _oldState, newState) {
        // Always rebuild — the SolidJS signal may have changed without a doc/selection change
        return buildSentenceDecorations(newState);
      },
    },
    props: {
      decorations(state) {
        return sentenceFocusKey.getState(state);
      },
    },
    view(editorView: EditorView) {
      // React to focus mode signal changes — dispatch a no-op transaction
      // so the plugin state rebuilds decorations
      createEffect(() => {
        preferencesState.focusMode(); // track the signal
        const { state } = editorView;
        editorView.dispatch(state.tr);
      });
      return {};
    },
  });
}

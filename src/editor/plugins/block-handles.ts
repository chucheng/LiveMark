import { Plugin, PluginKey, EditorState, Transaction, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { Node, ResolvedPos } from "prosemirror-model";

export const blockHandlesKey = new PluginKey("blockHandles");

interface BlockHandlesState {
  hoveredPos: number | null;
  menuPos: number | null;
}

/**
 * Find the position of the top-level block node at the given screen coordinates.
 */
function topLevelBlockAtCoords(view: EditorView, y: number): number | null {
  const doc = view.state.doc;
  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i);
    const pos = posOfChild(doc, i);
    try {
      const start = view.coordsAtPos(pos + 1);
      const end = view.coordsAtPos(pos + child.nodeSize - 1);
      if (y >= start.top - 4 && y <= end.bottom + 4) {
        return pos;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function posOfChild(doc: Node, index: number): number {
  let pos = 0;
  for (let i = 0; i < index; i++) {
    pos += doc.child(i).nodeSize;
  }
  return pos;
}

function indexOfPos(doc: Node, pos: number): number {
  let offset = 0;
  for (let i = 0; i < doc.childCount; i++) {
    if (offset === pos) return i;
    offset += doc.child(i).nodeSize;
  }
  return -1;
}

/**
 * Move a top-level block up by one position.
 */
export function moveBlockUp(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const pos = getActiveBlockPos(state);
  if (pos === null) return false;
  const doc = state.doc;
  const idx = indexOfPos(doc, pos);
  if (idx <= 0) return false;

  if (dispatch) {
    const node = doc.child(idx);
    const prevNode = doc.child(idx - 1);
    const tr = state.tr;
    // Delete current node
    tr.delete(pos, pos + node.nodeSize);
    // Insert before previous
    const insertPos = pos - prevNode.nodeSize;
    tr.insert(insertPos, node);
    // Place cursor in the moved block
    tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1)));
    dispatch(tr.scrollIntoView());
  }
  return true;
}

/**
 * Move a top-level block down by one position.
 */
export function moveBlockDown(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const pos = getActiveBlockPos(state);
  if (pos === null) return false;
  const doc = state.doc;
  const idx = indexOfPos(doc, pos);
  if (idx < 0 || idx >= doc.childCount - 1) return false;

  if (dispatch) {
    const node = doc.child(idx);
    const nextNode = doc.child(idx + 1);
    const tr = state.tr;
    // Delete current node
    tr.delete(pos, pos + node.nodeSize);
    // Insert after next node (accounting for the deletion shift)
    const insertPos = pos + nextNode.nodeSize;
    const mappedPos = tr.mapping.map(insertPos);
    tr.insert(mappedPos, node);
    tr.setSelection(TextSelection.near(tr.doc.resolve(mappedPos + 1)));
    dispatch(tr.scrollIntoView());
  }
  return true;
}

/**
 * Duplicate the current top-level block.
 */
export function duplicateBlock(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const pos = getActiveBlockPos(state);
  if (pos === null) return false;
  const doc = state.doc;
  const idx = indexOfPos(doc, pos);
  if (idx < 0) return false;

  if (dispatch) {
    const node = doc.child(idx);
    const afterPos = pos + node.nodeSize;
    const tr = state.tr;
    tr.insert(afterPos, node.copy(node.content));
    tr.setSelection(TextSelection.near(tr.doc.resolve(afterPos + 1)));
    dispatch(tr.scrollIntoView());
  }
  return true;
}

/**
 * Delete the current top-level block.
 */
export function deleteBlock(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const pos = getActiveBlockPos(state);
  if (pos === null) return false;
  const doc = state.doc;
  const idx = indexOfPos(doc, pos);
  if (idx < 0) return false;

  // Don't delete the last block
  if (doc.childCount <= 1) return false;

  if (dispatch) {
    const node = doc.child(idx);
    const tr = state.tr;
    tr.delete(pos, pos + node.nodeSize);
    // Place cursor in the block above, or below if deleting first
    const target = Math.min(pos, tr.doc.content.size - 1);
    if (target > 0) {
      tr.setSelection(TextSelection.near(tr.doc.resolve(target)));
    }
    dispatch(tr.scrollIntoView());
  }
  return true;
}

/**
 * Get the position of the top-level block containing the cursor.
 */
function getActiveBlockPos(state: EditorState): number | null {
  const { $head } = state.selection;
  // Walk up to depth 1 (direct child of doc)
  if ($head.depth < 1) return null;
  const pos = $head.before(1);
  return pos;
}

/**
 * Create the block handles plugin.
 * Shows a ⋮⋮ handle on the left side of hovered blocks.
 */
export function blockHandlesPlugin(): Plugin<BlockHandlesState> {
  let lastMouseY = 0;
  let throttleTimer: ReturnType<typeof setTimeout> | null = null;

  return new Plugin<BlockHandlesState>({
    key: blockHandlesKey,
    state: {
      init(): BlockHandlesState {
        return { hoveredPos: null, menuPos: null };
      },
      apply(tr, value): BlockHandlesState {
        const meta = tr.getMeta(blockHandlesKey);
        if (meta) return { ...value, ...meta };
        if (tr.docChanged && value.hoveredPos !== null) {
          const mapped = tr.mapping.map(value.hoveredPos);
          return { ...value, hoveredPos: mapped };
        }
        return value;
      },
    },
    props: {
      decorations(state) {
        const pluginState = blockHandlesKey.getState(state);
        if (!pluginState || pluginState.hoveredPos === null) return DecorationSet.empty;

        const pos = pluginState.hoveredPos;
        // Validate pos is valid
        if (pos < 0 || pos >= state.doc.content.size) return DecorationSet.empty;

        const widget = Decoration.widget(pos, () => {
          const handle = document.createElement("div");
          handle.className = "lm-block-handle";
          handle.textContent = "⋮⋮";
          handle.setAttribute("draggable", "true");
          handle.title = "Drag to move, click for options";
          return handle;
        }, { side: -1, key: `handle-${pos}` });

        return DecorationSet.create(state.doc, [widget]);
      },

      handleDOMEvents: {
        mousemove(view, event) {
          if (throttleTimer) return false;
          throttleTimer = setTimeout(() => { throttleTimer = null; }, 60);

          lastMouseY = event.clientY;
          const pos = topLevelBlockAtCoords(view, event.clientY);
          const currentState = blockHandlesKey.getState(view.state);

          // Don't show handle when cursor is inside the block (selection is there)
          const activePos = getActiveBlockPos(view.state);

          if (pos !== currentState?.hoveredPos) {
            // Don't show handle on the block the cursor is currently editing
            const showPos = pos !== null && pos === activePos ? null : pos;
            view.dispatch(view.state.tr.setMeta(blockHandlesKey, { hoveredPos: showPos }));
          }
          return false;
        },
        mouseleave(view) {
          const currentState = blockHandlesKey.getState(view.state);
          if (currentState?.hoveredPos !== null) {
            view.dispatch(view.state.tr.setMeta(blockHandlesKey, { hoveredPos: null }));
          }
          return false;
        },
      },
    },
  });
}

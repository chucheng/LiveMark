import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Node, Mark } from "prosemirror-model";
import { liveRenderKey } from "./live-render";

interface MarkRange {
  from: number;
  to: number;
  mark: Mark;
}

function getMarkSyntax(mark: Mark): { open: string; close: string } | null {
  switch (mark.type.name) {
    case "strong":
      return { open: "**", close: "**" };
    case "em":
      return { open: "*", close: "*" };
    case "code":
      return { open: "`", close: "`" };
    case "strikethrough":
      return { open: "~~", close: "~~" };
    case "link":
      return { open: "[", close: `](${mark.attrs.href})` };
    default:
      return null;
  }
}

function createMarkerWidget(text: string): Decoration {
  // This is a factory — actual position set by caller
  // We just need the DOM creation logic
  const span = document.createElement("span");
  span.className = "lm-syntax-marker";
  span.textContent = text;
  span.contentEditable = "false";
  // Return the span for use in widget creation
  return span as unknown as Decoration;
}

function collectMarkRanges(node: Node, basePos: number): MarkRange[] {
  const ranges: MarkRange[] = [];

  // Map to accumulate contiguous ranges per mark
  const activeRanges = new Map<string, MarkRange>();

  let offset = 0;
  node.forEach((child, childOffset) => {
    const pos = basePos + 1 + childOffset; // +1 for entering the textblock
    const endPos = pos + child.nodeSize;

    // Build a set of mark keys for this child
    const childMarkKeys = new Set<string>();

    for (const mark of child.marks) {
      const syntax = getMarkSyntax(mark);
      if (!syntax) continue;

      const key = mark.type.name + (mark.type.name === "link" ? `:${mark.attrs.href}` : "");
      childMarkKeys.add(key);

      const existing = activeRanges.get(key);
      if (existing) {
        // Extend the range
        existing.to = endPos;
      } else {
        // Start a new range
        activeRanges.set(key, { from: pos, to: endPos, mark });
      }
    }

    // Close any active ranges whose mark is not on this child
    for (const [key, range] of activeRanges) {
      if (!childMarkKeys.has(key) && range.to <= pos) {
        ranges.push(range);
        activeRanges.delete(key);
      }
    }

    offset = childOffset + child.nodeSize;
  });

  // Flush remaining
  for (const range of activeRanges.values()) {
    ranges.push(range);
  }

  return ranges;
}

function buildInlineDecorations(
  doc: Node,
  activeNodePos: number | null
): DecorationSet {
  if (activeNodePos === null) return DecorationSet.empty;

  const activeNode = doc.nodeAt(activeNodePos);
  if (!activeNode) return DecorationSet.empty;

  // Find the deepest textblock containing the cursor
  // For simple blocks (paragraph, heading), activeNode itself is the textblock
  // For blockquote, we need to look deeper — but inline decorations only apply to textblocks
  // The active node is depth-1 block; we decorate all textblocks within it
  const decorations: Decoration[] = [];

  // Walk all textblocks within the active node
  activeNode.descendants((node, pos) => {
    if (!node.isTextblock) return true; // keep descending

    const absPos = activeNodePos + pos;
    const ranges = collectMarkRanges(node, absPos);

    for (const range of ranges) {
      const syntax = getMarkSyntax(range.mark);
      if (!syntax) continue;

      // Opening marker widget
      decorations.push(
        Decoration.widget(range.from, () => {
          const span = document.createElement("span");
          span.className = "lm-syntax-marker";
          span.textContent = syntax.open;
          span.contentEditable = "false";
          return span;
        }, { side: -1 })
      );

      // Closing marker widget
      decorations.push(
        Decoration.widget(range.to, () => {
          const span = document.createElement("span");
          span.className = "lm-syntax-marker";
          span.textContent = syntax.close;
          span.contentEditable = "false";
          return span;
        }, { side: 1 })
      );
    }

    return false; // don't descend into textblock children
  });

  return DecorationSet.create(doc, decorations);
}

export function inlineDecorationsPlugin(): Plugin {
  return new Plugin({
    state: {
      init(_, state) {
        const lrState = liveRenderKey.getState(state);
        return buildInlineDecorations(state.doc, lrState?.activeNodePos ?? null);
      },

      apply(tr, prev, _oldState, newState) {
        if (!tr.selectionSet && !tr.docChanged) return prev;

        const lrState = liveRenderKey.getState(newState);
        return buildInlineDecorations(newState.doc, lrState?.activeNodePos ?? null);
      },
    },

    props: {
      decorations(state) {
        return (this as Plugin).getState(state) as DecorationSet;
      },
    },
  });
}

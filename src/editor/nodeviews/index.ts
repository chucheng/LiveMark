import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import { HeadingView } from "./heading";
import { CodeBlockView } from "./code-block";
import { BlockquoteView } from "./blockquote";
import { HorizontalRuleView } from "./horizontal-rule";

export type NodeViewConstructor = (
  node: Node,
  view: EditorView,
  getPos: () => number | undefined
) => NodeView;

export const nodeViews: Record<string, NodeViewConstructor> = {
  heading: (node, view, getPos) => new HeadingView(node, view, getPos),
  code_block: (node, view, getPos) => new CodeBlockView(node, view, getPos),
  blockquote: (node, view, getPos) => new BlockquoteView(node, view, getPos),
  horizontal_rule: (node, view, getPos) => new HorizontalRuleView(node, view, getPos),
};

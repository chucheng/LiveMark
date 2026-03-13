import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import { HeadingView } from "./heading";
import { CodeBlockView } from "./code-block";
import { BlockquoteView } from "./blockquote";
import { HorizontalRuleView } from "./horizontal-rule";
import { TaskListItemView } from "./task-list-item";
import { ImageView } from "./image";
import { MathBlockView } from "./math-block";
import { MathInlineView } from "./math-inline";
import { FrontmatterView } from "./frontmatter";
import { MermaidView } from "./mermaid";

export type NodeViewConstructor = (
  node: Node,
  view: EditorView,
  getPos: () => number | undefined
) => NodeView;

export const nodeViews: Record<string, NodeViewConstructor> = {
  heading: (node, view, getPos) => new HeadingView(node, view, getPos),
  code_block: (node, view, getPos) =>
    node.attrs.language === "mermaid"
      ? new MermaidView(node, view, getPos)
      : new CodeBlockView(node, view, getPos),
  blockquote: (node, view, getPos) => new BlockquoteView(node, view, getPos),
  horizontal_rule: (node, view, getPos) => new HorizontalRuleView(node, view, getPos),
  task_list_item: (node, view, getPos) => new TaskListItemView(node, view, getPos),
  image: (node, view, getPos) => new ImageView(node, view, getPos),
  math_block: (node, view, getPos) => new MathBlockView(node, view, getPos),
  math_inline: (node, view, getPos) => new MathInlineView(node, view, getPos),
  frontmatter: (node, view, getPos) => new FrontmatterView(node, view, getPos),
};

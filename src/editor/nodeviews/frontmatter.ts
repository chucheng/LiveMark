import { Node } from "prosemirror-model";
import { EditorView, NodeView, type ViewMutationRecord } from "prosemirror-view";

/**
 * Frontmatter NodeView: shows YAML content in a styled card.
 * Dual-mode: rendered as a card when cursor is outside, raw editing when inside.
 */
export class FrontmatterView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;

  constructor(
    private node: Node,
    private view: EditorView,
    private getPos: () => number | undefined
  ) {
    this.dom = document.createElement("div");
    this.dom.className = "lm-frontmatter-wrapper";

    const label = document.createElement("span");
    label.className = "lm-frontmatter-label";
    label.textContent = "frontmatter";
    this.dom.appendChild(label);

    this.contentDOM = document.createElement("pre");
    this.contentDOM.className = "lm-frontmatter-content";
    this.dom.appendChild(this.contentDOM);
  }

  update(node: Node): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    return true;
  }

  ignoreMutation(mutation: ViewMutationRecord): boolean {
    return mutation.type !== "selection";
  }
}

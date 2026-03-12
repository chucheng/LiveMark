import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";

export class BlockquoteView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private hintEl: HTMLElement;

  constructor(_node: Node, _view: EditorView, _getPos: () => number | undefined) {
    this.dom = document.createElement("div");
    this.dom.className = "lm-blockquote-wrapper";

    this.hintEl = document.createElement("span");
    this.hintEl.className = "lm-syntax-hint lm-blockquote-hint";
    this.hintEl.textContent = ">";
    this.hintEl.contentEditable = "false";

    this.contentDOM = document.createElement("blockquote");

    this.dom.appendChild(this.hintEl);
    this.dom.appendChild(this.contentDOM);
  }

  update(node: Node): boolean {
    return node.type.name === "blockquote";
  }
}

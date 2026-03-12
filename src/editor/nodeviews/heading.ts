import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";

export class HeadingView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private headingEl: HTMLElement;
  private hintEl: HTMLElement;

  constructor(node: Node, _view: EditorView, _getPos: () => number | undefined) {
    const level = node.attrs.level as number;

    this.dom = document.createElement("div");
    this.dom.className = "lm-heading-wrapper";

    this.headingEl = document.createElement(`h${level}`);

    this.hintEl = document.createElement("span");
    this.hintEl.className = "lm-syntax-hint";
    this.hintEl.textContent = "#".repeat(level) + " ";
    this.hintEl.contentEditable = "false";

    this.contentDOM = document.createElement("span");
    this.contentDOM.className = "lm-heading-content";

    this.headingEl.appendChild(this.hintEl);
    this.headingEl.appendChild(this.contentDOM);
    this.dom.appendChild(this.headingEl);
  }

  update(node: Node): boolean {
    if (node.type.name !== "heading") return false;

    const level = node.attrs.level as number;
    const tag = `h${level}`;

    // If level changed, rebuild the heading element
    if (this.headingEl.tagName.toLowerCase() !== tag) {
      const newHeading = document.createElement(tag);
      newHeading.appendChild(this.hintEl);
      newHeading.appendChild(this.contentDOM);
      this.dom.replaceChild(newHeading, this.headingEl);
      this.headingEl = newHeading;
    }

    this.hintEl.textContent = "#".repeat(level) + " ";
    return true;
  }
}

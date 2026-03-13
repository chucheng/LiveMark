import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import katex from "katex";

export class MathInlineView implements NodeView {
  dom: HTMLElement;
  private renderedEl: HTMLElement;
  private node: Node;

  constructor(node: Node, _view: EditorView, _getPos: () => number | undefined) {
    this.node = node;

    this.dom = document.createElement("span");
    this.dom.className = "lm-math-inline-wrapper";

    this.renderedEl = document.createElement("span");
    this.renderedEl.className = "lm-math-rendered";
    this.renderedEl.contentEditable = "false";

    this.dom.appendChild(this.renderedEl);
    this.renderMath(node.attrs.tex);
  }

  private renderMath(tex: string) {
    try {
      this.renderedEl.innerHTML = katex.renderToString(tex, {
        displayMode: false,
        throwOnError: false,
      });
      this.renderedEl.classList.remove("lm-math-error");
    } catch {
      this.renderedEl.textContent = tex;
      this.renderedEl.classList.add("lm-math-error");
    }
  }

  selectNode() {
    this.dom.classList.add("ProseMirror-selectednode");
  }

  deselectNode() {
    this.dom.classList.remove("ProseMirror-selectednode");
  }

  update(node: Node): boolean {
    if (node.type.name !== "math_inline") return false;
    if (node.attrs.tex !== this.node.attrs.tex) {
      this.node = node;
      this.renderMath(node.attrs.tex);
    }
    return true;
  }

  ignoreMutation(): boolean {
    return true;
  }

  stopEvent(): boolean {
    return false;
  }
}

import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import katex from "katex";

export class MathBlockView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private openFence: HTMLElement;
  private closeFence: HTMLElement;
  private renderedEl: HTMLElement;

  constructor(node: Node, _view: EditorView, _getPos: () => number | undefined) {
    this.dom = document.createElement("div");
    this.dom.className = "lm-math-block-wrapper";

    this.openFence = document.createElement("div");
    this.openFence.className = "lm-syntax-hint lm-fence";
    this.openFence.textContent = "$$";
    this.openFence.contentEditable = "false";

    const container = document.createElement("div");
    container.className = "lm-math-block-container";

    this.renderedEl = document.createElement("div");
    this.renderedEl.className = "lm-math-rendered";
    this.renderedEl.contentEditable = "false";

    this.contentDOM = document.createElement("code");
    this.contentDOM.className = "lm-math-source";

    container.appendChild(this.renderedEl);
    container.appendChild(this.contentDOM);

    this.closeFence = document.createElement("div");
    this.closeFence.className = "lm-syntax-hint lm-fence";
    this.closeFence.textContent = "$$";
    this.closeFence.contentEditable = "false";

    this.dom.appendChild(this.openFence);
    this.dom.appendChild(container);
    this.dom.appendChild(this.closeFence);

    this.renderMath(node.textContent);
  }

  private renderMath(tex: string) {
    try {
      this.renderedEl.innerHTML = katex.renderToString(tex, {
        displayMode: true,
        throwOnError: false,
      });
      this.renderedEl.classList.remove("lm-math-error");
    } catch {
      this.renderedEl.textContent = tex || " ";
      this.renderedEl.classList.add("lm-math-error");
    }
  }

  update(node: Node): boolean {
    if (node.type.name !== "math_block") return false;
    this.renderMath(node.textContent);
    return true;
  }

  selectNode() {
    this.dom.classList.add("ProseMirror-selectednode");
  }

  deselectNode() {
    this.dom.classList.remove("ProseMirror-selectednode");
  }
}

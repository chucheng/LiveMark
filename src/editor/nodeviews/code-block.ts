import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";

export class CodeBlockView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private openFence: HTMLElement;
  private closeFence: HTMLElement;

  constructor(node: Node, _view: EditorView, _getPos: () => number | undefined) {
    const lang = (node.attrs.language as string) || "";

    this.dom = document.createElement("div");
    this.dom.className = "lm-code-block-wrapper";

    this.openFence = document.createElement("div");
    this.openFence.className = "lm-syntax-hint lm-fence";
    this.openFence.textContent = "```" + lang;
    this.openFence.contentEditable = "false";

    const pre = document.createElement("pre");
    this.contentDOM = document.createElement("code");
    if (lang) this.contentDOM.className = `language-${lang}`;
    pre.appendChild(this.contentDOM);

    this.closeFence = document.createElement("div");
    this.closeFence.className = "lm-syntax-hint lm-fence";
    this.closeFence.textContent = "```";
    this.closeFence.contentEditable = "false";

    this.dom.appendChild(this.openFence);
    this.dom.appendChild(pre);
    this.dom.appendChild(this.closeFence);
  }

  update(node: Node): boolean {
    if (node.type.name !== "code_block") return false;
    const lang = (node.attrs.language as string) || "";
    this.openFence.textContent = "```" + lang;
    if (lang) {
      this.contentDOM.className = `language-${lang}`;
    } else {
      this.contentDOM.className = "";
    }
    return true;
  }
}

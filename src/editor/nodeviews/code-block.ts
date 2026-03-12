import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import { highlightCode } from "../highlight";

export class CodeBlockView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private openFence: HTMLElement;
  private closeFence: HTMLElement;
  private highlightEl: HTMLElement;
  private language: string;

  constructor(node: Node, _view: EditorView, _getPos: () => number | undefined) {
    this.language = (node.attrs.language as string) || "";

    this.dom = document.createElement("div");
    this.dom.className = "lm-code-block-wrapper";

    this.openFence = document.createElement("div");
    this.openFence.className = "lm-syntax-hint lm-fence";
    this.openFence.textContent = "```" + this.language;
    this.openFence.contentEditable = "false";

    const pre = document.createElement("pre");

    // Highlighted overlay (non-editable)
    this.highlightEl = document.createElement("code");
    this.highlightEl.className = "lm-code-highlight";
    this.highlightEl.contentEditable = "false";

    // Editable content
    this.contentDOM = document.createElement("code");
    if (this.language) this.contentDOM.className = `language-${this.language}`;

    pre.appendChild(this.highlightEl);
    pre.appendChild(this.contentDOM);

    this.closeFence = document.createElement("div");
    this.closeFence.className = "lm-syntax-hint lm-fence";
    this.closeFence.textContent = "```";
    this.closeFence.contentEditable = "false";

    this.dom.appendChild(this.openFence);
    this.dom.appendChild(pre);
    this.dom.appendChild(this.closeFence);

    this.updateHighlight(node.textContent);
  }

  private updateHighlight(code: string) {
    this.highlightEl.innerHTML = highlightCode(code, this.language);
  }

  update(node: Node): boolean {
    if (node.type.name !== "code_block") return false;
    const lang = (node.attrs.language as string) || "";
    this.language = lang;
    this.openFence.textContent = "```" + lang;
    if (lang) {
      this.contentDOM.className = `language-${lang}`;
    } else {
      this.contentDOM.className = "";
    }
    this.updateHighlight(node.textContent);
    return true;
  }
}

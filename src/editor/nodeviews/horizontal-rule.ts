import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";

export class HorizontalRuleView implements NodeView {
  dom: HTMLElement;

  constructor(_node: Node, _view: EditorView, _getPos: () => number | undefined) {
    this.dom = document.createElement("div");
    this.dom.className = "lm-hr-wrapper";

    const hr = document.createElement("hr");

    const hint = document.createElement("span");
    hint.className = "lm-syntax-hint lm-hr-hint";
    hint.textContent = "---";
    hint.contentEditable = "false";

    this.dom.appendChild(hr);
    this.dom.appendChild(hint);
  }

  // Leaf node — no contentDOM
  stopEvent() {
    return false;
  }

  ignoreMutation() {
    return true;
  }
}

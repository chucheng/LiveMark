import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";

export class HorizontalRuleView implements NodeView {
  dom: HTMLElement;

  constructor(_node: Node, _view: EditorView, _getPos: () => number | undefined) {
    this.dom = document.createElement("div");
    this.dom.className = "lm-hr-wrapper";

    const rule = document.createElement("div");
    rule.className = "lm-hr-line";

    const ornament = document.createElement("span");
    ornament.className = "lm-hr-ornament";
    ornament.textContent = "***";
    ornament.contentEditable = "false";

    const hint = document.createElement("span");
    hint.className = "lm-syntax-hint lm-hr-hint";
    hint.textContent = "---";
    hint.contentEditable = "false";

    rule.appendChild(ornament);

    this.dom.appendChild(rule);
    this.dom.appendChild(hint);
  }

  stopEvent() {
    return false;
  }

  ignoreMutation() {
    return true;
  }
}

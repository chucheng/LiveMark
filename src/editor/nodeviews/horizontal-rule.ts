import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import { NodeSelection } from "prosemirror-state";

export class HorizontalRuleView implements NodeView {
  dom: HTMLElement;
  private handleMousedown: (e: MouseEvent) => void;

  constructor(_node: Node, private view: EditorView, private getPos: () => number | undefined) {
    this.dom = document.createElement("div");
    this.dom.className = "lm-hr-wrapper";

    const line = document.createElement("div");
    line.className = "lm-hr-line";

    const dot = document.createElement("span");
    dot.className = "lm-hr-dot";
    line.appendChild(dot);

    this.dom.appendChild(line);

    // Click to node-select — then Backspace/Delete removes it
    this.handleMousedown = (e: MouseEvent) => {
      e.preventDefault();
      const pos = this.getPos();
      if (pos === undefined) return;
      this.view.dispatch(
        this.view.state.tr.setSelection(NodeSelection.create(this.view.state.doc, pos))
      );
      this.view.focus();
    };
    this.dom.addEventListener("mousedown", this.handleMousedown);
  }

  stopEvent() {
    return true;
  }

  ignoreMutation() {
    return true;
  }

  destroy() {
    this.dom.removeEventListener("mousedown", this.handleMousedown);
    (this as any).view = null;
    (this as any).getPos = null;
  }
}

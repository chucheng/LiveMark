import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";

export class TaskListItemView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private checkbox: HTMLInputElement;

  constructor(
    private node: Node,
    private view: EditorView,
    private getPos: () => number | undefined
  ) {
    this.dom = document.createElement("li");
    this.dom.className = "lm-task-item";
    if (node.attrs.checked) this.dom.classList.add("checked");

    this.checkbox = document.createElement("input");
    this.checkbox.type = "checkbox";
    this.checkbox.checked = node.attrs.checked;
    this.checkbox.contentEditable = "false";
    // Handle toggle on mousedown: preventDefault stops focus steal AND
    // prevents the browser from toggling the checkbox independently.
    // We drive checked state entirely through ProseMirror.
    this.checkbox.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const pos = this.getPos();
      if (pos === undefined) return;
      const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
        ...this.node.attrs,
        checked: !this.node.attrs.checked,
      });
      this.view.dispatch(tr);
    });

    this.contentDOM = document.createElement("div");
    this.contentDOM.className = "lm-task-content";

    this.dom.appendChild(this.checkbox);
    this.dom.appendChild(this.contentDOM);
  }

  update(node: Node): boolean {
    if (node.type.name !== "task_list_item") return false;
    this.node = node;
    this.checkbox.checked = node.attrs.checked;
    if (node.attrs.checked) {
      this.dom.classList.add("checked");
    } else {
      this.dom.classList.remove("checked");
    }
    return true;
  }
}

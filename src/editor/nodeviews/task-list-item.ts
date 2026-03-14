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
    // Block native click toggle — we drive checked state entirely
    // through ProseMirror to keep DOM and doc in sync.
    this.checkbox.addEventListener("click", (e) => {
      e.preventDefault();
    });
    // Toggle on mousedown: preventDefault stops focus steal.
    this.checkbox.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const pos = this.getPos();
      if (pos === undefined) return;
      // Read fresh node attrs from current editor state to avoid stale data
      const freshNode = this.view.state.doc.nodeAt(pos);
      if (!freshNode || freshNode.type.name !== "task_list_item") return;
      const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
        ...freshNode.attrs,
        checked: !freshNode.attrs.checked,
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

  destroy() {
    // Event listeners on this.checkbox are cleaned up when
    // the DOM node is removed and garbage collected.
    // Null out references to help GC and prevent stale access.
    (this as any).view = null;
    (this as any).getPos = null;
  }
}

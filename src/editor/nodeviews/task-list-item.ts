import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";

export class TaskListItemView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private checkboxEl: HTMLElement;
  private handleMousedown: (e: Event) => void;

  constructor(
    private node: Node,
    private view: EditorView,
    private getPos: () => number | undefined
  ) {
    this.dom = document.createElement("li");
    this.dom.className = "lm-task-item";
    if (node.attrs.checked) this.dom.classList.add("checked");

    // Custom checkbox element (replaces native <input> for styling control)
    this.checkboxEl = document.createElement("span");
    this.checkboxEl.className = "lm-task-checkbox";
    this.checkboxEl.setAttribute("role", "checkbox");
    this.checkboxEl.setAttribute(
      "aria-checked",
      String(node.attrs.checked)
    );
    this.checkboxEl.contentEditable = "false";

    // SVG checkmark — only visible when checked via CSS
    this.checkboxEl.innerHTML = `<svg class="lm-task-check-icon" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    // Toggle on mousedown: preventDefault stops focus steal.
    this.handleMousedown = (e: Event) => {
      e.preventDefault();
      const pos = this.getPos();
      if (pos === undefined) return;
      const freshNode = this.view.state.doc.nodeAt(pos);
      if (!freshNode || freshNode.type.name !== "task_list_item") return;
      const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
        ...freshNode.attrs,
        checked: !freshNode.attrs.checked,
      });
      this.view.dispatch(tr);
    };
    this.checkboxEl.addEventListener("mousedown", this.handleMousedown);

    this.contentDOM = document.createElement("div");
    this.contentDOM.className = "lm-task-content";

    this.dom.appendChild(this.checkboxEl);
    this.dom.appendChild(this.contentDOM);
  }

  update(node: Node): boolean {
    if (node.type.name !== "task_list_item") return false;
    this.node = node;
    this.checkboxEl.setAttribute(
      "aria-checked",
      String(node.attrs.checked)
    );
    if (node.attrs.checked) {
      this.dom.classList.add("checked");
    } else {
      this.dom.classList.remove("checked");
    }
    return true;
  }

  destroy() {
    this.checkboxEl.removeEventListener("mousedown", this.handleMousedown);
  }
}

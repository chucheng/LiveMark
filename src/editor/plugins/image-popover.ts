import { Plugin, PluginKey, NodeSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

const pluginKey = new PluginKey("imagePopover");

class ImagePopover {
  private el: HTMLElement;
  private altInput: HTMLInputElement;
  private titleInput: HTMLInputElement;
  private widthInput: HTMLInputElement;
  private view: EditorView;
  private pos: number;
  private onKeydown: (e: KeyboardEvent) => void;
  private onScroll: () => void;

  constructor(view: EditorView, pos: number) {
    this.view = view;
    this.pos = pos;

    const node = view.state.doc.nodeAt(pos)!;

    this.el = document.createElement("div");
    this.el.className = "lm-image-popover";
    this.el.contentEditable = "false";

    // Alt text row
    this.altInput = this.createInput("Alt text", node.attrs.alt || "");
    this.altInput.addEventListener("input", () => this.updateAttr("alt", this.altInput.value));

    // Title row
    this.titleInput = this.createInput("Title", node.attrs.title || "");
    this.titleInput.addEventListener("input", () => this.updateAttr("title", this.titleInput.value));

    // Width row
    this.widthInput = this.createInput("Width (px)", node.attrs.width ? String(node.attrs.width) : "");
    this.widthInput.type = "number";
    this.widthInput.min = "50";
    this.widthInput.addEventListener("input", () => {
      const val = this.widthInput.value ? Number(this.widthInput.value) : null;
      this.updateAttr("width", val && val >= 50 ? val : null);
    });

    // Action row
    const actions = document.createElement("div");
    actions.className = "lm-image-popover-actions";

    const replaceBtn = document.createElement("button");
    replaceBtn.className = "lm-image-popover-btn";
    replaceBtn.textContent = "Replace…";
    replaceBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.replaceImage();
    });

    const resetWidthBtn = document.createElement("button");
    resetWidthBtn.className = "lm-image-popover-btn";
    resetWidthBtn.textContent = "Reset width";
    resetWidthBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.widthInput.value = "";
      this.updateAttr("width", null);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "lm-image-popover-btn lm-image-popover-btn-danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.deleteImage();
    });

    actions.appendChild(replaceBtn);
    actions.appendChild(resetWidthBtn);
    actions.appendChild(deleteBtn);

    this.el.appendChild(this.createRow("Alt", this.altInput));
    this.el.appendChild(this.createRow("Title", this.titleInput));
    this.el.appendChild(this.createRow("Width", this.widthInput));
    this.el.appendChild(actions);

    // Mount in editor container so positioning works
    const editorContainer = view.dom.parentElement || document.body;
    editorContainer.appendChild(this.el);

    this.position();

    // Close on Escape
    this.onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        // Refocus editor
        this.view.focus();
      }
    };
    this.el.addEventListener("keydown", this.onKeydown);

    // Reposition on scroll
    this.onScroll = () => this.position();
    view.dom.addEventListener("scroll", this.onScroll);
  }

  private createInput(placeholder: string, value: string): HTMLInputElement {
    const input = document.createElement("input");
    input.className = "lm-image-popover-input";
    input.placeholder = placeholder;
    input.value = value;
    return input;
  }

  private createRow(label: string, input: HTMLInputElement): HTMLElement {
    const row = document.createElement("div");
    row.className = "lm-image-popover-row";
    const lbl = document.createElement("label");
    lbl.className = "lm-image-popover-label";
    lbl.textContent = label;
    row.appendChild(lbl);
    row.appendChild(input);
    return row;
  }

  private position() {
    const domNode = this.view.nodeDOM(this.pos);
    if (!domNode || !(domNode instanceof HTMLElement)) return;

    const imgEl = domNode.querySelector("img") || domNode;
    const rect = imgEl.getBoundingClientRect();
    const containerRect = (this.view.dom.parentElement || document.body).getBoundingClientRect();

    this.el.style.left = `${rect.left - containerRect.left}px`;
    this.el.style.top = `${rect.bottom - containerRect.top + 6}px`;
  }

  private updateAttr(attr: string, value: string | number | null) {
    const { tr } = this.view.state;
    const node = tr.doc.nodeAt(this.pos);
    if (!node || node.type.name !== "image") return;

    tr.setNodeMarkup(this.pos, undefined, {
      ...node.attrs,
      [attr]: value || null,
    });
    this.view.dispatch(tr);
  }

  private async replaceImage() {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"] },
        ],
      });
      if (!selected) return;

      const savedPath: string = await invoke("save_image", { sourcePath: selected });

      const { tr } = this.view.state;
      const node = tr.doc.nodeAt(this.pos);
      if (!node || node.type.name !== "image") return;

      tr.setNodeMarkup(this.pos, undefined, {
        ...node.attrs,
        src: savedPath,
      });
      this.view.dispatch(tr);
    } catch {
      // User cancelled or error — ignore
    }
  }

  private deleteImage() {
    const { tr } = this.view.state;
    const node = tr.doc.nodeAt(this.pos);
    if (!node) return;
    tr.delete(this.pos, this.pos + node.nodeSize);
    this.view.dispatch(tr);
  }

  updatePos(pos: number) {
    this.pos = pos;
    const node = this.view.state.doc.nodeAt(pos);
    if (node && node.type.name === "image") {
      this.altInput.value = node.attrs.alt || "";
      this.titleInput.value = node.attrs.title || "";
      this.widthInput.value = node.attrs.width ? String(node.attrs.width) : "";
    }
    this.position();
  }

  destroy() {
    this.el.removeEventListener("keydown", this.onKeydown);
    this.view.dom.removeEventListener("scroll", this.onScroll);
    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}

export function imagePopoverPlugin() {
  let popover: ImagePopover | null = null;

  return new Plugin({
    key: pluginKey,
    view() {
      return {
        update(view) {
          const { selection } = view.state;
          if (
            selection instanceof NodeSelection &&
            selection.node.type.name === "image"
          ) {
            const pos = selection.from;
            if (popover) {
              popover.updatePos(pos);
            } else {
              popover = new ImagePopover(view, pos);
            }
          } else {
            if (popover) {
              popover.destroy();
              popover = null;
            }
          }
        },
        destroy() {
          if (popover) {
            popover.destroy();
            popover = null;
          }
        },
      };
    },
  });
}

import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import { convertFileSrc } from "@tauri-apps/api/core";

export class ImageView implements NodeView {
  dom: HTMLElement;
  private img: HTMLImageElement;
  private errorSpan: HTMLSpanElement | null = null;
  private resizeHandle: HTMLElement | null = null;
  private resizing = false;

  constructor(
    private node: Node,
    private view: EditorView,
    private getPos: () => number | undefined
  ) {
    this.dom = document.createElement("span");
    this.dom.className = "lm-image-wrapper";

    this.img = document.createElement("img");
    this.img.alt = node.attrs.alt || "";
    if (node.attrs.title) this.img.title = node.attrs.title;
    if (node.attrs.width) this.img.style.width = `${node.attrs.width}px`;
    this.setSrc(node.attrs.src);

    this.img.onerror = () => {
      if (!this.dom.isConnected) return;
      this.showError(this.node.attrs.alt || "Image not found");
    };

    this.dom.appendChild(this.img);

    // Resize handle
    this.resizeHandle = document.createElement("span");
    this.resizeHandle.className = "lm-image-resize-handle";
    this.resizeHandle.contentEditable = "false";
    this.resizeHandle.addEventListener("mousedown", (e) => this.onResizeStart(e));
    this.dom.appendChild(this.resizeHandle);
  }

  private onResizeStart(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.resizing = true;

    const startX = e.clientX;
    const startWidth = this.img.offsetWidth;
    const maxWidth = (this.dom.parentElement?.clientWidth || 800);

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.max(50, Math.min(maxWidth, startWidth + delta));
      this.img.style.width = `${newWidth}px`;
    };

    const onMouseUp = (e: MouseEvent) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      this.resizing = false;

      const delta = e.clientX - startX;
      const newWidth = Math.max(50, Math.min(maxWidth, startWidth + delta));

      const pos = this.getPos();
      if (pos === undefined) return;

      const { tr } = this.view.state;
      const node = tr.doc.nodeAt(pos);
      if (!node || node.type.name !== "image") return;

      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        width: Math.round(newWidth),
      });
      this.view.dispatch(tr);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  private showError(text: string) {
    this.dom.classList.add("lm-image-error");
    this.img.style.display = "none";
    if (this.resizeHandle) this.resizeHandle.style.display = "none";
    if (!this.errorSpan) {
      this.errorSpan = document.createElement("span");
      this.dom.appendChild(this.errorSpan);
    }
    this.errorSpan.textContent = text;
  }

  private clearError() {
    this.dom.classList.remove("lm-image-error");
    this.img.style.display = "";
    if (this.resizeHandle) this.resizeHandle.style.display = "";
    if (this.errorSpan) {
      this.errorSpan.remove();
      this.errorSpan = null;
    }
  }

  private setSrc(src: string) {
    if (src && (src.startsWith("/") || src.match(/^[A-Z]:\\/))) {
      this.img.src = convertFileSrc(src);
    } else {
      this.img.src = src;
    }
  }

  selectNode() {
    this.dom.classList.add("ProseMirror-selectednode");
  }

  deselectNode() {
    this.dom.classList.remove("ProseMirror-selectednode");
  }

  update(node: Node): boolean {
    if (node.type.name !== "image") return false;
    this.node = node;
    this.img.alt = node.attrs.alt || "";
    if (node.attrs.title) this.img.title = node.attrs.title;
    else this.img.removeAttribute("title");

    if (node.attrs.width) {
      this.img.style.width = `${node.attrs.width}px`;
    } else {
      this.img.style.width = "";
    }

    this.clearError();
    this.setSrc(node.attrs.src);
    return true;
  }

  ignoreMutation(): boolean {
    return true;
  }

  stopEvent(event: Event): boolean {
    const target = event.target as HTMLElement;
    if (this.resizeHandle?.contains(target)) return true;
    if (this.resizing) return true;
    return false;
  }

  destroy() {
    this.img.onerror = null;
  }
}

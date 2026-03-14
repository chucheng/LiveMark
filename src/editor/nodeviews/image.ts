import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import { convertFileSrc } from "@tauri-apps/api/core";

export class ImageView implements NodeView {
  dom: HTMLElement;
  private img: HTMLImageElement;
  private errorSpan: HTMLSpanElement | null = null;

  constructor(
    private node: Node,
    _view: EditorView,
    _getPos: () => number | undefined
  ) {
    this.dom = document.createElement("span");
    this.dom.className = "lm-image-wrapper";

    this.img = document.createElement("img");
    this.img.alt = node.attrs.alt || "";
    if (node.attrs.title) this.img.title = node.attrs.title;
    this.setSrc(node.attrs.src);

    this.img.onerror = () => {
      if (!this.dom.isConnected) return;
      this.showError(this.node.attrs.alt || "Image not found");
    };

    this.dom.appendChild(this.img);
  }

  private showError(text: string) {
    this.dom.classList.add("lm-image-error");
    this.img.style.display = "none";
    if (!this.errorSpan) {
      this.errorSpan = document.createElement("span");
      this.dom.appendChild(this.errorSpan);
    }
    this.errorSpan.textContent = text;
  }

  private clearError() {
    this.dom.classList.remove("lm-image-error");
    this.img.style.display = "";
    if (this.errorSpan) {
      this.errorSpan.remove();
      this.errorSpan = null;
    }
  }

  private setSrc(src: string) {
    // Local absolute path → Tauri asset protocol
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
    this.clearError();
    this.setSrc(node.attrs.src);
    return true;
  }

  ignoreMutation(): boolean {
    return true;
  }

  stopEvent(): boolean {
    return false;
  }

  destroy() {
    this.img.onerror = null;
  }
}

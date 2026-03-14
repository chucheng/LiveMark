import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";

const CALLOUT_CONFIG: Record<string, { icon: string; label: string }> = {
  NOTE: { icon: "ℹ️", label: "Note" },
  TIP: { icon: "💡", label: "Tip" },
  WARNING: { icon: "⚠️", label: "Warning" },
  CAUTION: { icon: "🔴", label: "Caution" },
  IMPORTANT: { icon: "❗", label: "Important" },
};

export class BlockquoteView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private hintEl: HTMLElement;
  private badgeEl: HTMLElement | null = null;

  constructor(node: Node, _view: EditorView, _getPos: () => number | undefined) {
    this.dom = document.createElement("div");
    this.dom.className = "lm-blockquote-wrapper";

    this.hintEl = document.createElement("span");
    this.hintEl.className = "lm-syntax-hint lm-blockquote-hint";
    this.hintEl.contentEditable = "false";

    this.contentDOM = document.createElement("blockquote");

    this.dom.appendChild(this.hintEl);
    this.dom.appendChild(this.contentDOM);

    this.applyCallout(node);
  }

  private applyCallout(node: Node) {
    const type: string | null = node.attrs.calloutType;

    // Remove old callout classes
    this.dom.classList.remove("lm-callout");
    for (const key of Object.keys(CALLOUT_CONFIG)) {
      this.dom.classList.remove(`lm-callout-${key}`);
    }

    if (type && CALLOUT_CONFIG[type]) {
      const config = CALLOUT_CONFIG[type];
      this.dom.classList.add("lm-callout", `lm-callout-${type}`);
      this.hintEl.textContent = `> [!${type}]`;

      if (!this.badgeEl) {
        this.badgeEl = document.createElement("span");
        this.badgeEl.className = "lm-callout-badge";
        this.badgeEl.contentEditable = "false";
        this.contentDOM.insertBefore(this.badgeEl, this.contentDOM.firstChild);
      }
      this.badgeEl.textContent = `${config.icon} ${config.label}`;
    } else {
      this.hintEl.textContent = ">";
      if (this.badgeEl) {
        this.badgeEl.remove();
        this.badgeEl = null;
      }
    }
  }

  update(node: Node): boolean {
    if (node.type.name !== "blockquote") return false;
    this.applyCallout(node);
    return true;
  }

  selectNode() {
    this.dom.classList.add("ProseMirror-selectednode");
  }

  deselectNode() {
    this.dom.classList.remove("ProseMirror-selectednode");
  }
}

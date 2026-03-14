import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import { CalloutDropdown } from "./callout-dropdown";

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
  private dropdown: CalloutDropdown | null = null;
  private currentCalloutType: string | null = null;

  constructor(
    node: Node,
    private view: EditorView,
    private getPos: () => number | undefined
  ) {
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
    this.currentCalloutType = type;

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
        this.badgeEl.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleDropdown();
        });
        this.dom.insertBefore(this.badgeEl, this.contentDOM);
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

  private toggleDropdown() {
    if (this.dropdown) {
      this.dropdown.destroy();
      this.dropdown = null;
      return;
    }
    if (!this.badgeEl) return;
    this.dropdown = new CalloutDropdown(
      this.view,
      this.getPos,
      this.currentCalloutType,
      this.badgeEl
    );
  }

  update(node: Node): boolean {
    if (node.type.name !== "blockquote") return false;
    this.applyCallout(node);
    return true;
  }

  stopEvent(event: Event): boolean {
    const target = event.target as HTMLElement;
    // Let badge clicks and dropdown interactions bypass ProseMirror
    if (this.badgeEl?.contains(target)) return true;
    if (this.dropdown?.dom.contains(target)) return true;
    return false;
  }

  selectNode() {
    this.dom.classList.add("ProseMirror-selectednode");
  }

  deselectNode() {
    this.dom.classList.remove("ProseMirror-selectednode");
  }

  destroy() {
    if (this.dropdown) {
      this.dropdown.destroy();
      this.dropdown = null;
    }
  }
}

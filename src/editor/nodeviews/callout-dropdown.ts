import { EditorView } from "prosemirror-view";

export interface CalloutOption {
  type: string;
  icon: string;
  label: string;
}

const CALLOUT_OPTIONS: CalloutOption[] = [
  { type: "NOTE", icon: "ℹ️", label: "Note" },
  { type: "TIP", icon: "💡", label: "Tip" },
  { type: "WARNING", icon: "⚠️", label: "Warning" },
  { type: "CAUTION", icon: "🔴", label: "Caution" },
  { type: "IMPORTANT", icon: "❗", label: "Important" },
];

export class CalloutDropdown {
  private el: HTMLElement;
  private onOutsideClick: (e: MouseEvent) => void;
  private onKeydown: (e: KeyboardEvent) => void;

  constructor(
    private view: EditorView,
    private getPos: () => number | undefined,
    private currentType: string | null,
    anchorEl: HTMLElement
  ) {
    this.el = document.createElement("div");
    this.el.className = "lm-callout-dropdown";
    this.el.contentEditable = "false";

    for (const opt of CALLOUT_OPTIONS) {
      const item = document.createElement("div");
      item.className = "lm-callout-dropdown-item";
      if (opt.type === currentType) item.classList.add("lm-callout-dropdown-active");
      item.textContent = `${opt.icon} ${opt.label}`;
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectType(opt.type);
      });
      this.el.appendChild(item);
    }

    // Divider
    const divider = document.createElement("div");
    divider.className = "lm-callout-dropdown-divider";
    this.el.appendChild(divider);

    // Remove callout option
    const removeItem = document.createElement("div");
    removeItem.className = "lm-callout-dropdown-item lm-callout-dropdown-remove";
    removeItem.textContent = "Remove callout";
    removeItem.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.selectType(null);
    });
    this.el.appendChild(removeItem);

    // Position below badge
    const rect = anchorEl.getBoundingClientRect();
    this.el.style.position = "fixed";
    this.el.style.left = `${rect.left}px`;
    this.el.style.top = `${rect.bottom + 4}px`;
    this.el.style.zIndex = "1000";

    document.body.appendChild(this.el);

    // Close handlers
    this.onOutsideClick = (e: MouseEvent) => {
      if (!this.el.contains(e.target as Node)) {
        this.destroy();
      }
    };
    this.onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.destroy();
      }
    };

    // Delay listener attachment to avoid immediate close from the triggering click
    requestAnimationFrame(() => {
      document.addEventListener("mousedown", this.onOutsideClick, true);
      document.addEventListener("keydown", this.onKeydown, true);
    });
  }

  private selectType(type: string | null) {
    const pos = this.getPos();
    if (pos === undefined) {
      this.destroy();
      return;
    }

    const { tr } = this.view.state;
    const node = tr.doc.nodeAt(pos);
    if (!node || node.type.name !== "blockquote") {
      this.destroy();
      return;
    }

    tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      calloutType: type,
    });
    this.view.dispatch(tr);
    this.destroy();
  }

  get dom(): HTMLElement {
    return this.el;
  }

  destroy() {
    document.removeEventListener("mousedown", this.onOutsideClick, true);
    document.removeEventListener("keydown", this.onKeydown, true);
    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}

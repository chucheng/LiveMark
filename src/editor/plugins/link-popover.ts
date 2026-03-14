import { Plugin, PluginKey, Selection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Mark, ResolvedPos } from "prosemirror-model";
import { open } from "@tauri-apps/plugin-shell";
import { clampMenuPosition } from "@/utils/viewport";
import { schema } from "../schema";
import { DANGEROUS_SCHEMES, isLocalFile, resolveRelativePath } from "./link-helpers";
import { tabsState } from "@/state/tabs";
import { openFileInTab } from "@/commands/file-commands";

const pluginKey = new PluginKey("linkPopover");

/**
 * Find the contiguous range of text carrying a given mark
 * in the parent node of the resolved position.
 */
function getMarkRange(
  $pos: ResolvedPos,
  markType: Mark["type"]
): { from: number; to: number } | null {
  const parent = $pos.parent;
  const parentOffset = $pos.start();

  let from = -1;
  let to = -1;
  const index = $pos.index();

  // Walk children to find the range containing the index
  let offset = 0;
  for (let i = 0; i < parent.childCount; i++) {
    const child = parent.child(i);
    const childEnd = offset + child.nodeSize;
    if (child.marks.some((m) => m.type === markType)) {
      if (from === -1) from = offset;
      to = childEnd;
      // If we've passed the target index, stop extending
      if (i > index) break;
    } else {
      // Reset if we haven't reached the target index yet
      if (i < index) {
        from = -1;
        to = -1;
      } else {
        break;
      }
    }
    offset = childEnd;
  }

  if (from === -1) return null;
  return { from: parentOffset + from, to: parentOffset + to };
}

class LinkPopover {
  private el: HTMLElement;
  private onOutsideMousedown: (e: MouseEvent) => void;
  private onKeydown: (e: KeyboardEvent) => void;
  private onScroll: () => void;
  private destroyed = false;

  constructor(
    private view: EditorView,
    private anchorEl: HTMLElement,
    private href: string,
    private linkPos: { from: number; to: number }
  ) {
    this.el = document.createElement("div");
    this.el.className = "lm-link-popover";
    this.el.contentEditable = "false";

    // URL display
    const urlSpan = document.createElement("span");
    urlSpan.className = "lm-link-popover-url";
    urlSpan.textContent = href;
    urlSpan.title = href;
    this.el.appendChild(urlSpan);

    // Separator
    const sep = document.createElement("span");
    sep.className = "lm-link-popover-sep";
    this.el.appendChild(sep);

    // Action buttons
    const openBtn = this.createBtn("Open", () => this.openLink());
    const copyBtn = this.createBtn("Copy", () => this.copyLink(copyBtn));
    const editBtn = this.createBtn("Edit", () => this.editLink());
    const unlinkBtn = this.createBtn("Unlink", () => this.unlinkLink(), true);

    this.el.appendChild(openBtn);
    this.el.appendChild(copyBtn);
    this.el.appendChild(editBtn);
    this.el.appendChild(unlinkBtn);

    document.body.appendChild(this.el);
    this.position();

    // Close handlers
    this.onOutsideMousedown = (e: MouseEvent) => {
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
    this.onScroll = () => this.destroy();

    requestAnimationFrame(() => {
      if (this.destroyed) return;
      document.addEventListener("mousedown", this.onOutsideMousedown, true);
      document.addEventListener("keydown", this.onKeydown, true);
      view.dom.addEventListener("scroll", this.onScroll);
    });
  }

  private createBtn(
    label: string,
    onClick: () => void,
    danger = false
  ): HTMLElement {
    const btn = document.createElement("button");
    btn.className =
      "lm-link-popover-btn" + (danger ? " lm-link-popover-btn-danger" : "");
    btn.textContent = label;
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  private position() {
    const rect = this.anchorEl.getBoundingClientRect();
    // Temporarily make visible to measure
    this.el.style.visibility = "hidden";
    this.el.style.display = "flex";
    const popoverRect = this.el.getBoundingClientRect();
    const { x, y } = clampMenuPosition(
      rect.left,
      rect.bottom + 4,
      popoverRect.width,
      popoverRect.height
    );
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    this.el.style.visibility = "";
  }

  private openLink() {
    if (DANGEROUS_SCHEMES.test(this.href.trim())) return;
    if (isLocalFile(this.href)) {
      const currentPath = tabsState.filePath();
      if (currentPath) {
        const resolved = resolveRelativePath(currentPath, this.href);
        openFileInTab(resolved);
        this.destroy();
        return;
      }
    }
    open(this.href).catch(() => {});
    this.destroy();
  }

  private copyLink(btn: HTMLElement) {
    navigator.clipboard.writeText(this.href).then(() => {
      const original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => {
        if (!this.destroyed) btn.textContent = original;
      }, 1500);
    });
  }

  private editLink() {
    this.destroy();
    const { tr } = this.view.state;
    const resolvedPos = tr.doc.resolve(this.linkPos.from);
    tr.setSelection(Selection.near(resolvedPos));
    this.view.dispatch(tr);
    this.view.focus();
  }

  private unlinkLink() {
    const { tr } = this.view.state;
    tr.removeMark(this.linkPos.from, this.linkPos.to, schema.marks.link);
    this.view.dispatch(tr);
    this.destroy();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    document.removeEventListener("mousedown", this.onOutsideMousedown, true);
    document.removeEventListener("keydown", this.onKeydown, true);
    this.view.dom.removeEventListener("scroll", this.onScroll);
    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}

export function linkPopoverPlugin(): Plugin {
  let popover: LinkPopover | null = null;

  function closePopover() {
    if (popover) {
      popover.destroy();
      popover = null;
    }
  }

  return new Plugin({
    key: pluginKey,
    props: {
      handleDOMEvents: {
        mousedown(view: EditorView, event: MouseEvent) {
          // Don't intercept Cmd/Ctrl+click — let linkClickPlugin handle it
          if (event.metaKey || event.ctrlKey) return false;

          const target = event.target as HTMLElement;
          const anchor = target.closest("a") as HTMLAnchorElement | null;
          if (!anchor) return false;

          // Only intercept clicks on rendered links in non-active blocks
          if (anchor.closest(".lm-active")) return false;

          // Must be inside the editor
          if (!view.dom.contains(anchor)) return false;

          const href = anchor.getAttribute("href");
          if (!href) return false;

          // Resolve the ProseMirror position to find the link mark range
          const pos = view.posAtDOM(anchor, 0);
          const $pos = view.state.doc.resolve(pos);
          const linkMark = $pos.marks().find((m) => m.type === schema.marks.link);
          if (!linkMark) {
            // Try parent marks (the pos might be at the start)
            const $posAfter = view.state.doc.resolve(Math.min(pos + 1, view.state.doc.content.size));
            const linkMarkAfter = $posAfter.marks().find((m) => m.type === schema.marks.link);
            if (!linkMarkAfter) return false;

            const range = getMarkRange($posAfter, schema.marks.link);
            if (!range) return false;

            event.preventDefault();
            closePopover();
            popover = new LinkPopover(view, anchor, href, range);
            return true;
          }

          const range = getMarkRange($pos, schema.marks.link);
          if (!range) return false;

          event.preventDefault();
          closePopover();
          popover = new LinkPopover(view, anchor, href, range);
          return true;
        },
      },
    },
    view() {
      return {
        update(_view, prevState) {
          // Close popover if document changed (positions may have shifted)
          if (_view.state.doc !== prevState.doc) {
            closePopover();
          }
        },
        destroy() {
          closePopover();
        },
      };
    },
  });
}

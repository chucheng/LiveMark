import { Node } from "prosemirror-model";
import { EditorView, NodeView, type ViewMutationRecord } from "prosemirror-view";
import { renderMermaid } from "../mermaid-loader";

/**
 * Mermaid code block NodeView.
 * When the language is "mermaid" and the cursor is outside, renders the diagram.
 * When the cursor enters, shows the raw source for editing.
 */
export class MermaidView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private renderContainer: HTMLElement;
  private sourceContainer: HTMLElement;
  private labelEl: HTMLElement;
  private renderTimer: ReturnType<typeof setTimeout> | null = null;
  private lastRendered = "";
  private isActive = false;
  private renderGeneration = 0;
  private themeObserver: MutationObserver;

  constructor(
    private node: Node,
    private view: EditorView,
    private getPos: () => number | undefined
  ) {
    this.dom = document.createElement("div");
    this.dom.className = "lm-mermaid-wrapper";

    this.labelEl = document.createElement("span");
    this.labelEl.className = "lm-mermaid-label";
    this.labelEl.textContent = "mermaid";
    this.dom.appendChild(this.labelEl);

    this.renderContainer = document.createElement("div");
    this.renderContainer.className = "lm-mermaid-render";
    this.renderContainer.innerHTML = '<div class="lm-mermaid-loading">Loading diagram…</div>';
    this.dom.appendChild(this.renderContainer);

    this.sourceContainer = document.createElement("pre");
    this.sourceContainer.className = "lm-mermaid-source";
    this.sourceContainer.style.display = "none";
    this.dom.appendChild(this.sourceContainer);

    this.contentDOM = this.sourceContainer;

    // Re-render when theme changes (data-theme attribute on <html>)
    this.themeObserver = new MutationObserver(() => {
      this.lastRendered = ""; // Force re-render with new theme colors
      if (!this.isActive) {
        this.scheduleRender();
      }
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    this.scheduleRender();
  }

  update(node: Node): boolean {
    if (node.type !== this.node.type) return false;
    if (node.attrs.language !== "mermaid") return false;
    this.node = node;
    if (!this.isActive) {
      this.scheduleRender();
    }
    return true;
  }

  selectNode() {
    this.isActive = true;
    this.showSource();
  }

  deselectNode() {
    this.isActive = false;
    this.showRender();
    this.scheduleRender();
  }

  private showSource() {
    this.renderContainer.style.display = "none";
    this.sourceContainer.style.display = "";
  }

  private showRender() {
    this.renderContainer.style.display = "";
    this.sourceContainer.style.display = "none";
  }

  private scheduleRender() {
    if (this.renderTimer) clearTimeout(this.renderTimer);
    this.renderTimer = setTimeout(() => this.doRender(), 300);
  }

  private async doRender() {
    const source = this.node.textContent.trim();
    if (!source) {
      this.renderContainer.innerHTML = '<div class="lm-mermaid-loading">Empty diagram</div>';
      return;
    }
    if (source === this.lastRendered) return;

    const gen = ++this.renderGeneration;
    const result = await renderMermaid(source);
    // Discard stale results from superseded renders
    if (gen !== this.renderGeneration) return;

    if ("svg" in result) {
      this.renderContainer.innerHTML = result.svg;
      this.lastRendered = source;
    } else {
      const errorDiv = document.createElement("div");
      errorDiv.className = "lm-mermaid-error";
      errorDiv.textContent = result.error;
      this.renderContainer.innerHTML = "";
      this.renderContainer.appendChild(errorDiv);
      this.lastRendered = "";
    }
  }

  ignoreMutation(mutation: ViewMutationRecord): boolean {
    if (mutation.type === "selection") return false;
    return !this.contentDOM.contains(mutation.target);
  }

  destroy() {
    if (this.renderTimer) clearTimeout(this.renderTimer);
    this.themeObserver.disconnect();
  }
}

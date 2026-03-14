import { createSignal, createEffect, For, Show, onCleanup } from "solid-js";
import type { EditorView } from "prosemirror-view";
import { TextSelection } from "prosemirror-state";
import { analyzeDocument, type ReviewItem, type ReviewSeverity } from "../review/engine";
import { uiState } from "../state/ui";

interface ReviewPanelProps {
  view: () => EditorView | undefined;
}

const severityOrder: Record<ReviewSeverity, number> = {
  issue: 0,
  warning: 1,
  suggestion: 2,
};

const severityLabel: Record<ReviewSeverity, string> = {
  issue: "Issue",
  warning: "Warning",
  suggestion: "Suggestion",
};

export default function ReviewPanel(props: ReviewPanelProps) {
  const [items, setItems] = createSignal<ReviewItem[]>([]);
  const [activeId, setActiveId] = createSignal<string | null>(null);

  function runAnalysis() {
    const view = props.view();
    if (!view) return;
    const result = analyzeDocument(view.state.doc);
    result.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    setItems(result);
  }

  // Run analysis on open and on doc changes
  let patchedView: EditorView | null = null;
  let origDispatch: typeof EditorView.prototype.dispatch | null = null;

  createEffect(() => {
    const isOpen = uiState.isReviewOpen();
    const view = props.view();

    // Clean up previous patch
    if (patchedView && origDispatch) {
      patchedView.dispatch = origDispatch;
      patchedView = null;
      origDispatch = null;
    }

    if (!isOpen || !view) return;
    runAnalysis();

    // Listen for doc changes via a transaction listener
    origDispatch = view.dispatch.bind(view);
    patchedView = view;
    const saved = origDispatch;
    view.dispatch = (tr) => {
      saved(tr);
      if (tr.docChanged) {
        try {
          runAnalysis();
        } catch {
          // Don't break the dispatch chain if analysis fails
        }
      }
    };

    onCleanup(() => {
      if (patchedView && origDispatch) {
        patchedView.dispatch = origDispatch;
        patchedView = null;
        origDispatch = null;
      }
    });
  });

  function scrollToItem(item: ReviewItem) {
    const view = props.view();
    if (!view) return;
    setActiveId(item.id);

    const pos = Math.min(item.pos, view.state.doc.content.size);
    view.dispatch(
      view.state.tr.setSelection(
        TextSelection.near(view.state.doc.resolve(pos))
      )
    );
    view.focus();

    const dom = view.domAtPos(pos);
    if (dom.node) {
      const el = dom.node instanceof HTMLElement ? dom.node : dom.node.parentElement;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function close() {
    uiState.setReviewOpen(false);
  }

  const issueCount = () => items().filter((i) => i.severity === "issue").length;
  const warningCount = () => items().filter((i) => i.severity === "warning").length;
  const suggestionCount = () => items().filter((i) => i.severity === "suggestion").length;

  return (
    <div class="lm-review">
      <div class="lm-review-header">
        <div class="lm-review-header-top">
          <span class="lm-review-title">Review</span>
          <button class="lm-review-close" onClick={close} title="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </div>
        <div class="lm-review-summary">
          <Show when={items().length === 0}>
            <span class="lm-review-summary-clean">All clear</span>
          </Show>
          <Show when={items().length > 0}>
            <Show when={issueCount() > 0}>
              <span class="lm-review-count lm-review-count--issue">{issueCount()} {issueCount() === 1 ? "issue" : "issues"}</span>
            </Show>
            <Show when={warningCount() > 0}>
              <span class="lm-review-count lm-review-count--warning">{warningCount()} {warningCount() === 1 ? "warning" : "warnings"}</span>
            </Show>
            <Show when={suggestionCount() > 0}>
              <span class="lm-review-count lm-review-count--suggestion">{suggestionCount()} {suggestionCount() === 1 ? "suggestion" : "suggestions"}</span>
            </Show>
          </Show>
        </div>
      </div>

      <div class="lm-review-body">
        <Show when={items().length === 0}>
          <div class="lm-review-empty">
            <span class="lm-review-empty-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="12" stroke="currentColor" stroke-width="1.5" />
                <path d="M11 16.5l3 3 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <span class="lm-review-empty-text">No issues found</span>
          </div>
        </Show>

        <For each={items()}>
          {(item) => (
            <button
              class="lm-review-item"
              classList={{ "lm-review-item--active": activeId() === item.id }}
              onClick={() => scrollToItem(item)}
            >
              <div class={`lm-review-item-accent lm-review-item-accent--${item.severity}`} />
              <div class="lm-review-item-content">
                <div class="lm-review-item-top">
                  <span class="lm-review-item-title">{item.title}</span>
                  <span class={`lm-review-item-badge lm-review-item-badge--${item.severity}`}>
                    {severityLabel[item.severity]}
                  </span>
                </div>
                <span class="lm-review-item-desc">{item.description}</span>
                <span class="lm-review-item-line">Line {item.line}</span>
              </div>
            </button>
          )}
        </For>
      </div>
    </div>
  );
}

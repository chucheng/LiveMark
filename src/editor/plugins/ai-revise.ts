import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { Fragment } from "prosemirror-model";
import { parseMarkdown, md } from "../markdown/parser";

export const aiReviseKey = new PluginKey<AIReviseState>("ai-revise");

interface AIReviseState {
  status: "idle" | "loading" | "diff";
  originalFrom: number;
  originalTo: number;
  originalText: string;
  revisedText: string;
  revisionId: number;
  decorations: DecorationSet;
}

type AIReviseMeta =
  | { type: "start"; from: number; to: number; text: string; revisionId: number }
  | { type: "complete"; revisedText: string; revisionId: number }
  | { type: "accept" }
  | { type: "reject" }
  | { type: "cancel" };

function emptyState(): AIReviseState {
  return {
    status: "idle",
    originalFrom: 0,
    originalTo: 0,
    originalText: "",
    revisedText: "",
    revisionId: 0,
    decorations: DecorationSet.empty,
  };
}

/** Module-level view reference — updated by the plugin's view() lifecycle. */
let activeView: EditorView | null = null;

/** Check if AI revise is in a non-idle state (loading or diff). */
export function isAIReviseActive(view: EditorView): boolean {
  const state = aiReviseKey.getState(view.state);
  return !!state && state.status !== "idle";
}

function createLoadingWidget(): HTMLElement {
  const pill = document.createElement("span");
  pill.className = "lm-ai-loading-pill";
  pill.setAttribute("contenteditable", "false");

  const dot = document.createElement("span");
  dot.className = "lm-ai-loading-dot";
  pill.appendChild(dot);

  const label = document.createElement("span");
  label.className = "lm-ai-loading-label";
  label.textContent = "Revising\u2026";
  pill.appendChild(label);

  const hint = document.createElement("kbd");
  hint.className = "lm-ai-loading-hint";
  hint.textContent = "Esc";
  pill.appendChild(hint);

  return pill;
}

/** Render revised Markdown to HTML for the diff widget preview. */
function renderRevisedHTML(markdown: string): string {
  let html = md.render(markdown).trim();
  // Strip outer <p></p> for single-paragraph results to keep the widget inline
  const match = html.match(/^<p>([\s\S]*)<\/p>$/);
  if (match) html = match[1];
  return html;
}

function createDiffWidget(
  revisedText: string,
  onAccept: () => void,
  onReject: () => void,
): HTMLElement {
  const wrapper = document.createElement("span");
  wrapper.className = "lm-ai-diff-insert-wrapper";

  const textEl = document.createElement("span");
  textEl.className = "lm-ai-diff-insert";
  textEl.innerHTML = renderRevisedHTML(revisedText);
  wrapper.appendChild(textEl);

  const bar = document.createElement("span");
  bar.className = "lm-ai-action-bar";

  const acceptBtn = document.createElement("button");
  acceptBtn.className = "lm-ai-accept";
  acceptBtn.title = "Accept (Enter)";
  acceptBtn.textContent = "\u2713 Accept";
  acceptBtn.addEventListener("click", (e) => { e.preventDefault(); onAccept(); });

  const rejectBtn = document.createElement("button");
  rejectBtn.className = "lm-ai-reject";
  rejectBtn.title = "Reject (Esc)";
  rejectBtn.textContent = "\u2717 Reject";
  rejectBtn.addEventListener("click", (e) => { e.preventDefault(); onReject(); });

  bar.appendChild(acceptBtn);
  bar.appendChild(rejectBtn);
  wrapper.appendChild(bar);

  wrapper.setAttribute("role", "alert");
  return wrapper;
}

export function aiRevisePlugin(): Plugin<AIReviseState> {
  return new Plugin<AIReviseState>({
    key: aiReviseKey,
    state: {
      init(): AIReviseState {
        return emptyState();
      },
      apply(tr, prev, _oldState, newState): AIReviseState {
        const meta = tr.getMeta(aiReviseKey) as AIReviseMeta | undefined;

        if (!meta) {
          // Remap BOTH decorations AND positions on external transactions
          if (prev.status !== "idle") {
            const newFrom = tr.mapping.map(prev.originalFrom);
            const newTo = tr.mapping.map(prev.originalTo);

            // If the mapped range collapses (text inside was deleted), cancel
            if (newFrom >= newTo) {
              return emptyState();
            }

            return {
              ...prev,
              originalFrom: newFrom,
              originalTo: newTo,
              decorations: prev.decorations.map(tr.mapping, tr.doc),
            };
          }
          return prev;
        }

        // Handle meta actions
        if (meta.type === "start") {
          const from = meta.from;
          const to = meta.to;
          const decos: Decoration[] = [];
          if (from < to) {
            decos.push(Decoration.inline(from, to, { class: "lm-ai-shimmer" }));
            decos.push(Decoration.widget(to, createLoadingWidget, { side: 1, key: "ai-loading-pill" }));
          }

          return {
            status: "loading",
            originalFrom: from,
            originalTo: to,
            originalText: meta.text,
            revisedText: "",
            revisionId: meta.revisionId,
            decorations: decos.length > 0
              ? DecorationSet.create(newState.doc, decos)
              : DecorationSet.empty,
          };
        }

        if (meta.type === "complete") {
          if (meta.revisionId !== prev.revisionId) return prev;
          if (prev.status !== "loading") return prev;

          const from = prev.originalFrom;
          const to = prev.originalTo;
          const revisedText = meta.revisedText;

          // Build diff decorations with view-dependent click handlers
          const decos = from < to && activeView
            ? DecorationSet.create(newState.doc, [
                Decoration.inline(from, to, { class: "lm-ai-diff-delete" }),
                Decoration.widget(to, () => createDiffWidget(
                  revisedText,
                  () => { if (activeView) acceptRevision(activeView); },
                  () => { if (activeView) rejectRevision(activeView); },
                ), { side: 1 }),
              ])
            : DecorationSet.empty;

          return {
            ...prev,
            status: "diff",
            revisedText,
            decorations: decos,
          };
        }

        if (meta.type === "accept" || meta.type === "reject" || meta.type === "cancel") {
          return emptyState();
        }

        return prev;
      },
    },
    props: {
      decorations(state) {
        return aiReviseKey.getState(state)?.decorations ?? DecorationSet.empty;
      },
      handleKeyDown(view, event) {
        const pluginState = aiReviseKey.getState(view.state);
        if (!pluginState || pluginState.status === "idle") return false;

        if (pluginState.status === "loading") {
          if (event.key === "Escape") {
            event.preventDefault();
            cancelRevision(view);
            return true;
          }
          // Block ALL editing input during loading — protect the shimmer range.
          // Allow navigation, Cmd+Z, and modifier combos that don't edit.
          if (!event.metaKey && !event.ctrlKey) {
            const nav = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
                         "Home", "End", "PageUp", "PageDown", "Shift", "Alt",
                         "Meta", "Control", "CapsLock"];
            if (!nav.includes(event.key)) {
              return true;
            }
          }
          return false;
        }

        if (pluginState.status === "diff") {
          if (event.key === "Enter") {
            event.preventDefault();
            acceptRevision(view);
            return true;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            rejectRevision(view);
            return true;
          }
          // Block ALL editing input while diff is pending — editor is read-only.
          // Allow only modifier combos (Cmd+Z for undo after accept) and pure navigation.
          if (!event.metaKey && !event.ctrlKey) {
            // Block printable chars, Backspace, Delete, Tab, and other editing keys
            const nav = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
                         "Home", "End", "PageUp", "PageDown"];
            if (!nav.includes(event.key)) {
              return true;
            }
          }
        }

        return false;
      },
      /** Block clipboard paste and drop during loading/diff to protect state. */
      handlePaste(view) {
        const pluginState = aiReviseKey.getState(view.state);
        if (pluginState && pluginState.status !== "idle") return true;
        return false;
      },
      handleDrop(view) {
        const pluginState = aiReviseKey.getState(view.state);
        if (pluginState && pluginState.status !== "idle") return true;
        return false;
      },
      /** Block clicks from changing cursor into the shimmer/diff region during loading. */
      handleClick(view, _pos, event) {
        const pluginState = aiReviseKey.getState(view.state);
        if (!pluginState || pluginState.status === "idle") return false;
        // During loading: block all clicks to prevent selection disruption
        if (pluginState.status === "loading") {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
    view(editorView) {
      activeView = editorView;
      return {
        update(view) { activeView = view; },
        destroy() {
          // If the view is destroyed while a revision is in flight,
          // the revisionId guard in ai-commands.ts handles the stale response.
          activeView = null;
        },
      };
    },
  });
}

// Helper functions

export function startRevision(view: EditorView, from: number, to: number, text: string, revisionId: number): void {
  const tr = view.state.tr.setMeta(aiReviseKey, {
    type: "start", from, to, text, revisionId,
  } as AIReviseMeta);
  view.dispatch(tr);
}

export function completeRevision(view: EditorView, revisedText: string, revisionId: number): void {
  const tr = view.state.tr.setMeta(aiReviseKey, {
    type: "complete", revisedText, revisionId,
  } as AIReviseMeta);
  view.dispatch(tr);
}

export function acceptRevision(view: EditorView): void {
  const state = aiReviseKey.getState(view.state);
  if (!state || state.status !== "diff") return;

  // Parse revised text through the markdown pipeline to preserve structure.
  const revisedDoc = parseMarkdown(state.revisedText);
  let content: Fragment;
  if (revisedDoc) {
    // If result is a single paragraph, extract its inline content
    // to avoid splitting the parent paragraph (which adds a newline).
    if (revisedDoc.content.childCount === 1
        && revisedDoc.content.firstChild?.type.name === "paragraph") {
      content = revisedDoc.content.firstChild.content;
    } else {
      content = revisedDoc.content;
    }
  } else {
    content = Fragment.from(view.state.schema.text(state.revisedText));
  }

  const tr = view.state.tr
    .replaceWith(state.originalFrom, state.originalTo, content)
    .setMeta(aiReviseKey, { type: "accept" } as AIReviseMeta);
  view.dispatch(tr);
}

export function rejectRevision(view: EditorView): void {
  const tr = view.state.tr.setMeta(aiReviseKey, { type: "reject" } as AIReviseMeta);
  view.dispatch(tr);
}

export function cancelRevision(view: EditorView): void {
  const tr = view.state.tr.setMeta(aiReviseKey, { type: "cancel" } as AIReviseMeta);
  view.dispatch(tr);
}

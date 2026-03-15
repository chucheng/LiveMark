import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { Fragment } from "prosemirror-model";
import { parseMarkdown } from "../markdown/parser";

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

function createDiffWidget(
  revisedText: string,
  onAccept: () => void,
  onReject: () => void,
): HTMLElement {
  const wrapper = document.createElement("span");
  wrapper.className = "lm-ai-diff-insert-wrapper";

  const textEl = document.createElement("span");
  textEl.className = "lm-ai-diff-insert";
  textEl.textContent = revisedText;
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
          const decos = from < to
            ? DecorationSet.create(newState.doc, [
                Decoration.inline(from, to, { class: "lm-ai-shimmer" }),
              ])
            : DecorationSet.empty;

          return {
            status: "loading",
            originalFrom: from,
            originalTo: to,
            originalText: meta.text,
            revisedText: "",
            revisionId: meta.revisionId,
            decorations: decos,
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

        if (pluginState.status === "loading" && event.key === "Escape") {
          event.preventDefault();
          cancelRevision(view);
          return true;
        }

        return false;
      },
    },
    view(editorView) {
      activeView = editorView;
      return {
        update(view) { activeView = view; },
        destroy() { activeView = null; },
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
  // Using schema.text() would collapse multi-paragraph text into a flat string.
  const revisedDoc = parseMarkdown(state.revisedText);
  const content = revisedDoc
    ? revisedDoc.content
    : Fragment.from(view.state.schema.text(state.revisedText));

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

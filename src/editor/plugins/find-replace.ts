import { Plugin, PluginKey, EditorState } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";

export const findReplaceKey = new PluginKey<FindReplaceState>("findReplace");

interface FindReplaceState {
  query: string;
  caseSensitive: boolean;
  isRegex: boolean;
  matches: Array<{ from: number; to: number }>;
  currentIndex: number;
  decorations: DecorationSet;
}

/**
 * Search each textblock individually and map positions directly from the
 * node's children. This avoids the fragile global textBetween + posMap
 * approach that drifts at node boundaries (tables, nested lists, etc.).
 */
function findMatches(
  state: EditorState,
  query: string,
  caseSensitive: boolean,
  isRegex: boolean
): Array<{ from: number; to: number }> {
  if (!query) return [];

  console.log("[find] findMatches called, query:", JSON.stringify(query), "doc size:", state.doc.content.size);
  let blockCount = 0;
  state.doc.descendants((node, pos) => {
    if (node.isTextblock) {
      blockCount++;
      if (blockCount <= 5) console.log(`[find]   textblock[${blockCount}] type=${node.type.name} pos=${pos} text=${JSON.stringify(node.textContent.slice(0, 80))}`);
    }
    return true;
  });
  console.log("[find]   total textblocks:", blockCount);

  let regex: RegExp;
  try {
    const flags = caseSensitive ? "g" : "gi";
    regex = isRegex ? new RegExp(query, flags) : new RegExp(escapeRegex(query), flags);
  } catch {
    return [];
  }

  const matches: Array<{ from: number; to: number }> = [];
  const MAX_MATCHES = 10_000;

  state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return true; // descend into wrappers
    if (matches.length >= MAX_MATCHES) return false;

    // Build text and a position array for this textblock.
    // positions[i] = document position of the i-th text character.
    const chars: string[] = [];
    const positions: number[] = [];
    const contentStart = pos + 1; // skip textblock open tag

    node.forEach((child, childOffset) => {
      if (child.isText) {
        for (let i = 0; i < child.text!.length; i++) {
          chars.push(child.text![i]);
          positions.push(contentStart + childOffset + i);
        }
      }
      // Non-text inline nodes (images, hard_break, math_inline) are
      // skipped in the search text — they don't produce matchable chars.
    });

    const text = chars.join("");
    regex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match[0].length === 0) {
        regex.lastIndex++;
        continue;
      }
      const from = positions[match.index];
      const lastIdx = match.index + match[0].length - 1;
      const to = positions[lastIdx] + 1; // exclusive end
      matches.push({ from, to });
      if (matches.length >= MAX_MATCHES) break;
    }

    return false; // don't descend into textblock children
  });

  return matches;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildDecorations(
  state: EditorState,
  matches: Array<{ from: number; to: number }>,
  currentIndex: number
): DecorationSet {
  if (matches.length === 0) return DecorationSet.empty;

  const decos = matches.map((m, i) =>
    Decoration.inline(m.from, m.to, {
      class: i === currentIndex ? "lm-find-current" : "lm-find-match",
    })
  );
  return DecorationSet.create(state.doc, decos);
}

function emptyState(state: EditorState): FindReplaceState {
  return {
    query: "",
    caseSensitive: false,
    isRegex: false,
    matches: [],
    currentIndex: -1,
    decorations: DecorationSet.empty,
  };
}

// Meta actions
interface SetSearchMeta {
  type: "setSearch";
  query: string;
  caseSensitive: boolean;
  isRegex: boolean;
  cursorPos?: number; // used to find nearest match
}
interface NextMatchMeta {
  type: "next";
}
interface PrevMatchMeta {
  type: "prev";
}
interface ClearMeta {
  type: "clear";
}

type FindReplaceMeta = SetSearchMeta | NextMatchMeta | PrevMatchMeta | ClearMeta;

export function findReplacePlugin(): Plugin<FindReplaceState> {
  return new Plugin<FindReplaceState>({
    key: findReplaceKey,

    state: {
      init(_, state) {
        return emptyState(state);
      },

      apply(tr, prev, _oldState, newState) {
        const meta: FindReplaceMeta | undefined = tr.getMeta(findReplaceKey);

        if (meta) {
          if (meta.type === "clear") {
            return emptyState(newState);
          }
          if (meta.type === "setSearch") {
            const matches = findMatches(newState, meta.query, meta.caseSensitive, meta.isRegex);
            let currentIndex = -1;
            if (matches.length > 0) {
              // Find the nearest match at or after the cursor position
              const cursor = meta.cursorPos ?? 0;
              currentIndex = matches.findIndex((m) => m.from >= cursor);
              if (currentIndex < 0) currentIndex = 0; // wrap to first if none after cursor
            }
            return {
              query: meta.query,
              caseSensitive: meta.caseSensitive,
              isRegex: meta.isRegex,
              matches,
              currentIndex,
              decorations: buildDecorations(newState, matches, currentIndex),
            };
          }
          if (meta.type === "next" && prev.matches.length > 0) {
            const currentIndex = (prev.currentIndex + 1) % prev.matches.length;
            return {
              ...prev,
              currentIndex,
              decorations: buildDecorations(newState, prev.matches, currentIndex),
            };
          }
          if (meta.type === "prev" && prev.matches.length > 0) {
            const currentIndex =
              (prev.currentIndex - 1 + prev.matches.length) % prev.matches.length;
            return {
              ...prev,
              currentIndex,
              decorations: buildDecorations(newState, prev.matches, currentIndex),
            };
          }
        }

        // If doc changed, re-run search
        if (tr.docChanged && prev.query) {
          const matches = findMatches(newState, prev.query, prev.caseSensitive, prev.isRegex);
          const currentIndex = Math.min(prev.currentIndex, matches.length - 1);
          return {
            ...prev,
            matches,
            currentIndex: matches.length > 0 ? Math.max(currentIndex, 0) : -1,
            decorations: buildDecorations(
              newState,
              matches,
              matches.length > 0 ? Math.max(currentIndex, 0) : -1
            ),
          };
        }

        return prev;
      },
    },

    props: {
      decorations(state) {
        return findReplaceKey.getState(state)?.decorations ?? DecorationSet.empty;
      },
    },
  });
}

// Helper functions to dispatch find/replace actions
export function setSearchQuery(
  view: EditorView,
  query: string,
  caseSensitive: boolean,
  isRegex: boolean
) {
  const cursorPos = view.state.selection.from;
  const tr = view.state.tr.setMeta(findReplaceKey, {
    type: "setSearch",
    query,
    caseSensitive,
    isRegex,
    cursorPos,
  } as SetSearchMeta);
  view.dispatch(tr);
  // Scroll to the nearest match after search
  if (query) scrollToCurrentMatch(view);
}

export function nextMatch(view: EditorView) {
  const tr = view.state.tr.setMeta(findReplaceKey, { type: "next" } as NextMatchMeta);
  view.dispatch(tr);
  scrollToCurrentMatch(view);
}

export function prevMatch(view: EditorView) {
  const tr = view.state.tr.setMeta(findReplaceKey, { type: "prev" } as PrevMatchMeta);
  view.dispatch(tr);
  scrollToCurrentMatch(view);
}

export function clearSearch(view: EditorView) {
  const tr = view.state.tr.setMeta(findReplaceKey, { type: "clear" } as ClearMeta);
  view.dispatch(tr);
}

export function replaceMatch(view: EditorView, replacement: string) {
  const pluginState = findReplaceKey.getState(view.state);
  if (!pluginState || pluginState.currentIndex < 0) return;

  const match = pluginState.matches[pluginState.currentIndex];
  if (replacement) {
    const tr = view.state.tr.replaceWith(
      match.from,
      match.to,
      view.state.schema.text(replacement)
    );
    view.dispatch(tr);
  } else {
    const tr = view.state.tr.delete(match.from, match.to);
    view.dispatch(tr);
  }
  // Auto-advance: scroll to the next match (doc change triggers re-search,
  // which keeps currentIndex, effectively pointing at the next match)
  scrollToCurrentMatch(view);
}

export function replaceAll(view: EditorView, replacement: string) {
  const pluginState = findReplaceKey.getState(view.state);
  if (!pluginState || pluginState.matches.length === 0) return;

  let tr = view.state.tr;
  // Apply replacements in reverse order to keep positions valid
  const matches = [...pluginState.matches].reverse();
  for (const match of matches) {
    if (replacement) {
      tr = tr.replaceWith(match.from, match.to, view.state.schema.text(replacement));
    } else {
      tr = tr.delete(match.from, match.to);
    }
  }
  view.dispatch(tr);
}

export function getMatchInfo(view: EditorView): { current: number; total: number } {
  const pluginState = findReplaceKey.getState(view.state);
  if (!pluginState) return { current: 0, total: 0 };
  return {
    current: pluginState.currentIndex + 1,
    total: pluginState.matches.length,
  };
}

function scrollToCurrentMatch(view: EditorView) {
  const pluginState = findReplaceKey.getState(view.state);
  if (!pluginState || pluginState.currentIndex < 0) return;

  // Scroll only the editor's scroll container (.lm-editor-wrapper),
  // not outer ancestors. This keeps the find bar (absolutely positioned
  // in the parent .lm-editor-area) visible at all times.
  requestAnimationFrame(() => {
    const el = view.dom.querySelector(".lm-find-current") as HTMLElement | null;
    if (!el) return;

    const scrollParent = view.dom.closest(".lm-editor-wrapper") as HTMLElement | null;
    if (!scrollParent) return;

    const elRect = el.getBoundingClientRect();
    const parentRect = scrollParent.getBoundingClientRect();
    const offset = elRect.top - parentRect.top - parentRect.height / 2 + elRect.height / 2;
    scrollParent.scrollBy({ top: offset, behavior: "smooth" });
  });
}

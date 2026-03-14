import { Plugin, PluginKey, EditorState, TextSelection } from "prosemirror-state";
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
 * Build a mapping from text offsets (as produced by doc.textBetween)
 * to document positions. Mirrors ProseMirror's textBetween logic exactly:
 * only textblocks (paragraph, heading, code_block) and leaf blocks with
 * text contribute \n separators — not wrapper blocks like list_item or blockquote.
 */
function buildTextPosMap(state: EditorState): number[] {
  const map: number[] = [];
  let first = true;

  state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
    // Mirror textBetween: separators only for textblocks and leaf blocks with content
    if (node.isBlock && (node.isTextblock || (node.isLeaf && node.type.spec.leafText))) {
      if (first) {
        first = false;
      } else {
        map.push(pos); // \n separator
      }
    }

    if (node.isText) {
      for (let i = 0; i < node.text!.length; i++) {
        map.push(pos + i);
      }
      return false;
    }

    if (node.type.name === "hard_break") {
      map.push(pos);
      return false;
    }

    // Non-text inline leaf nodes (images, math_inline) contribute \0
    if (node.isLeaf && !node.isBlock && !node.isText) {
      map.push(pos);
      return false;
    }

    return true;
  });

  return map;
}

function findMatches(
  state: EditorState,
  query: string,
  caseSensitive: boolean,
  isRegex: boolean
): Array<{ from: number; to: number }> {
  if (!query) return [];

  const text = state.doc.textBetween(0, state.doc.content.size, "\n", "\0");

  let regex: RegExp;
  try {
    const flags = caseSensitive ? "g" : "gi";
    regex = isRegex ? new RegExp(query, flags) : new RegExp(escapeRegex(query), flags);
  } catch {
    return [];
  }

  const posMap = buildTextPosMap(state);
  const matches: Array<{ from: number; to: number }> = [];

  const MAX_MATCHES = 10_000;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[0].length === 0) {
      regex.lastIndex++;
      continue;
    }
    const fromOffset = match.index;
    const toOffset = match.index + match[0].length;
    const from = fromOffset < posMap.length ? posMap[fromOffset] : state.doc.content.size;
    const to = toOffset < posMap.length ? posMap[toOffset] : state.doc.content.size;
    matches.push({ from, to });
    if (matches.length >= MAX_MATCHES) break;
  }
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
  const match = pluginState.matches[pluginState.currentIndex];
  const tr = view.state.tr.setSelection(
    TextSelection.create(view.state.doc, match.from, match.to)
  );
  view.dispatch(tr.scrollIntoView());
}

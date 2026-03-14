import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { uiState } from "../state/ui";
import {
  setSearchQuery,
  nextMatch,
  prevMatch,
  clearSearch,
  replaceMatch,
  replaceAll,
  getMatchInfo,
} from "../editor/plugins/find-replace";
import type { EditorView } from "prosemirror-view";

interface FindReplaceProps {
  view: () => EditorView | undefined;
}

export default function FindReplace(props: FindReplaceProps) {
  let findInputRef!: HTMLInputElement;
  const [query, setQuery] = createSignal("");
  const [replacement, setReplacement] = createSignal("");
  const [caseSensitive, setCaseSensitive] = createSignal(false);
  const [showReplace, setShowReplace] = createSignal(false);
  const [matchInfo, setMatchInfo] = createSignal({ current: 0, total: 0 });

  /** Run search immediately (no debounce) and update match info */
  function runSearch() {
    const v = props.view();
    if (v) {
      setSearchQuery(v, query(), caseSensitive(), false);
      setMatchInfo(getMatchInfo(v));
    }
  }

  onMount(() => {
    const initial = uiState.findInitialQuery();
    if (initial) {
      setQuery(initial);
      uiState.setFindInitialQuery("");
    }
    findInputRef.focus();
    findInputRef.select();

    const toggleReplace = () => setShowReplace(!showReplace());
    const focusFind = () => {
      findInputRef.focus();
      findInputRef.select();
    };
    window.addEventListener("lm-toggle-replace", toggleReplace);
    window.addEventListener("lm-find-focus", focusFind);
    onCleanup(() => {
      window.removeEventListener("lm-toggle-replace", toggleReplace);
      window.removeEventListener("lm-find-focus", focusFind);
    });
  });

  // Re-run search whenever query or caseSensitive changes
  createEffect(() => {
    // Subscribe to reactive deps
    query();
    caseSensitive();
    // Run search synchronously — no debounce
    runSearch();
  });

  function doNext() {
    const v = props.view();
    if (v) {
      nextMatch(v);
      setMatchInfo(getMatchInfo(v));
    }
  }

  function doPrev() {
    const v = props.view();
    if (v) {
      prevMatch(v);
      setMatchInfo(getMatchInfo(v));
    }
  }

  function doReplace() {
    const v = props.view();
    if (v) {
      replaceMatch(v, replacement());
      setMatchInfo(getMatchInfo(v));
    }
  }

  function doReplaceAll() {
    const v = props.view();
    if (v) {
      replaceAll(v, replacement());
      setSearchQuery(v, query(), caseSensitive(), false);
      setMatchInfo(getMatchInfo(v));
    }
  }

  function close() {
    const v = props.view();
    if (v) clearSearch(v);
    uiState.setFindOpen(false);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doNext();
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      doPrev();
    }
  }

  return (
    <div class="lm-find-bar" onKeyDown={handleKeydown}>
      <div class="lm-find-row">
        <input
          ref={findInputRef}
          class="lm-find-input"
          type="text"
          placeholder="Find…"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          spellcheck={false}
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          data-1p-ignore
        />
        <span class="lm-find-info">
          {matchInfo().total > 0
            ? `${matchInfo().current} of ${matchInfo().total}`
            : query()
              ? "No results"
              : ""}
        </span>
        <button
          class={`lm-find-toggle ${caseSensitive() ? "lm-find-toggle-active" : ""}`}
          onClick={() => setCaseSensitive(!caseSensitive())}
          title="Case sensitive"
        >
          Aa
        </button>
        <button class="lm-find-btn" onClick={doPrev} title="Previous match">
          ↑
        </button>
        <button class="lm-find-btn" onClick={doNext} title="Next match">
          ↓
        </button>
        <button
          class="lm-find-toggle"
          onClick={() => setShowReplace(!showReplace())}
          title="Toggle replace"
        >
          ⇄
        </button>
        <button class="lm-find-btn" onClick={close} title="Close">
          ✕
        </button>
      </div>
      {showReplace() && (
        <div class="lm-find-row">
          <input
            class="lm-find-input"
            type="text"
            placeholder="Replace…"
            value={replacement()}
            onInput={(e) => setReplacement(e.currentTarget.value)}
            spellcheck={false}
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            data-1p-ignore
          />
          <button class="lm-find-btn" onClick={doReplace}>
            Replace
          </button>
          <button class="lm-find-btn" onClick={doReplaceAll}>
            All
          </button>
        </div>
      )}
    </div>
  );
}

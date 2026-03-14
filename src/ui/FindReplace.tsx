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
  const [isRegex, setIsRegex] = createSignal(false);
  const [showReplace, setShowReplace] = createSignal(false);
  const [matchInfo, setMatchInfo] = createSignal({ current: 0, total: 0 });

  onMount(() => {
    findInputRef.focus();
    const toggleReplace = () => setShowReplace(!showReplace());
    window.addEventListener("lm-toggle-replace", toggleReplace);
    onCleanup(() => window.removeEventListener("lm-toggle-replace", toggleReplace));
  });

  createEffect(() => {
    const v = props.view();
    const q = query();
    const cs = caseSensitive();
    const re = isRegex();
    if (v) {
      setSearchQuery(v, q, cs, re);
      setMatchInfo(getMatchInfo(v));
    }
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
      // Re-run search after replace
      setSearchQuery(v, query(), caseSensitive(), isRegex());
      setMatchInfo(getMatchInfo(v));
    }
  }

  function doReplaceAll() {
    const v = props.view();
    if (v) {
      replaceAll(v, replacement());
      setSearchQuery(v, query(), caseSensitive(), isRegex());
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
        <button
          class={`lm-find-toggle ${isRegex() ? "lm-find-toggle-active" : ""}`}
          onClick={() => setIsRegex(!isRegex())}
          title="Regular expression"
        >
          .*
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

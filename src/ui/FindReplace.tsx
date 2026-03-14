import { createSignal, onMount, onCleanup } from "solid-js";
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

  /** Run search with explicit values — no reactive deps */
  function runSearch(q: string, cs: boolean, re?: boolean) {
    const v = props.view();
    if (v) {
      setSearchQuery(v, q, cs, re ?? isRegex());
      setMatchInfo(getMatchInfo(v));
    }
  }

  onMount(() => {
    const initial = uiState.findInitialQuery();
    if (initial) {
      setQuery(initial);
      uiState.setFindInitialQuery("");
      // Run initial search after a microtask so editor view is ready
      queueMicrotask(() => runSearch(initial, caseSensitive()));
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

  function onFindInput(e: InputEvent) {
    const q = (e.currentTarget as HTMLInputElement).value;
    setQuery(q);
    runSearch(q, caseSensitive());
  }

  function toggleCaseSensitive() {
    const newCS = !caseSensitive();
    setCaseSensitive(newCS);
    runSearch(query(), newCS);
  }

  function toggleRegex() {
    const newRe = !isRegex();
    setIsRegex(newRe);
    runSearch(query(), caseSensitive(), newRe);
  }

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
      // Re-run search to update state after replace-all
      runSearch(query(), caseSensitive());
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
          onInput={onFindInput}
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
          onClick={toggleCaseSensitive}
          title="Case sensitive"
        >
          Aa
        </button>
        <button
          class={`lm-find-toggle ${isRegex() ? "lm-find-toggle-active" : ""}`}
          onClick={toggleRegex}
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

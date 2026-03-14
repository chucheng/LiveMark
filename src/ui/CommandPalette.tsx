import { createSignal, createEffect, For, onMount } from "solid-js";
import { uiState } from "../state/ui";
import { searchCommands, getCommands, type Command } from "../commands/registry";
import { normalizeShortcut } from "../state/shortcuts";

export default function CommandPalette() {
  let inputRef!: HTMLInputElement;
  let listRef!: HTMLDivElement;
  const [query, setQuery] = createSignal("");
  const [selectedIdx, setSelectedIdx] = createSignal(0);
  const [results, setResults] = createSignal<Command[]>([]);

  // Build a set of shortcuts that appear more than once (conflicts)
  function conflictedShortcuts(): Set<string> {
    const counts = new Map<string, number>();
    for (const cmd of getCommands()) {
      if (!cmd.shortcut) continue;
      const norm = normalizeShortcut(cmd.shortcut);
      counts.set(norm, (counts.get(norm) || 0) + 1);
    }
    const dupes = new Set<string>();
    for (const [k, v] of counts) {
      if (v > 1) dupes.add(k);
    }
    return dupes;
  }

  createEffect(() => {
    setResults(searchCommands(query()));
    setSelectedIdx(0);
  });

  onMount(() => {
    inputRef.focus();
  });

  function executeSelected() {
    const cmds = results();
    if (cmds.length > 0 && selectedIdx() < cmds.length) {
      uiState.setPaletteOpen(false);
      cmds[selectedIdx()].execute();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      uiState.setPaletteOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results().length - 1));
      scrollIntoView();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
      scrollIntoView();
    } else if (e.key === "Enter") {
      e.preventDefault();
      executeSelected();
    }
  }

  function scrollIntoView() {
    requestAnimationFrame(() => {
      const el = listRef?.querySelector(".lm-palette-item-active");
      el?.scrollIntoView({ block: "nearest" });
    });
  }

  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains("lm-palette-overlay")) {
      uiState.setPaletteOpen(false);
    }
  }

  return (
    <div class="lm-palette-overlay" onClick={handleBackdropClick}>
      <div class="lm-palette" role="dialog" aria-modal="true" aria-label="Command Palette" onKeyDown={handleKeydown}>
        <input
          ref={inputRef}
          class="lm-palette-input"
          type="text"
          placeholder="Type a command…"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          role="combobox"
          aria-expanded="true"
          aria-controls="lm-palette-listbox"
          aria-autocomplete="list"
        />
        <div class="lm-palette-list" ref={listRef} id="lm-palette-listbox" role="listbox">
          <For each={results()}>
            {(cmd, idx) => (
              <div
                class={`lm-palette-item ${idx() === selectedIdx() ? "lm-palette-item-active" : ""}`}
                role="option"
                aria-selected={idx() === selectedIdx()}
                onMouseEnter={() => setSelectedIdx(idx())}
                onClick={() => {
                  setSelectedIdx(idx());
                  executeSelected();
                }}
              >
                <span class="lm-palette-category">{cmd.category}</span>
                <span class="lm-palette-label">{cmd.label}</span>
                {cmd.shortcut && (
                  <span class="lm-palette-shortcut">
                    {cmd.shortcut.includes(" ")
                      ? cmd.shortcut.split(" ").map((part, i) => (
                          <>
                            {i > 0 && <span class="lm-palette-chord-sep" />}
                            {part}
                          </>
                        ))
                      : cmd.shortcut}
                    {conflictedShortcuts().has(normalizeShortcut(cmd.shortcut)) && (
                      <span class="lm-palette-conflict-badge" title="Shortcut conflict">!</span>
                    )}
                  </span>
                )}
              </div>
            )}
          </For>
          {results().length === 0 && (
            <div class="lm-palette-empty">No matching commands</div>
          )}
        </div>
      </div>
    </div>
  );
}

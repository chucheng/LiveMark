import { createEffect, createSignal, For, on, onCleanup, Show } from "solid-js";
import { tabsState } from "../state/tabs";

interface TabBarProps {
  onCloseTab: (tabId: string) => void;
  onSwitchTab: (tabId: string) => void;
}

export default function TabBar(props: TabBarProps) {
  let scrollRef: HTMLDivElement | undefined;
  const [canScrollLeft, setCanScrollLeft] = createSignal(false);
  const [canScrollRight, setCanScrollRight] = createSignal(false);

  function updateScrollState() {
    if (!scrollRef) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }

  function scrollBy(delta: number) {
    scrollRef?.scrollBy({ left: delta, behavior: "smooth" });
  }

  // Re-check overflow when tabs change
  createEffect(on(() => tabsState.tabs().length, () => {
    requestAnimationFrame(updateScrollState);
  }));

  // Auto-scroll active tab into view
  createEffect(on(() => tabsState.activeTabId(), (activeId) => {
    if (!activeId || !scrollRef) return;
    requestAnimationFrame(() => {
      const el = scrollRef!.querySelector(`[data-tab-id="${activeId}"]`);
      if (el) el.scrollIntoView({ inline: "nearest", block: "nearest" });
    });
  }));

  return (
    <Show when={tabsState.tabs().length > 1}>
      <div class="lm-tabbar-wrapper">
        <Show when={canScrollLeft()}>
          <button
            class="lm-tabbar-arrow lm-tabbar-arrow-left"
            onClick={() => scrollBy(-120)}
            title="Scroll tabs left"
          >
            ‹
          </button>
        </Show>
        <div
          class="lm-tabbar"
          role="tablist"
          ref={(el) => {
            scrollRef = el;
            updateScrollState();
            const ro = new ResizeObserver(() => updateScrollState());
            ro.observe(el);
            onCleanup(() => ro.disconnect());
          }}
          onScroll={updateScrollState}
        >
          <For each={tabsState.tabs()}>
            {(tab) => (
              <div
                class="lm-tab"
                role="tab"
                aria-selected={tab.id === tabsState.activeTabId()}
                classList={{
                  "lm-tab-active": tab.id === tabsState.activeTabId(),
                  "lm-tab-deleted": tab.isDeleted,
                }}
                data-tab-id={tab.id}
                onMouseDown={(e) => {
                  if (e.button === 1) {
                    // Middle click to close
                    e.preventDefault();
                    props.onCloseTab(tab.id);
                  } else if (e.button === 0 && tab.id !== tabsState.activeTabId()) {
                    props.onSwitchTab(tab.id);
                  }
                }}
              >
                <span class="lm-tab-label" title={tab.isDeleted ? "File has been deleted" : undefined}>
                  {tab.isDeleted ? "⚠ " : tab.isModified ? "● " : ""}
                  {tab.fileName}
                </span>
                <button
                  class="lm-tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onCloseTab(tab.id);
                  }}
                  title="Close tab"
                >
                  ×
                </button>
              </div>
            )}
          </For>
        </div>
        <Show when={canScrollRight()}>
          <button
            class="lm-tabbar-arrow lm-tabbar-arrow-right"
            onClick={() => scrollBy(120)}
            title="Scroll tabs right"
          >
            ›
          </button>
        </Show>
      </div>
    </Show>
  );
}

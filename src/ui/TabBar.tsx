import { For, Show } from "solid-js";
import { tabsState } from "../state/tabs";

interface TabBarProps {
  onCloseTab: (tabId: string) => void;
  onSwitchTab: (tabId: string) => void;
}

export default function TabBar(props: TabBarProps) {
  return (
    <Show when={tabsState.tabs().length > 1}>
      <div class="lm-tabbar">
        <For each={tabsState.tabs()}>
          {(tab) => (
            <div
              class="lm-tab"
              classList={{ "lm-tab-active": tab.id === tabsState.activeTabId() }}
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
              <span class="lm-tab-label">
                {tab.isModified ? "● " : ""}
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
    </Show>
  );
}

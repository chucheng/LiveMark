import { createSignal, createEffect, onCleanup, Show, For } from "solid-js";
import type { EditorView } from "prosemirror-view";
import { TextSelection } from "prosemirror-state";
import { schema } from "../editor/schema";

interface BlockTypePickerProps {
  view: () => EditorView | undefined;
}

interface BlockTypeOption {
  label: string;
  icon: string;
}

function insertBlockAbove(view: EditorView, blockPos: number, node: ReturnType<typeof schema.nodes.paragraph.create>) {
  const tr = view.state.tr;
  tr.insert(blockPos, node);
  tr.setSelection(TextSelection.near(tr.doc.resolve(blockPos + 1)));
  view.dispatch(tr.scrollIntoView());
  view.focus();
}

const BLOCK_TYPES: BlockTypeOption[] = [
  { label: "Paragraph",      icon: "T"  },
  { label: "Heading 1",      icon: "H1" },
  { label: "Heading 2",      icon: "H2" },
  { label: "Heading 3",      icon: "H3" },
  { label: "Bullet List",    icon: "\u2022" },
  { label: "Ordered List",   icon: "1." },
  { label: "Task List",      icon: "\u2610" },
  { label: "Blockquote",     icon: "\u275D" },
  { label: "Code Block",     icon: "<>" },
  { label: "Horizontal Rule", icon: "\u2014" },
  { label: "Math Block",     icon: "\u2211" },
];

function createBlockNode(label: string) {
  switch (label) {
    case "Paragraph":
      return schema.nodes.paragraph.create();
    case "Heading 1":
      return schema.nodes.heading.create({ level: 1 });
    case "Heading 2":
      return schema.nodes.heading.create({ level: 2 });
    case "Heading 3":
      return schema.nodes.heading.create({ level: 3 });
    case "Bullet List":
      return schema.nodes.bullet_list.create(null, [
        schema.nodes.list_item.create(null, [schema.nodes.paragraph.create()]),
      ]);
    case "Ordered List":
      return schema.nodes.ordered_list.create(null, [
        schema.nodes.list_item.create(null, [schema.nodes.paragraph.create()]),
      ]);
    case "Task List":
      return schema.nodes.task_list.create(null, [
        schema.nodes.task_list_item.create({ checked: false }, [schema.nodes.paragraph.create()]),
      ]);
    case "Blockquote":
      return schema.nodes.blockquote.create(null, [schema.nodes.paragraph.create()]);
    case "Code Block":
      return schema.nodes.code_block.create();
    case "Horizontal Rule":
      return schema.nodes.horizontal_rule.create();
    case "Math Block":
      return schema.nodes.math_block.create();
    default:
      return schema.nodes.paragraph.create();
  }
}

export default function BlockTypePicker(props: BlockTypePickerProps) {
  const [position, setPosition] = createSignal<{ x: number; y: number } | null>(null);
  const [blockPos, setBlockPos] = createSignal<number | null>(null);
  const [activeIndex, setActiveIndex] = createSignal(0);

  // Listen for the custom "lm-plus-click" event dispatched by the block handle plus button
  createEffect(() => {
    const view = props.view();
    if (!view) return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { blockPos: number; rect: DOMRect };
      setPosition({ x: detail.rect.left, y: detail.rect.bottom + 4 });
      setBlockPos(detail.blockPos);
      setActiveIndex(0);
    };

    view.dom.addEventListener("lm-plus-click", handler);
    onCleanup(() => view.dom.removeEventListener("lm-plus-click", handler));
  });

  function dismiss() {
    setPosition(null);
    setBlockPos(null);
  }

  function handleSelect(option: BlockTypeOption) {
    const view = props.view();
    const pos = blockPos();
    if (!view || pos === null) return;

    const node = createBlockNode(option.label);
    insertBlockAbove(view, pos, node);
    dismiss();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!position()) return;

    if (e.key === "Escape") {
      e.preventDefault();
      dismiss();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, BLOCK_TYPES.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(BLOCK_TYPES[activeIndex()]);
    }
  }

  // Global keydown, click-outside, and scroll dismiss
  createEffect(() => {
    if (position()) {
      window.addEventListener("keydown", handleKeyDown, true);

      const handleClickOutside = (e: MouseEvent) => {
        if (!(e.target as HTMLElement).closest(".lm-block-type-picker")) {
          dismiss();
        }
      };
      window.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", dismiss, true);

      onCleanup(() => {
        window.removeEventListener("keydown", handleKeyDown, true);
        window.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("scroll", dismiss, true);
      });
    }
  });

  return (
    <Show when={position()}>
      {(pos) => (
        <div
          class="lm-block-type-picker"
          style={{ left: `${pos().x}px`, top: `${pos().y}px` }}
        >
          <For each={BLOCK_TYPES}>
            {(option, i) => (
              <button
                class="lm-btp-item"
                classList={{ "lm-btp-active": i() === activeIndex() }}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setActiveIndex(i())}
              >
                <span class="lm-btp-icon">{option.icon}</span>
                <span class="lm-btp-label">{option.label}</span>
              </button>
            )}
          </For>
        </div>
      )}
    </Show>
  );
}

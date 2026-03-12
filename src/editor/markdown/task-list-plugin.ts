import type MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";

/**
 * Custom markdown-it plugin that emits task_list / task_list_item tokens
 * instead of bullet_list / list_item for GFM task lists.
 *
 * Hooks into the `core` ruler after `inline` to rewrite tokens in-place.
 */
export function taskListPlugin(md: MarkdownIt): void {
  md.core.ruler.after("inline", "task_list", (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== "bullet_list_open") continue;

      // Check if this bullet list is a task list by inspecting its first list_item
      if (!isTaskList(tokens, i)) continue;

      // Rewrite this entire bullet_list → task_list
      let depth = 0;
      for (let j = i; j < tokens.length; j++) {
        const tok = tokens[j];

        if (tok.type === "bullet_list_open" && j === i) {
          tok.type = "task_list_open";
          tok.tag = "ul";
          depth++;
          continue;
        }

        if (tok.type === "bullet_list_close" && depth === 1) {
          tok.type = "task_list_close";
          tok.tag = "ul";
          break;
        }

        // Track nested lists (don't rewrite them)
        if (tok.type === "bullet_list_open" || tok.type === "ordered_list_open") {
          depth++;
          continue;
        }
        if (tok.type === "bullet_list_close" || tok.type === "ordered_list_close") {
          depth--;
          continue;
        }

        // Only rewrite list_items at depth 1 (top-level items of this task list)
        if (depth !== 1) continue;

        if (tok.type === "list_item_open") {
          const checked = getCheckedState(tokens, j);
          tok.type = "task_list_item_open";
          tok.tag = "li";
          tok.meta = { checked };
        } else if (tok.type === "list_item_close") {
          tok.type = "task_list_item_close";
          tok.tag = "li";
        }
      }
    }
  });
}

/**
 * Check if a bullet_list starting at index `start` is a task list.
 * Looks for `[ ] ` or `[x] ` at the start of the first list_item's inline content.
 */
function isTaskList(tokens: Token[], start: number): boolean {
  for (let i = start + 1; i < tokens.length; i++) {
    if (tokens[i].type === "list_item_open") {
      // Find the inline token inside this list_item
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === "list_item_close") break;
        if (tokens[j].type === "inline") {
          return /^\[([ xX])\]\s/.test(tokens[j].content);
        }
      }
      return false;
    }
  }
  return false;
}

/**
 * Determine checked state for a task_list_item starting at index `start`.
 * Also strips the `[ ] ` / `[x] ` prefix from the inline content.
 */
function getCheckedState(tokens: Token[], start: number): boolean {
  for (let i = start + 1; i < tokens.length; i++) {
    if (tokens[i].type === "list_item_close" || tokens[i].type === "task_list_item_close") break;
    if (tokens[i].type === "inline") {
      const match = tokens[i].content.match(/^\[([ xX])\]\s/);
      if (match) {
        const checked = match[1] !== " ";
        // Strip checkbox syntax from content
        tokens[i].content = tokens[i].content.slice(match[0].length);
        // Also strip from children if they exist
        if (tokens[i].children && tokens[i].children!.length > 0) {
          const firstChild = tokens[i].children![0];
          if (firstChild.type === "text") {
            firstChild.content = firstChild.content.replace(/^\[([ xX])\]\s/, "");
          }
        }
        return checked;
      }
      return false;
    }
  }
  return false;
}

import { invoke } from "@tauri-apps/api/core";
import { preferencesState, AI_DEFAULT_PROMPT } from "../state/preferences";
import { uiState } from "../state/ui";
import { sourceViewGuard } from "./source-view-guard";
import {
  aiReviseKey,
  startRevision,
  completeRevision,
  cancelRevision,
} from "../editor/plugins/ai-revise";
import { serializeMarkdown } from "../editor/markdown/serializer";
import type { EditorView } from "prosemirror-view";
import type { Node } from "prosemirror-model";

const MAX_SELECTION_LENGTH = 4000;
const MULTI_BLOCK_WARN_THRESHOLD = 3;

/** Node types that cannot be meaningfully revised by a text LLM. */
const BLOCKED_NODE_TYPES = new Set([
  "image", "table", "code_block", "math_block", "frontmatter",
]);

/** Base timeout: 10s for short text, +2s per 500 chars beyond 500. Cap at 30s. */
function computeTimeout(textLength: number): number {
  const BASE_MS = 10_000;
  const extra = Math.max(0, textLength - 500);
  const additional = Math.floor(extra / 500) * 2000;
  return Math.min(BASE_MS + additional, 30_000);
}

/**
 * Validate the selection content for AI revision.
 * Returns an error message string if blocked, or null if OK.
 */
function validateSelection(view: EditorView, from: number, to: number): string | null {
  const doc = view.state.doc;

  // Collect blocked node types and count top-level blocks in the selection
  const found = new Set<string>();
  let blockCount = 0;

  doc.nodesBetween(from, to, (node: Node) => {
    if (node.type.name === "image") {
      found.add("image");
      return false; // don't descend
    }
    if (node.type.name === "table") {
      found.add("table");
      return false;
    }
    if (node.type.name === "code_block") {
      found.add("code_block");
      return false;
    }
    if (node.type.name === "math_block") {
      found.add("math_block");
      return false;
    }
    if (node.type.name === "frontmatter") {
      found.add("frontmatter");
      return false;
    }
    // Count block-level nodes (direct children of doc or list items, blockquotes, etc.)
    if (node.isBlock && node.type.name !== "doc") {
      blockCount++;
    }
    return true; // descend into other nodes
  });

  // Build error message for blocked content
  if (found.size > 0) {
    const labels: Record<string, string> = {
      image: "images",
      table: "tables",
      code_block: "code blocks",
      math_block: "math blocks",
      frontmatter: "frontmatter",
    };
    const items = [...found].map((t) => labels[t] || t);
    if (items.length === 1) {
      return `Selection contains ${items[0]} \u2014 select text only`;
    }
    return `Selection contains ${items.join(" and ")} \u2014 select text only`;
  }

  return null;
}

/** Count top-level blocks spanned by the selection. */
function countBlocks(view: EditorView, from: number, to: number): number {
  let count = 0;
  view.state.doc.nodesBetween(from, to, (node: Node, pos: number) => {
    // Count direct children of doc that overlap the selection
    if (node.isBlock && node.type.name !== "doc") {
      const nodeEnd = pos + node.nodeSize;
      // Only count if the block meaningfully overlaps (not just touching the edge)
      if (pos < to && nodeEnd > from) {
        count++;
      }
      return false; // don't count nested blocks separately
    }
    return true;
  });
  return count;
}

let nextRevisionId = 1;

export async function reviseSelection(
  getView: () => EditorView | undefined,
): Promise<void> {
  if (sourceViewGuard()) return;

  const view = getView();
  if (!view) return;

  // Guard: already revising
  const pluginState = aiReviseKey.getState(view.state);
  if (pluginState && pluginState.status !== "idle") {
    uiState.showStatus("Revision in progress\u2026");
    return;
  }

  if (!preferencesState.aiVerified()) {
    uiState.showStatus("Check your AI connection in Settings \u2192 AI first");
    return;
  }

  const { from, to } = view.state.selection;
  if (from === to) {
    uiState.showStatus("Select text first, then revise");
    return;
  }

  // Validate selection content — block images, tables, code, math, frontmatter
  const validationError = validateSelection(view, from, to);
  if (validationError) {
    uiState.showStatus(validationError);
    return;
  }

  // Serialize selection as Markdown (preserves **bold**, *italic*, links, etc.)
  const slice = view.state.doc.slice(from, to);
  const tempDoc = view.state.schema.topNodeType.create(null, slice.content);
  const text = serializeMarkdown(tempDoc).trim();
  if (text.length > MAX_SELECTION_LENGTH) {
    uiState.showStatus(`Selection too long (${text.length} chars) \u2014 max ${MAX_SELECTION_LENGTH} characters`);
    return;
  }

  // Warn (but allow) large multi-block selections
  const blocks = countBlocks(view, from, to);
  if (blocks > MULTI_BLOCK_WARN_THRESHOLD) {
    uiState.showStatus("Tip: AI works best on 1\u20132 paragraphs");
    // Brief delay so the user can see the tip, then proceed
    await new Promise((r) => setTimeout(r, 800));
  }

  const apiKey = preferencesState.aiApiKey();
  const baseUrl = preferencesState.getBaseURL();
  const timeoutMs = computeTimeout(text.length);

  // Assign a revision ID so we can detect stale responses after await
  const revisionId = nextRevisionId++;

  // Start loading decoration (shimmer + pill)
  startRevision(view, from, to, text, revisionId);
  uiState.showStatus("Revising\u2026");

  try {
    const revisedText = await Promise.race([
      invoke<string>("ai_revise", {
        baseUrl,
        apiKey,
        model: preferencesState.getModel(),
        prompt: preferencesState.aiPrompt() || AI_DEFAULT_PROMPT,
        text,
      }),
      new Promise<never>((_resolve, reject) =>
        setTimeout(() => reject(new Error("__timeout__")), timeoutMs),
      ),
    ]);

    // Re-resolve view after await — user may have switched tabs
    const currentView = getView();
    if (!currentView) return;

    // Check revision ID — stale response guard
    const currentState = aiReviseKey.getState(currentView.state);
    if (!currentState || currentState.revisionId !== revisionId) return;

    if (!revisedText || revisedText.trim() === "") {
      cancelRevision(currentView);
      uiState.showStatus("AI returned empty response \u2014 try again");
      return;
    }

    if (revisedText.trim() === text.trim()) {
      cancelRevision(currentView);
      uiState.showStatus("No changes suggested");
      return;
    }

    completeRevision(currentView, revisedText, revisionId);
    uiState.showStatus("Accept (\u21a9) or Reject (esc)");
  } catch (err) {
    const currentView = getView();
    if (!currentView) return;
    const currentState = aiReviseKey.getState(currentView.state);
    if (!currentState || currentState.revisionId !== revisionId) return;

    cancelRevision(currentView);

    if (err instanceof Error && err.message === "__timeout__") {
      const secs = Math.round(timeoutMs / 1000);
      uiState.showStatus(`AI took too long (>${secs}s) \u2014 try a shorter selection or try again`);
    } else {
      uiState.showStatus(String(err));
    }
  }
}

/**
 * Cancel any in-flight AI revision on the given view.
 * Call this before tab switches, file opens, or editor teardown
 * to ensure a clean state.
 */
export function cancelActiveRevision(
  getView: () => EditorView | undefined,
): void {
  const view = getView();
  if (!view) return;
  const state = aiReviseKey.getState(view.state);
  if (state && state.status !== "idle") {
    cancelRevision(view);
  }
}

/** @internal — exported for testing only */
export const _testing = { computeTimeout, validateSelection, countBlocks };

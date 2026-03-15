import { invoke } from "@tauri-apps/api/core";
import { preferencesState, AI_DEFAULT_PROMPT } from "../state/preferences";
import { uiState } from "../state/ui";
import {
  aiReviseKey,
  startRevision,
  completeRevision,
  cancelRevision,
} from "../editor/plugins/ai-revise";
import type { EditorView } from "prosemirror-view";

const MAX_SELECTION_LENGTH = 4000;
let nextRevisionId = 1;

export async function reviseSelection(
  getView: () => EditorView | undefined,
): Promise<void> {
  const view = getView();
  if (!view) return;

  // Guard: already revising
  const pluginState = aiReviseKey.getState(view.state);
  if (pluginState && pluginState.status !== "idle") {
    uiState.showStatus("Revision in progress\u2026");
    return;
  }

  const { from, to } = view.state.selection;
  if (from === to) {
    uiState.showStatus("Select text first, then revise");
    return;
  }

  const text = view.state.doc.textBetween(from, to, "\n");
  if (text.length > MAX_SELECTION_LENGTH) {
    uiState.showStatus("Selection too long (max 4000 characters)");
    return;
  }

  const apiKey = preferencesState.aiApiKey();
  if (!apiKey) {
    uiState.showStatus("Set your API key in Settings \u2192 AI");
    return;
  }

  const baseUrl = preferencesState.getBaseURL();
  if (!baseUrl) {
    uiState.showStatus("Set the API base URL in Settings \u2192 AI");
    return;
  }

  // Assign a revision ID so we can detect stale responses after await
  const revisionId = nextRevisionId++;

  // Start loading decoration
  startRevision(view, from, to, text, revisionId);
  uiState.showStatus("Revising\u2026");

  try {
    const revisedText = await invoke<string>("ai_revise", {
      baseUrl,
      apiKey,
      prompt: preferencesState.aiPrompt() || AI_DEFAULT_PROMPT,
      text,
    });

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
    uiState.showStatus(String(err));
  }
}

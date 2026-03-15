import { uiState } from "../state/ui";

/**
 * Guard for commands that require the WYSIWYG editor (ProseMirror).
 * Returns true if in source view (command should abort).
 * Shows a status message directing the user back to the editor.
 */
export function sourceViewGuard(): boolean {
  if (uiState.isSourceView()) {
    uiState.showStatus("Switch to editor first (Cmd+/)");
    return true;
  }
  return false;
}

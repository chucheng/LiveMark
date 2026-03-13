import { registerCommand } from "./registry";
import {
  openFile,
  saveFile,
  saveAsFile,
  newFile,
} from "./file-commands";
import {
  exportHTML,
  exportPDF,
  copyAsHTML,
  copyAsMarkdown,
} from "./export-commands";
import { themeState } from "../state/theme";
import { uiState } from "../state/ui";
import { preferencesState } from "../state/preferences";

export function registerAllCommands() {
  // File
  registerCommand({
    id: "file.new",
    label: "New File",
    shortcut: "Cmd+N",
    category: "File",
    execute: newFile,
  });
  registerCommand({
    id: "file.open",
    label: "Open File",
    shortcut: "Cmd+O",
    category: "File",
    execute: openFile,
  });
  registerCommand({
    id: "file.save",
    label: "Save",
    shortcut: "Cmd+S",
    category: "File",
    execute: saveFile,
  });
  registerCommand({
    id: "file.saveAs",
    label: "Save As…",
    shortcut: "Cmd+Shift+S",
    category: "File",
    execute: saveAsFile,
  });

  registerCommand({
    id: "file.toggleAutoSave",
    label: "Toggle Auto-Save",
    category: "File",
    execute: () => preferencesState.toggleAutoSave(),
  });

  // Export
  registerCommand({
    id: "export.html",
    label: "Export as HTML",
    shortcut: "Cmd+Shift+E",
    category: "Export",
    execute: exportHTML,
  });
  registerCommand({
    id: "export.pdf",
    label: "Print / Export PDF",
    shortcut: "Cmd+P",
    category: "Export",
    execute: exportPDF,
  });
  registerCommand({
    id: "export.copyHTML",
    label: "Copy as HTML",
    shortcut: "Cmd+Shift+C",
    category: "Export",
    execute: copyAsHTML,
  });
  registerCommand({
    id: "export.copyMarkdown",
    label: "Copy as Markdown",
    shortcut: "Cmd+Alt+C",
    category: "Export",
    execute: copyAsMarkdown,
  });

  // View
  registerCommand({
    id: "view.toggleTheme",
    label: "Toggle Theme",
    shortcut: "Cmd+Shift+T",
    category: "View",
    execute: () => { themeState.cycleTheme(); preferencesState.savePreferences(); },
  });
  registerCommand({
    id: "view.sourceView",
    label: "Toggle Source View",
    shortcut: "Cmd+/",
    category: "View",
    execute: () => uiState.toggleSourceView(),
  });
  registerCommand({
    id: "view.focusMode",
    label: "Toggle Focus Mode",
    shortcut: "Cmd+Shift+F",
    category: "View",
    execute: () => preferencesState.toggleFocusMode(),
  });
  registerCommand({
    id: "view.commandPalette",
    label: "Command Palette",
    shortcut: "Cmd+Shift+P",
    category: "View",
    execute: () => uiState.togglePalette(),
  });

  registerCommand({
    id: "view.about",
    label: "About LiveMark",
    category: "View",
    execute: () => { uiState.setAboutOpen(true); },
  });

  // Edit
  registerCommand({
    id: "edit.find",
    label: "Find & Replace",
    shortcut: "Cmd+F",
    category: "Edit",
    execute: () => uiState.toggleFind(),
  });

  registerCommand({
    id: "view.review",
    label: "Toggle Review Panel",
    shortcut: "Cmd+Shift+R",
    category: "View",
    execute: () => uiState.toggleReview(),
  });
}

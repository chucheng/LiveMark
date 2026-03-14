import { registerCommand } from "./registry";
import {
  openFile,
  saveFile,
  saveAsFile,
  newFile,
  closeActiveTab,
} from "./file-commands";
import {
  exportHTML,
  exportPDF,
  copyAsHTML,
  copyAsMarkdown,
  copyAsBeautifulDoc,
} from "./export-commands";
import { themeState } from "../state/theme";
import { uiState } from "../state/ui";
import { preferencesState } from "../state/preferences";
import { fileTreeState } from "../state/filetree";

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
    id: "file.closeTab",
    label: "Close Tab",
    shortcut: "Cmd+W",
    category: "File",
    execute: () => { closeActiveTab(); },
  });

  registerCommand({
    id: "view.toggleSidebar",
    label: "Toggle Sidebar",
    shortcut: "Cmd+\\",
    category: "View",
    execute: () => fileTreeState.toggleSidebar(),
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
  registerCommand({
    id: "export.copyBeautifulDoc",
    label: "Copy as Beautiful Doc",
    category: "Export",
    execute: copyAsBeautifulDoc,
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
    shortcut: "Cmd+J F",
    category: "View",
    execute: () => preferencesState.toggleFocusMode(),
  });
  registerCommand({
    id: "view.typewriterMode",
    label: "Toggle Typewriter Mode",
    category: "View",
    execute: () => preferencesState.toggleTypewriterMode(),
  });
  registerCommand({
    id: "view.commandPalette",
    label: "Command Palette",
    shortcut: "Cmd+Shift+P",
    category: "View",
    execute: () => uiState.togglePalette(),
  });

  registerCommand({
    id: "view.zoomIn",
    label: "Zoom In",
    shortcut: "Cmd+=",
    category: "View",
    execute: () => preferencesState.zoomIn(),
  });
  registerCommand({
    id: "view.zoomOut",
    label: "Zoom Out",
    shortcut: "Cmd+-",
    category: "View",
    execute: () => preferencesState.zoomOut(),
  });
  registerCommand({
    id: "view.zoomReset",
    label: "Reset Zoom",
    shortcut: "Cmd+0",
    category: "View",
    execute: () => preferencesState.resetZoom(),
  });

  registerCommand({
    id: "view.widenContent",
    label: "Widen Content Area",
    category: "View",
    execute: () => preferencesState.widenContent(),
  });
  registerCommand({
    id: "view.narrowContent",
    label: "Narrow Content Area",
    category: "View",
    execute: () => preferencesState.narrowContent(),
  });
  registerCommand({
    id: "view.resetContentWidth",
    label: "Reset Content Width",
    category: "View",
    execute: () => preferencesState.resetContentWidth(),
  });

  registerCommand({
    id: "view.mindMap",
    label: "Toggle Mind Map",
    shortcut: "Cmd+T",
    category: "View",
    execute: () => uiState.toggleMindMap(),
  });
  registerCommand({
    id: "view.settings",
    label: "Settings",
    shortcut: "Cmd+,",
    category: "View",
    execute: () => uiState.toggleSettings(),
  });
  registerCommand({
    id: "view.about",
    label: "About LiveMark",
    category: "View",
    execute: () => { uiState.setAboutOpen(true); },
  });

  // Chord commands (Cmd+J prefix)
  registerCommand({
    id: "file.copyPath",
    label: "Copy File Path",
    shortcut: "Cmd+J P",
    category: "File",
    execute: async () => {
      const { documentState } = await import("../state/document");
      const fp = documentState.filePath();
      if (!fp) return;
      try {
        const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
        await writeText(fp);
      } catch {
        await navigator.clipboard.writeText(fp);
      }
    },
  });
  registerCommand({
    id: "file.closeAll",
    label: "Close All Tabs",
    shortcut: "Cmd+J W",
    category: "File",
    execute: async () => {
      const { confirmAllUnsavedChanges } = await import("./file-commands");
      const { tabsState } = await import("../state/tabs");
      const ok = await confirmAllUnsavedChanges();
      if (!ok) return;
      const allTabs = tabsState.tabs();
      for (const tab of allTabs) tabsState.closeTab(tab.id);
      tabsState.createTab();
    },
  });
  registerCommand({
    id: "view.cycleTheme",
    label: "Cycle Theme",
    shortcut: "Cmd+J T",
    category: "View",
    execute: () => { themeState.cycleTheme(); preferencesState.savePreferences(); },
  });

  // Block
  registerCommand({
    id: "block.copyLink",
    label: "Copy Link to Block",
    category: "Edit",
    execute: async () => {
      // Uses the active block (where cursor is) via the shared editorRef
      const { getBlockAnchor } = await import("../editor/plugins/block-handles");
      const { getEditorRef } = await import("./file-commands");
      const editor = getEditorRef();
      if (!editor) return;
      const view = editor.view;
      const { $head } = view.state.selection;
      if ($head.depth < 1) return;
      const blockPos = $head.before(1);
      const anchor = getBlockAnchor(view, blockPos);
      if (anchor) {
        try {
          const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
          await writeText(`#${anchor}`);
        } catch {
          await navigator.clipboard.writeText(`#${anchor}`);
        }
      }
    },
  });

  registerCommand({
    id: "edit.insertLink",
    label: "Insert Link",
    shortcut: "Cmd+K",
    category: "Edit",
    execute: async () => {
      const { getEditorRef } = await import("./file-commands");
      const editor = getEditorRef();
      if (!editor) return;
      const { schema } = await import("../editor/schema");
      const view = editor.view;
      const { from, to, empty } = view.state.selection;
      const linkMark = schema.marks.link;
      if (!empty && view.state.doc.rangeHasMark(from, to, linkMark)) {
        view.dispatch(view.state.tr.removeMark(from, to, linkMark));
        return;
      }
      const tr = view.state.tr;
      if (empty) {
        const linkText = "link";
        const mark = linkMark.create({ href: "url" });
        tr.insertText(linkText, from);
        tr.addMark(from, from + linkText.length, mark);
        const { TextSelection } = await import("prosemirror-state");
        tr.setSelection(TextSelection.create(tr.doc, from, from + linkText.length));
      } else {
        tr.addMark(from, to, linkMark.create({ href: "" }));
      }
      view.dispatch(tr.scrollIntoView());
    },
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
    id: "find.toggleReplace",
    label: "Toggle Find and Replace",
    shortcut: "Cmd+Shift+H",
    category: "Edit",
    execute: () => {
      window.dispatchEvent(new CustomEvent("lm-toggle-replace"));
    },
  });

  registerCommand({
    id: "view.review",
    label: "Toggle Review Panel",
    shortcut: "Cmd+Shift+R",
    category: "View",
    execute: () => uiState.toggleReview(),
  });
}

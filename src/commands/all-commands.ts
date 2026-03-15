import { registerCommand } from "./registry";
import {
  openFile,
  saveFile,
  saveAsFile,
  newFile,
  closeActiveTab,
  getEditorRef,
} from "./file-commands";
import {
  exportHTML,
  exportPDF,
  exportDOCX,
  copyAsHTML,
  copyAsMarkdown,
} from "./export-commands";
import { reviseSelection } from "./ai-commands";
import { themeState } from "../state/theme";
import { uiState } from "../state/ui";
import { preferencesState } from "../state/preferences";
import { fileTreeState } from "../state/filetree";
import { feedbackState } from "../state/feedback";

/** View getter — re-resolves the EditorView on every call (safe across async boundaries). */
function getEditorView() { return getEditorRef()?.view; }

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
    execute: () => {
      fileTreeState.toggleSidebar();
      uiState.showStatus(`Sidebar: ${fileTreeState.sidebarVisible() ? "On" : "Off"}`);
    },
  });

  registerCommand({
    id: "file.toggleAutoSave",
    label: "Toggle Auto-Save",
    category: "File",
    execute: () => {
      preferencesState.toggleAutoSave();
      uiState.showStatus(`Auto-save: ${preferencesState.autoSave() ? "On" : "Off"}`);
    },
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
    id: "export.docx",
    label: "Export as Word Document",
    shortcut: "Cmd+Shift+D",
    category: "Export",
    execute: exportDOCX,
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
    execute: () => {
      themeState.cycleTheme();
      preferencesState.savePreferences();
      const labels: Record<string, string> = { light: "Light", dark: "Dark", system: "Auto" };
      uiState.showStatus(`Theme: ${labels[themeState.theme()]}`);
    },
  });
  registerCommand({
    id: "view.sourceView",
    label: "Toggle Source View",
    shortcut: "Cmd+/",
    category: "View",
    execute: () => {
      uiState.toggleSourceView();
      uiState.showStatus(`Source view: ${uiState.isSourceView() ? "On" : "Off"}`);
    },
  });
  registerCommand({
    id: "view.typewriterMode",
    label: "Toggle Typewriter Mode",
    category: "View",
    execute: () => {
      preferencesState.toggleTypewriterMode();
      uiState.showStatus(`Typewriter: ${preferencesState.typewriterMode() ? "On" : "Off"}`);
    },
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
    execute: () => {
      preferencesState.zoomIn();
      uiState.showStatus(`Zoom: ${Math.round(preferencesState.fontSize() / 16 * 100)}%`);
    },
  });
  registerCommand({
    id: "view.zoomOut",
    label: "Zoom Out",
    shortcut: "Cmd+-",
    category: "View",
    execute: () => {
      preferencesState.zoomOut();
      uiState.showStatus(`Zoom: ${Math.round(preferencesState.fontSize() / 16 * 100)}%`);
    },
  });
  registerCommand({
    id: "view.zoomReset",
    label: "Reset Zoom",
    shortcut: "Cmd+0",
    category: "View",
    execute: () => {
      preferencesState.resetZoom();
      uiState.showStatus(`Zoom: ${Math.round(preferencesState.fontSize() / 16 * 100)}%`);
    },
  });

  registerCommand({
    id: "view.widenContent",
    label: "Widen Content Area",
    category: "View",
    execute: () => {
      preferencesState.widenContent();
      uiState.showStatus(`Width: ${preferencesState.contentWidth()}px`);
    },
  });
  registerCommand({
    id: "view.narrowContent",
    label: "Narrow Content Area",
    category: "View",
    execute: () => {
      preferencesState.narrowContent();
      uiState.showStatus(`Width: ${preferencesState.contentWidth()}px`);
    },
  });
  registerCommand({
    id: "view.resetContentWidth",
    label: "Reset Content Width",
    category: "View",
    execute: () => {
      preferencesState.resetContentWidth();
      uiState.showStatus(`Width: ${preferencesState.contentWidth()}px`);
    },
  });

  registerCommand({
    id: "view.outline",
    label: "Show Outline",
    shortcut: "Cmd+Shift+O",
    category: "View",
    execute: () => {
      fileTreeState.setSidebarVisible(true);
      fileTreeState.setSidebarTab("outline");
      uiState.showStatus("Outline");
    },
  });

  registerCommand({
    id: "view.focusMode",
    label: "Toggle Focus Mode",
    shortcut: "Cmd+T",
    category: "View",
    execute: () => {
      preferencesState.toggleFocusMode();
      const level = preferencesState.focusMode();
      const labels: Record<string, string> = { off: "Off", block: "Block" };
      uiState.showStatus(`Focus: ${labels[level]}`);
    },
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
  registerCommand({
    id: "help.feedback",
    label: "Send Feedback",
    category: "View",
    execute: () => feedbackState.openFeedbackEmail(),
  });
  registerCommand({
    id: "help.tutorial",
    label: "Show Tutorial",
    category: "View",
    execute: async () => {
      const tutorialMd = (await import("../../docs/tutorial.md?raw")).default;
      const { getEditorRef } = await import("./file-commands");
      const { tabsState } = await import("../state/tabs");
      const editor = getEditorRef();
      if (!editor) return;
      // Snapshot current tab
      const scroller = editor.view.dom.closest(".lm-editor-wrapper") as HTMLElement | null;
      tabsState.snapshotActiveTab(editor.view, scroller);
      // Open tutorial in a new tab
      const tab = tabsState.createTab();
      if (!tab) { uiState.showStatus("Too many tabs open"); return; }
      editor.setMarkdown(tutorialMd);
      tabsState.updateTab(tab.id, { fileName: "Tutorial" });
    },
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
      if (!fp) { uiState.showStatus("No file open"); return; }
      try {
        const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
        await writeText(fp);
      } catch {
        await navigator.clipboard.writeText(fp);
      }
      uiState.showStatus("Path copied");
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
    execute: () => {
      themeState.cycleTheme();
      preferencesState.savePreferences();
      const labels: Record<string, string> = { light: "Light", dark: "Dark", system: "Auto" };
      uiState.showStatus(`Theme: ${labels[themeState.theme()]}`);
    },
  });

  // AI
  registerCommand({
    id: "ai.revise",
    label: "AI: Revise Selection",
    shortcut: "Cmd+J R",
    category: "AI",
    execute: () => reviseSelection(getEditorView),
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
    execute: async () => {
      if (uiState.isFindOpen()) {
        // Already open — re-focus and select the find input
        window.dispatchEvent(new CustomEvent("lm-find-focus"));
        return;
      }
      // Pre-fill with selected text
      const { getEditorRef } = await import("./file-commands");
      const editor = getEditorRef();
      let selectedText = "";
      if (editor) {
        const { from, to } = editor.view.state.selection;
        if (from !== to) {
          selectedText = editor.view.state.doc.textBetween(from, to, " ");
        }
      }
      uiState.openFind(selectedText);
    },
  });

  registerCommand({
    id: "edit.insertImage",
    label: "Insert Image",
    shortcut: "Cmd+Shift+I",
    category: "Edit",
    execute: async () => {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"] }],
      });
      if (!selected) return;

      const { invoke } = await import("@tauri-apps/api/core");
      const { documentState } = await import("../state/document");
      const { getEditorRef } = await import("./file-commands");
      const { schema } = await import("../editor/schema");

      const fp = documentState.filePath();
      const docDir = fp ? fp.slice(0, fp.lastIndexOf("/")) || null : null;

      try {
        const savedPath = await invoke<string>("copy_image", { source: selected, docDir });
        const editor = getEditorRef();
        if (!editor) return;
        const fileName = selected.split("/").pop() ?? "";
        const node = schema.nodes.image.create({ src: savedPath, alt: fileName });
        const tr = editor.view.state.tr.replaceSelectionWith(node);
        editor.view.dispatch(tr.scrollIntoView());
      } catch {
        uiState.showStatus("Failed to insert image");
      }
    },
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

}

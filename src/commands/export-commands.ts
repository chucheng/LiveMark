import { invoke } from "@tauri-apps/api/core";
import { save, message } from "@tauri-apps/plugin-dialog";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { documentState } from "../state/document";
import { generateHTML, renderHTMLBody, type TemplateSettings } from "../export/html-template";
import { preferencesState } from "../state/preferences";
import { uiState } from "../state/ui";
import { generateDOCX } from "../export/docx-generator";
import { markdownSerializer } from "../editor/markdown/serializer";
import type { EditorInstance } from "../editor/editor";

let editorRef: EditorInstance | null = null;
let exportInProgress = false;

export function setExportEditorRef(editor: EditorInstance) {
  editorRef = editor;
}

function currentTemplate(): TemplateSettings {
  return {
    fontFamily: preferencesState.fontFamily(),
    fontSize: preferencesState.fontSize(),
    lineHeight: preferencesState.lineHeight(),
    contentWidth: preferencesState.contentWidth(),
    paragraphSpacing: preferencesState.paragraphSpacing(),
  };
}

/**
 * Export the current document as a standalone HTML file.
 * Cmd+Shift+E
 */
export async function exportHTML() {
  if (!editorRef || exportInProgress) return;
  exportInProgress = true;

  try {
  const markdown = editorRef.getMarkdown();
  const title = documentState.fileName().replace(/\.(md|markdown)$/, "");
  const filePath = documentState.filePath();
  const docDir = filePath ? filePath.replace(/[/\\][^/\\]+$/, "") : undefined;
  const html = generateHTML(markdown, title, currentTemplate(), docDir);

  const path = await save({
    filters: [{ name: "HTML", extensions: ["html"] }],
    defaultPath: title + ".html",
  });

  if (!path) return;
  // Re-validate after async dialog — editor may have been destroyed
  if (!editorRef) return;

  try {
    await invoke("write_file", { path, content: html });
    await message("Exported to HTML successfully.", { title: "Export" });
  } catch (err) {
    await message(`Failed to export HTML:\n${err}`, {
      title: "Export Error",
      kind: "error",
    });
  }
  } finally {
    exportInProgress = false;
  }
}

/**
 * Export the current document to PDF via the system browser's print dialog.
 * Writes a temp HTML file and opens it in the default browser where
 * the user can use Cmd+P / Ctrl+P to print or save as PDF.
 * Cmd+P
 */
export async function exportPDF() {
  if (!editorRef || exportInProgress) return;
  exportInProgress = true;

  try {
  // Warn for very large documents
  const blockCount = editorRef.view.state.doc.childCount;
  if (blockCount > 500) {
    const result = await message(
      `This document has ${blockCount} blocks. PDF export may be slow or cause high memory usage. Continue?`,
      { title: "Large Document", kind: "warning", buttons: { yes: "Continue", no: "Cancel", cancel: "Cancel" } },
    );
    if (result !== "Continue") return;
  }

  const markdown = editorRef.getMarkdown();
  const title = documentState.fileName().replace(/\.(md|markdown)$/, "");
  const filePath = documentState.filePath();
  const docDir = filePath ? filePath.replace(/[/\\][^/\\]+$/, "") : undefined;
  const html = generateHTML(markdown, title, currentTemplate(), docDir);

  try {
    const tempPath = await invoke<string>("write_temp_html", {
      content: html,
      name: title + ".html",
    });
    await shellOpen("file://" + tempPath);
    uiState.showStatus("Opened in browser — use ⌘P to print/save as PDF");
  } catch (err) {
    await message(`Failed to export PDF:\n${err}`, {
      title: "Export Error",
      kind: "error",
    });
  }
  } finally {
    exportInProgress = false;
  }
}

/**
 * Copy the rendered HTML to the system clipboard.
 * Cmd+Shift+C
 */
export async function copyAsHTML() {
  if (!editorRef) return;

  const markdown = editorRef.getMarkdown();
  const html = renderHTMLBody(markdown);

  try {
    await writeText(html);
    uiState.showStatus("Copied as HTML");
  } catch (err) {
    await message(`Failed to copy HTML:\n${err}`, {
      title: "Copy Error",
      kind: "error",
    });
  }
}

/**
 * Copy the raw Markdown to the system clipboard.
 * Selection-aware: if text is selected, copies only that range as Markdown.
 * Cmd+Alt+C
 */
export async function copyAsMarkdown() {
  if (!editorRef) return;

  let markdown: string;
  const { from, to } = editorRef.view.state.selection;

  if (from !== to) {
    // Selection exists — serialize only the selected slice
    const slice = editorRef.view.state.doc.slice(from, to);
    const fragment = slice.content;
    // Build a temporary doc from the fragment for serialization
    const schema = editorRef.view.state.schema;
    const tempDoc = schema.topNodeType.create(null, fragment);
    markdown = markdownSerializer.serialize(tempDoc);
  } else {
    markdown = editorRef.getMarkdown();
  }

  try {
    await writeText(markdown);
    uiState.showStatus("Copied as Markdown");
  } catch (err) {
    await message(`Failed to copy Markdown:\n${err}`, {
      title: "Copy Error",
      kind: "error",
    });
  }
}

/**
 * Export the current document as a Word (.docx) file.
 * Cmd+Shift+D
 */
export async function exportDOCX() {
  if (!editorRef || exportInProgress) return;
  exportInProgress = true;

  try {
    const doc = editorRef.view.state.doc;
    const title = documentState.fileName().replace(/\.(md|markdown)$/, "");
    const filePath = documentState.filePath();
    const docDir = filePath ? filePath.replace(/[/\\][^/\\]+$/, "") : undefined;

    const data = await generateDOCX(doc, title, docDir);

    const path = await save({
      filters: [{ name: "Word Document", extensions: ["docx"] }],
      defaultPath: title + ".docx",
    });

    if (!path) return;
    if (!editorRef) return;

    try {
      await invoke("write_binary_file", { path, data: Array.from(data) });
      await message("Exported to Word document successfully.", { title: "Export" });
    } catch (err) {
      await message(`Failed to export DOCX:\n${err}`, {
        title: "Export Error",
        kind: "error",
      });
    }
  } finally {
    exportInProgress = false;
  }
}


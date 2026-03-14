import { invoke } from "@tauri-apps/api/core";
import { save, message } from "@tauri-apps/plugin-dialog";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { documentState } from "../state/document";
import { generateHTML, renderHTMLBody, type TemplateSettings } from "../export/html-template";
import { preferencesState } from "../state/preferences";
import { uiState } from "../state/ui";
import { generateBeautifulHTML } from "../export/beautiful-doc";
import { markdownSerializer } from "../editor/markdown/serializer";
import type { EditorInstance } from "../editor/editor";

let editorRef: EditorInstance | null = null;

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
  if (!editorRef) return;

  const markdown = editorRef.getMarkdown();
  const title = documentState.fileName().replace(/\.(md|markdown)$/, "");
  const html = generateHTML(markdown, title, currentTemplate());

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
}

/**
 * Export the current document to PDF via system print dialog.
 * Uses a hidden iframe approach for cross-platform compatibility.
 * Cmd+P
 */
export async function exportPDF() {
  if (!editorRef) return;

  const markdown = editorRef.getMarkdown();
  const title = documentState.fileName().replace(/\.(md|markdown)$/, "");
  const html = generateHTML(markdown, title, currentTemplate());

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "-9999px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  let printed = false;

  function printAndCleanup() {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }
  }

  // Wait for content to render before printing
  iframe.onload = printAndCleanup;

  // Fallback: if onload doesn't fire (content already loaded via write)
  setTimeout(printAndCleanup, 200);
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
 * Copy as Beautiful Doc — styled HTML with inline CSS.
 * Pastes nicely into Google Docs, Notion, etc.
 */
export async function copyAsBeautifulDoc() {
  if (!editorRef) return;

  const markdown = editorRef.getMarkdown();
  const html = generateBeautifulHTML(markdown);

  try {
    await writeText(html);
    uiState.showStatus("Copied as Beautiful Doc");
  } catch (err) {
    await message(`Failed to copy Beautiful Doc:\n${err}`, {
      title: "Copy Error",
      kind: "error",
    });
  }
}

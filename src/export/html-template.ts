import { md } from "../editor/markdown/parser";
import { getExportCSS } from "./export-css";

/**
 * Generate a full standalone HTML document from Markdown.
 * Uses the same markdown-it instance as the editor for consistent rendering.
 */
export function generateHTML(markdown: string, title: string): string {
  const bodyHTML = md.render(markdown);
  const css = getExportCSS();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>${css}</style>
</head>
<body>
  <div class="livemark-export">${bodyHTML}</div>
</body>
</html>`;
}

/**
 * Render Markdown to HTML body content only (no document wrapper).
 * Used for Copy as HTML.
 */
export function renderHTMLBody(markdown: string): string {
  return md.render(markdown);
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

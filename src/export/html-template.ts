import { md } from "../editor/markdown/parser";
import { getExportCSS } from "./export-css";

export interface TemplateSettings {
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  contentWidth?: number;
  paragraphSpacing?: string;
}

/**
 * Generate CSS variable overrides from template settings.
 */
function templateOverrides(settings?: TemplateSettings): string {
  if (!settings) return "";
  const overrides: string[] = [];

  if (settings.fontFamily) {
    let fontCSS: string;
    switch (settings.fontFamily) {
      case "serif":
        fontCSS = '"Georgia", "Times New Roman", "Noto Serif", serif';
        break;
      case "mono":
        fontCSS = '"JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", monospace';
        break;
      case "system":
        fontCSS = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        break;
      default:
        fontCSS = settings.fontFamily;
    }
    overrides.push(`--lm-font-body: ${fontCSS}`);
  }
  if (settings.fontSize) overrides.push(`--lm-font-size: ${settings.fontSize}px`);
  if (settings.lineHeight) overrides.push(`--lm-line-height: ${settings.lineHeight}`);
  if (settings.contentWidth) overrides.push(`--lm-content-width: ${settings.contentWidth}px`);
  if (settings.paragraphSpacing) overrides.push(`--lm-paragraph-spacing: ${settings.paragraphSpacing}`);

  if (overrides.length === 0) return "";
  return `:root { ${overrides.join("; ")}; }`;
}

/**
 * Generate a full standalone HTML document from Markdown.
 * Uses the same markdown-it instance as the editor for consistent rendering.
 */
export function generateHTML(markdown: string, title: string, template?: TemplateSettings): string {
  const bodyHTML = md.render(markdown);
  const css = getExportCSS();
  const overrideCSS = templateOverrides(template);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>${css}${overrideCSS ? "\n" + overrideCSS : ""}</style>
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

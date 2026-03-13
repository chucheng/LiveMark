import { md } from "../editor/markdown/parser";
import { getExportCSS } from "./export-css";

/**
 * Generate styled HTML for clipboard copy ("Copy as Beautiful Doc").
 * Includes inline CSS so it pastes well into Google Docs, Notion, etc.
 * Uses a scoped style approach with a wrapper element.
 */
export function generateBeautifulHTML(markdown: string): string {
  const bodyHTML = md.render(markdown);
  const css = getExportCSS();

  // Wrap in a div with scoped styles. Clipboard HTML includes a <style> tag
  // that rich-text editors will often honor.
  return `<div class="livemark-export"><style>${css}</style>${bodyHTML}</div>`;
}

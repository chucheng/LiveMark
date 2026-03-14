import { Node } from "prosemirror-model";

export interface HeadingEntry {
  level: number;
  text: string;
  sanitizedText: string;
  pos: number;
  id: string;
}

/**
 * Extract all headings from a ProseMirror document.
 */
export function extractHeadings(doc: Node): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  doc.forEach((node, offset) => {
    if (node.type.name === "heading") {
      const text = node.textContent || "Untitled";
      const id = `h${headings.length}`;
      headings.push({ level: node.attrs.level, text, sanitizedText: sanitize(text), pos: offset, id });
    }
  });
  return headings;
}

/**
 * Generate Mermaid mindmap markup from heading hierarchy.
 */
export function headingsToMindmap(headings: HeadingEntry[]): string {
  if (headings.length === 0) return "mindmap\n  root((Document))";

  const lines: string[] = ["mindmap"];
  // Root = first H1, or "Document"
  const rootHeading = headings.find((h) => h.level === 1);
  const rootText = rootHeading ? sanitize(rootHeading.text) : "Document";
  lines.push(`  root((${rootText}))`);

  for (const h of headings) {
    if (rootHeading && h === rootHeading) continue;
    // indent = 2 spaces per level + 2 base
    const indent = "  ".repeat(h.level + 1);
    lines.push(`${indent}${sanitize(h.text)}`);
  }

  return lines.join("\n");
}

function sanitize(text: string): string {
  // Remove chars that break mermaid syntax
  return text.replace(/[()[\]{}]/g, "").replace(/"/g, "'").trim() || "Untitled";
}

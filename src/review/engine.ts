import type { Node } from "prosemirror-model";

export type ReviewSeverity = "suggestion" | "warning" | "issue";

export interface ReviewItem {
  id: string;
  severity: ReviewSeverity;
  title: string;
  description: string;
  line: number;
  pos: number;
}

let idCounter = 0;

function makeId(): string {
  return `rv-${++idCounter}`;
}

function getLineFromPos(doc: Node, pos: number): number {
  let line = 1;
  doc.nodesBetween(0, Math.min(pos, doc.content.size), (node, nodePos) => {
    if (node.isBlock && nodePos < pos) {
      line++;
    }
    return nodePos < pos;
  });
  return Math.max(1, line - 1);
}

export function analyzeDocument(doc: Node): ReviewItem[] {
  idCounter = 0;
  const items: ReviewItem[] = [];
  const headingLevels: number[] = [];
  const headingTexts: string[] = [];
  let hasH1 = false;

  doc.descendants((node, pos) => {
    // Check headings
    if (node.type.name === "heading") {
      const level = node.attrs.level as number;
      const text = node.textContent.trim();
      const line = getLineFromPos(doc, pos);

      if (level === 1) hasH1 = true;

      // Empty heading
      if (!text) {
        items.push({
          id: makeId(),
          severity: "warning",
          title: "Empty heading",
          description: `Heading level ${level} has no content`,
          line,
          pos,
        });
      }

      // Heading hierarchy skip
      if (headingLevels.length > 0) {
        const prev = headingLevels[headingLevels.length - 1];
        if (level > prev + 1) {
          items.push({
            id: makeId(),
            severity: "suggestion",
            title: "Heading level skipped",
            description: `Jumped from h${prev} to h${level}`,
            line,
            pos,
          });
        }
      }

      // Duplicate heading text
      if (text && headingTexts.includes(text)) {
        items.push({
          id: makeId(),
          severity: "suggestion",
          title: "Duplicate heading",
          description: `"${text.slice(0, 40)}${text.length > 40 ? "…" : ""}"`,
          line,
          pos,
        });
      }

      headingLevels.push(level);
      if (text) headingTexts.push(text);
    }

    // Image without alt text
    if (node.type.name === "image") {
      const alt = (node.attrs.alt as string) || "";
      if (!alt.trim()) {
        items.push({
          id: makeId(),
          severity: "warning",
          title: "Image missing alt text",
          description: "Add descriptive alt text for accessibility",
          line: getLineFromPos(doc, pos),
          pos,
        });
      }
    }

    // Empty link
    if (node.isInline && node.marks) {
      for (const mark of node.marks) {
        if (mark.type.name === "link") {
          const href = (mark.attrs.href as string) || "";
          if (!href.trim()) {
            items.push({
              id: makeId(),
              severity: "issue",
              title: "Empty link",
              description: "Link has no URL",
              line: getLineFromPos(doc, pos),
              pos,
            });
          }
        }
      }
    }

    // Code block without language
    if (node.type.name === "code_block") {
      const lang = (node.attrs.language as string) || "";
      if (!lang.trim()) {
        items.push({
          id: makeId(),
          severity: "suggestion",
          title: "Code block without language",
          description: "Specify a language for syntax highlighting",
          line: getLineFromPos(doc, pos),
          pos,
        });
      }
    }

    // Very long paragraph (over 300 words)
    if (node.type.name === "paragraph") {
      const text = node.textContent;
      const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
      if (words.length > 300) {
        items.push({
          id: makeId(),
          severity: "suggestion",
          title: "Long paragraph",
          description: `${words.length} words — consider splitting`,
          line: getLineFromPos(doc, pos),
          pos,
        });
      }
    }

    return true;
  });

  // No document title
  if (!hasH1 && doc.content.size > 2) {
    items.push({
      id: makeId(),
      severity: "suggestion",
      title: "No document title",
      description: "Consider adding an h1 heading",
      line: 1,
      pos: 0,
    });
  }

  return items;
}

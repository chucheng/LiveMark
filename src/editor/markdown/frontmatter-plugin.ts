import type MarkdownIt from "markdown-it";

/**
 * markdown-it plugin for YAML frontmatter.
 * Detects `---` fenced content at the very beginning of the document.
 */
export function frontmatterPlugin(md: MarkdownIt): void {
  md.block.ruler.before("hr", "frontmatter", (state, startLine, endLine, silent) => {
    // Must start at the very beginning of the document
    if (startLine !== 0) return false;

    const startPos = state.bMarks[startLine] + state.tShift[startLine];
    const maxPos = state.eMarks[startLine];
    const firstLine = state.src.slice(startPos, maxPos).trim();

    if (firstLine !== "---") return false;

    // Find closing ---
    let nextLine = startLine + 1;
    let found = false;

    while (nextLine < endLine) {
      const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
      const lineEnd = state.eMarks[nextLine];
      const line = state.src.slice(lineStart, lineEnd).trim();

      if (line === "---" || line === "...") {
        found = true;
        break;
      }
      nextLine++;
    }

    if (!found) return false;
    if (silent) return true;

    // Extract content between the fences
    const contentStart = state.bMarks[startLine + 1];
    const contentEnd = state.bMarks[nextLine];
    let content = state.src.slice(contentStart, contentEnd);

    // Remove trailing newline
    if (content.endsWith("\n")) {
      content = content.slice(0, -1);
    }

    const token = state.push("frontmatter", "", 0);
    token.content = content;
    token.map = [startLine, nextLine + 1];

    state.line = nextLine + 1;
    return true;
  });
}

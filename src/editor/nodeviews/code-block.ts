import { Node } from "prosemirror-model";
import { EditorView, NodeView } from "prosemirror-view";
import { highlightCode } from "../highlight";

const LANG_ICONS: Record<string, string> = {
  javascript: '<path d="M3 3h10v10H3z" fill="#f7df1e"/><text x="8" y="11.5" font-size="7" font-weight="bold" fill="#333" text-anchor="middle">JS</text>',
  typescript: '<path d="M3 3h10v10H3z" fill="#3178c6"/><text x="8" y="11.5" font-size="7" font-weight="bold" fill="#fff" text-anchor="middle">TS</text>',
  python: '<circle cx="6" cy="6" r="2" fill="#3572a5"/><circle cx="10" cy="10" r="2" fill="#ffd43b"/><path d="M6 4v4h2V4zM10 8v4h-2V8z" fill="#306998"/>',
  java: '<text x="8" y="11.5" font-size="8" font-weight="bold" fill="#b07219" text-anchor="middle" font-family="serif">J</text>',
  rust: '<text x="8" y="11.5" font-size="7" font-weight="bold" fill="#dea584" text-anchor="middle">Rs</text>',
  go: '<text x="8" y="11.5" font-size="7" font-weight="bold" fill="#00add8" text-anchor="middle">Go</text>',
  ruby: '<polygon points="8,2 13,6 11,12 5,12 3,6" fill="#cc342d" opacity="0.8"/>',
  php: '<text x="8" y="11.5" font-size="6" font-weight="bold" fill="#777bb4" text-anchor="middle">PHP</text>',
  swift: '<text x="8" y="11.5" font-size="7" font-weight="bold" fill="#f05138" text-anchor="middle">Sw</text>',
  kotlin: '<polygon points="3,3 8,8 3,13" fill="#7f52ff"/><polygon points="3,3 13,3 8,8 13,13 3,13" fill="#7f52ff" opacity="0.6"/>',
  css: '<path d="M3 3h10v10H3z" fill="#264de4"/><text x="8" y="11.5" font-size="5" font-weight="bold" fill="#fff" text-anchor="middle">CSS</text>',
  html: '<text x="8" y="11.5" font-size="4.5" font-weight="bold" fill="#e34c26" text-anchor="middle">HTML</text>',
  json: '<text x="8" y="11" font-size="9" fill="var(--lm-text-muted)" text-anchor="middle">{}</text>',
  bash: '<text x="8" y="11.5" font-size="7" font-weight="bold" fill="#4eaa25" text-anchor="middle">$_</text>',
  shell: '<text x="8" y="11.5" font-size="7" font-weight="bold" fill="#4eaa25" text-anchor="middle">$_</text>',
  sql: '<text x="8" y="11.5" font-size="6" font-weight="bold" fill="#e38c00" text-anchor="middle">SQL</text>',
  c: '<text x="8" y="11.5" font-size="9" font-weight="bold" fill="#555d6e" text-anchor="middle">C</text>',
  cpp: '<text x="8" y="11.5" font-size="6" font-weight="bold" fill="#004482" text-anchor="middle">C++</text>',
  csharp: '<text x="8" y="11.5" font-size="7" font-weight="bold" fill="#68217a" text-anchor="middle">C#</text>',
  yaml: '<text x="8" y="11.5" font-size="5" font-weight="bold" fill="#cb171e" text-anchor="middle">YML</text>',
  xml: '<text x="8" y="11" font-size="8" fill="var(--lm-text-muted)" text-anchor="middle">&lt;/&gt;</text>',
  markdown: '<text x="8" y="11.5" font-size="6" font-weight="bold" fill="var(--lm-text-muted)" text-anchor="middle">MD</text>',
};

const LANG_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  zsh: "bash",
  yml: "yaml",
  "c++": "cpp",
  "c#": "csharp",
  md: "markdown",
};

function langIcon(lang: string): string {
  const normalized = lang.toLowerCase();
  const key = LANG_ALIASES[normalized] || normalized;
  const paths = LANG_ICONS[key] || '<text x="8" y="11" font-size="8" fill="var(--lm-text-muted)" text-anchor="middle" font-family="monospace">&lt;/&gt;</text>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16">${paths}</svg>`;
}

function langDisplayName(lang: string): string {
  const lower = lang.toLowerCase();
  const specialCases: Record<string, string> = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    java: "Java",
    rust: "Rust",
    go: "Go",
    ruby: "Ruby",
    php: "PHP",
    swift: "Swift",
    kotlin: "Kotlin",
    css: "CSS",
    html: "HTML",
    json: "JSON",
    bash: "Bash",
    shell: "Shell",
    sql: "SQL",
    c: "C",
    cpp: "C++",
    csharp: "C#",
    yaml: "YAML",
    xml: "XML",
    markdown: "Markdown",
    js: "JavaScript",
    ts: "TypeScript",
    py: "Python",
    rb: "Ruby",
    sh: "Bash",
    yml: "YAML",
    md: "Markdown",
  };
  return specialCases[lower] || lang.charAt(0).toUpperCase() + lang.slice(1);
}

export class CodeBlockView implements NodeView {
  dom: HTMLElement;
  contentDOM: HTMLElement;
  private openFence: HTMLElement;
  private closeFence: HTMLElement;
  private highlightEl: HTMLElement;
  private badge: HTMLElement | null = null;
  private language: string;

  constructor(node: Node, _view: EditorView, _getPos: () => number | undefined) {
    this.language = (node.attrs.language as string) || "";

    this.dom = document.createElement("div");
    this.dom.className = "lm-code-block-wrapper";

    // Language badge (conditionally created)
    this.badge = this.createBadge(this.language);

    // Open fence
    this.openFence = document.createElement("div");
    this.openFence.className = "lm-fence lm-fence-open";
    this.openFence.textContent = "```" + this.language;
    this.openFence.contentEditable = "false";

    // Pre > code (highlight overlay + editable content)
    const pre = document.createElement("pre");

    this.highlightEl = document.createElement("code");
    this.highlightEl.className = "lm-code-highlight";
    this.highlightEl.contentEditable = "false";

    this.contentDOM = document.createElement("code");
    if (this.language) this.contentDOM.className = `language-${this.language}`;

    pre.appendChild(this.highlightEl);
    pre.appendChild(this.contentDOM);

    // Close fence
    this.closeFence = document.createElement("div");
    this.closeFence.className = "lm-fence lm-fence-close";
    this.closeFence.textContent = "```";
    this.closeFence.contentEditable = "false";

    // Assemble
    if (this.badge) this.dom.appendChild(this.badge);
    this.dom.appendChild(this.openFence);
    this.dom.appendChild(pre);
    this.dom.appendChild(this.closeFence);

    this.updateHighlight(node.textContent);
  }

  private createBadge(lang: string): HTMLElement | null {
    if (!lang) return null;
    const badge = document.createElement("span");
    badge.className = "lm-code-lang-badge";
    badge.innerHTML = langIcon(lang) + langDisplayName(lang);
    return badge;
  }

  private updateHighlight(code: string) {
    this.highlightEl.innerHTML = highlightCode(code, this.language);
  }

  update(node: Node): boolean {
    if (node.type.name !== "code_block") return false;
    const lang = (node.attrs.language as string) || "";
    this.language = lang;
    this.openFence.textContent = "```" + lang;
    if (lang) {
      this.contentDOM.className = `language-${lang}`;
    } else {
      this.contentDOM.className = "";
    }

    // Update badge
    if (this.badge) {
      this.badge.remove();
      this.badge = null;
    }
    if (lang) {
      this.badge = this.createBadge(lang);
      if (this.badge) this.dom.insertBefore(this.badge, this.dom.firstChild);
    }

    this.updateHighlight(node.textContent);
    return true;
  }
}

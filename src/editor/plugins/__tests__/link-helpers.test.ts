import { describe, it, expect } from "vitest";
import { isLocalFile, resolveRelativePath, DANGEROUS_SCHEMES } from "../link-helpers";

// ─── isLocalFile ────────────────────────────────────────────────

describe("isLocalFile", () => {
  // ── Positive: things that ARE local files ──

  it("treats simple relative path as local", () => {
    expect(isLocalFile("tutorial.md")).toBe(true);
  });

  it("treats relative path with directory as local", () => {
    expect(isLocalFile("docs/guide.md")).toBe(true);
  });

  it("treats parent traversal as local", () => {
    expect(isLocalFile("../README.md")).toBe(true);
  });

  it("treats deeply nested relative path as local", () => {
    expect(isLocalFile("a/b/c/d/file.txt")).toBe(true);
  });

  it("treats absolute path as local", () => {
    expect(isLocalFile("/Users/x/docs/file.md")).toBe(true);
  });

  it("treats dotfile as local", () => {
    expect(isLocalFile(".gitignore")).toBe(true);
  });

  it("treats file with spaces as local", () => {
    expect(isLocalFile("my document.md")).toBe(true);
  });

  it("treats percent-encoded path as local", () => {
    expect(isLocalFile("my%20document.md")).toBe(true);
  });

  it("treats path with query as local", () => {
    // e.g. some markdown tools add ?raw to local links
    expect(isLocalFile("file.md?raw")).toBe(true);
  });

  it("treats path with fragment as local", () => {
    expect(isLocalFile("file.md#section")).toBe(true);
  });

  // ── Negative: things that are NOT local files ──

  describe("external URLs with scheme://", () => {
    it("rejects http://", () => {
      expect(isLocalFile("http://example.com")).toBe(false);
    });

    it("rejects https://", () => {
      expect(isLocalFile("https://example.com/page")).toBe(false);
    });

    it("rejects ftp://", () => {
      expect(isLocalFile("ftp://files.example.com/doc.pdf")).toBe(false);
    });

    it("rejects file://", () => {
      expect(isLocalFile("file:///etc/passwd")).toBe(false);
    });

    it("rejects custom scheme with ://", () => {
      expect(isLocalFile("custom-app://open/thing")).toBe(false);
    });
  });

  describe("non-URL schemes (mailto, tel, etc.)", () => {
    it("rejects mailto:", () => {
      expect(isLocalFile("mailto:user@example.com")).toBe(false);
    });

    it("rejects tel:", () => {
      expect(isLocalFile("tel:+1234567890")).toBe(false);
    });

    it("rejects sms:", () => {
      expect(isLocalFile("sms:+1234567890")).toBe(false);
    });

    it("rejects slack:", () => {
      expect(isLocalFile("slack://channel/C123")).toBe(false);
    });

    it("rejects steam:", () => {
      expect(isLocalFile("steam:run/12345")).toBe(false);
    });

    it("rejects obsidian:", () => {
      expect(isLocalFile("obsidian://open?vault=test")).toBe(false);
    });

    it("rejects vscode:", () => {
      expect(isLocalFile("vscode://file/path/to/file")).toBe(false);
    });
  });

  describe("dangerous schemes", () => {
    it("rejects javascript:", () => {
      expect(isLocalFile("javascript:alert(1)")).toBe(false);
    });

    it("rejects JAVASCRIPT: (case insensitive)", () => {
      expect(isLocalFile("JAVASCRIPT:alert(1)")).toBe(false);
    });

    it("rejects data:", () => {
      expect(isLocalFile("data:text/html,<h1>hi</h1>")).toBe(false);
    });

    it("rejects vbscript:", () => {
      expect(isLocalFile("vbscript:MsgBox")).toBe(false);
    });
  });

  describe("protocol-relative URLs", () => {
    it("rejects //example.com", () => {
      expect(isLocalFile("//example.com/path")).toBe(false);
    });

    it("rejects //cdn.example.com/file.js", () => {
      expect(isLocalFile("//cdn.example.com/file.js")).toBe(false);
    });
  });

  describe("anchor-only links", () => {
    it("rejects #section", () => {
      expect(isLocalFile("#section")).toBe(false);
    });

    it("rejects #", () => {
      expect(isLocalFile("#")).toBe(false);
    });
  });

  describe("empty / whitespace", () => {
    it("rejects empty string", () => {
      expect(isLocalFile("")).toBe(false);
    });

    it("rejects whitespace-only string", () => {
      expect(isLocalFile("   ")).toBe(false);
    });

    it("rejects whitespace with dangerous scheme", () => {
      expect(isLocalFile("  javascript:alert(1)")).toBe(false);
    });
  });

  // ── Edge cases a chaos monkey would try ──

  describe("adversarial inputs", () => {
    it("rejects javascript with mixed case and whitespace", () => {
      expect(isLocalFile("  JaVaScRiPt:alert(1)")).toBe(false);
    });

    it("treats lone colon-containing filename correctly", () => {
      // A file literally named "note: draft.md" — the colon is preceded by "note"
      // which matches the scheme regex. This is a trade-off: we'd rather be safe
      // and treat it as a scheme than accidentally navigate to a weird path.
      // On macOS/Linux, colons in filenames are unusual anyway.
      expect(isLocalFile("note: draft.md")).toBe(false);
    });

    it("treats number-starting path as local (not a scheme)", () => {
      // Schemes must start with a letter, so "123:foo" is not a scheme
      expect(isLocalFile("123:foo.md")).toBe(true);
    });

    it("treats path starting with dash as local", () => {
      expect(isLocalFile("-weird-file.md")).toBe(true);
    });

    it("treats path with unicode as local", () => {
      expect(isLocalFile("日本語/ファイル.md")).toBe(true);
    });

    it("rejects data: URI with payload", () => {
      expect(isLocalFile("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    });
  });
});

// ─── resolveRelativePath ────────────────────────────────────────

describe("resolveRelativePath", () => {
  const base = "/Users/x/docs/welcome.md";

  // ── Basic resolution ──

  it("resolves simple sibling file", () => {
    expect(resolveRelativePath(base, "tutorial.md")).toBe(
      "/Users/x/docs/tutorial.md"
    );
  });

  it("resolves subdirectory file", () => {
    expect(resolveRelativePath(base, "sub/file.md")).toBe(
      "/Users/x/docs/sub/file.md"
    );
  });

  it("resolves parent traversal", () => {
    expect(resolveRelativePath(base, "../README.md")).toBe(
      "/Users/x/README.md"
    );
  });

  it("resolves multiple parent traversals", () => {
    expect(resolveRelativePath(base, "../../other/file.md")).toBe(
      "/Users/other/file.md"
    );
  });

  it("resolves mixed traversal", () => {
    expect(resolveRelativePath(base, "../images/../docs/pic.png")).toBe(
      "/Users/x/docs/pic.png"
    );
  });

  // ── Absolute paths ──

  it("returns absolute path as-is", () => {
    expect(resolveRelativePath(base, "/etc/hosts")).toBe("/etc/hosts");
  });

  it("returns absolute path ignoring base", () => {
    expect(resolveRelativePath(base, "/tmp/file.md")).toBe("/tmp/file.md");
  });

  // ── Query / fragment stripping ──

  it("strips query string", () => {
    expect(resolveRelativePath(base, "file.md?raw=true")).toBe(
      "/Users/x/docs/file.md"
    );
  });

  it("strips fragment", () => {
    expect(resolveRelativePath(base, "file.md#section-1")).toBe(
      "/Users/x/docs/file.md"
    );
  });

  it("strips both query and fragment", () => {
    expect(resolveRelativePath(base, "file.md?raw#top")).toBe(
      "/Users/x/docs/file.md"
    );
  });

  // ── Percent-encoding ──

  it("decodes percent-encoded spaces", () => {
    expect(resolveRelativePath(base, "my%20file.md")).toBe(
      "/Users/x/docs/my file.md"
    );
  });

  it("decodes percent-encoded special chars", () => {
    expect(resolveRelativePath(base, "caf%C3%A9.md")).toBe(
      "/Users/x/docs/café.md"
    );
  });

  it("handles malformed percent-encoding gracefully", () => {
    // %ZZ is not valid hex — decodeURIComponent would throw
    // Should fall back to using the raw string
    expect(resolveRelativePath(base, "file%ZZ.md")).toBe(
      "/Users/x/docs/file%ZZ.md"
    );
  });

  // ── Path traversal boundary ──

  it("clamps excessive .. at root", () => {
    // 10 levels of .. from /Users/x/docs/ — should not go below /
    expect(
      resolveRelativePath(base, "../../../../../../../../../../etc/passwd")
    ).toBe("/etc/passwd");
  });

  it(".. on empty resolved array stays at root", () => {
    expect(resolveRelativePath("/a.md", "../../b.md")).toBe("/b.md");
  });

  // ── Dot segments ──

  it("collapses single-dot segments", () => {
    expect(resolveRelativePath(base, "./tutorial.md")).toBe(
      "/Users/x/docs/tutorial.md"
    );
  });

  it("collapses mixed dot segments", () => {
    expect(resolveRelativePath(base, "./sub/../tutorial.md")).toBe(
      "/Users/x/docs/tutorial.md"
    );
  });

  // ── Trailing slashes / empty segments ──

  it("handles trailing slash in href", () => {
    expect(resolveRelativePath(base, "subdir/")).toBe("/Users/x/docs/subdir");
  });

  it("handles double slashes in href", () => {
    expect(resolveRelativePath(base, "sub//file.md")).toBe(
      "/Users/x/docs/sub/file.md"
    );
  });

  // ── Edge: empty href ──

  it("returns base path for empty href", () => {
    expect(resolveRelativePath(base, "")).toBe(base);
  });

  it("returns base path for fragment-only href (after stripping)", () => {
    // "#section" → cleanHref is "" after split on #
    expect(resolveRelativePath(base, "#section")).toBe(base);
  });

  it("returns base path for query-only href (after stripping)", () => {
    expect(resolveRelativePath(base, "?foo=bar")).toBe(base);
  });

  // ── Different base paths ──

  it("works with root-level base", () => {
    expect(resolveRelativePath("/file.md", "other.md")).toBe("/other.md");
  });

  it("works with deeply nested base", () => {
    expect(
      resolveRelativePath("/a/b/c/d/e/f.md", "../../g.md")
    ).toBe("/a/b/c/g.md");
  });

  // ── Spaces in paths ──

  it("handles spaces in base path", () => {
    expect(
      resolveRelativePath("/Users/x/My Documents/file.md", "other.md")
    ).toBe("/Users/x/My Documents/other.md");
  });
});

// ─── DANGEROUS_SCHEMES regex ────────────────────────────────────

describe("DANGEROUS_SCHEMES", () => {
  it("matches javascript:", () => {
    expect(DANGEROUS_SCHEMES.test("javascript:void(0)")).toBe(true);
  });

  it("matches data:", () => {
    expect(DANGEROUS_SCHEMES.test("data:text/html,<h1>x</h1>")).toBe(true);
  });

  it("matches vbscript:", () => {
    expect(DANGEROUS_SCHEMES.test("vbscript:MsgBox")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(DANGEROUS_SCHEMES.test("JavaScript:alert(1)")).toBe(true);
    expect(DANGEROUS_SCHEMES.test("DATA:text/html,x")).toBe(true);
  });

  it("does not match http:", () => {
    expect(DANGEROUS_SCHEMES.test("http://example.com")).toBe(false);
  });

  it("does not match plain text", () => {
    expect(DANGEROUS_SCHEMES.test("tutorial.md")).toBe(false);
  });
});

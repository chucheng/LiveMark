import { describe, it, expect } from "vitest";
import { generateHTML, type TemplateSettings } from "../../../export/html-template";

describe("generateHTML with template settings", () => {
  it("generates basic HTML without template", () => {
    const html = generateHTML("# Hello", "Test");
    expect(html).toContain("<title>Test</title>");
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("injects font family override", () => {
    const template: TemplateSettings = { fontFamily: "serif" };
    const html = generateHTML("Hello", "Test", template);
    expect(html).toContain("--lm-font-body:");
    expect(html).toContain("Georgia");
  });

  it("injects font size override", () => {
    const template: TemplateSettings = { fontSize: 18 };
    const html = generateHTML("Hello", "Test", template);
    expect(html).toContain("--lm-font-size: 18px");
  });

  it("injects line height override", () => {
    const template: TemplateSettings = { lineHeight: 2.0 };
    const html = generateHTML("Hello", "Test", template);
    expect(html).toContain("--lm-line-height: 2");
  });

  it("injects content width override", () => {
    const template: TemplateSettings = { contentWidth: 960 };
    const html = generateHTML("Hello", "Test", template);
    expect(html).toContain("--lm-content-width: 960px");
  });

  it("injects paragraph spacing override", () => {
    const template: TemplateSettings = { paragraphSpacing: "1.2em" };
    const html = generateHTML("Hello", "Test", template);
    expect(html).toContain("--lm-paragraph-spacing: 1.2em");
  });

  it("injects multiple overrides", () => {
    const template: TemplateSettings = {
      fontSize: 14,
      lineHeight: 1.5,
      contentWidth: 800,
      paragraphSpacing: "0.5em",
    };
    const html = generateHTML("Hello", "Test", template);
    expect(html).toContain("--lm-font-size: 14px");
    expect(html).toContain("--lm-line-height: 1.5");
    expect(html).toContain("--lm-content-width: 800px");
    expect(html).toContain("--lm-paragraph-spacing: 0.5em");
  });

  it("does not inject overrides when template is undefined", () => {
    const html = generateHTML("Hello", "Test");
    // Should not contain a :root override block (the base CSS has :root but not a second one)
    const rootMatches = html.match(/:root\s*\{/g);
    // Base export CSS has one :root block
    expect(rootMatches?.length).toBe(1);
  });

  it("escapes HTML in title", () => {
    const html = generateHTML("Hello", '<script>alert("xss")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("handles system font family", () => {
    const template: TemplateSettings = { fontFamily: "system" };
    const html = generateHTML("Hello", "Test", template);
    expect(html).toContain("Inter");
  });

  it("handles mono font family", () => {
    const template: TemplateSettings = { fontFamily: "mono" };
    const html = generateHTML("Hello", "Test", template);
    expect(html).toContain("JetBrains Mono");
  });
});

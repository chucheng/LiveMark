import { describe, it, expect, vi } from "vitest";

vi.mock("../../../state/theme", () => ({
  themeState: {
    theme: () => "system",
    setTheme: vi.fn(),
    cycleTheme: vi.fn(),
  },
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("../../../state/filetree", () => ({
  fileTreeState: {
    sidebarVisible: () => true,
    setSidebarVisible: vi.fn(),
    toggleSidebar: vi.fn(),
  },
}));

const { BUILT_IN_PRESETS } = await import("../../../state/preferences");

describe("Built-in presets", () => {
  it("has 3 built-in presets", () => {
    expect(BUILT_IN_PRESETS).toHaveLength(3);
  });

  it("Default preset has expected values", () => {
    const def = BUILT_IN_PRESETS.find((p) => p.name === "Default")!;
    expect(def).toBeDefined();
    expect(def.fontSize).toBe(16);
    expect(def.lineHeight).toBe(1.7);
    expect(def.contentWidth).toBe(720);
    expect(def.fontFamily).toBe("system");
    expect(def.paragraphSpacing).toBe("0.8em");
  });

  it("Compact preset has smaller values", () => {
    const compact = BUILT_IN_PRESETS.find((p) => p.name === "Compact")!;
    expect(compact).toBeDefined();
    expect(compact.fontSize).toBe(14);
    expect(compact.lineHeight).toBe(1.5);
    expect(compact.contentWidth).toBe(800);
  });

  it("Wide preset has larger content width", () => {
    const wide = BUILT_IN_PRESETS.find((p) => p.name === "Wide")!;
    expect(wide).toBeDefined();
    expect(wide.contentWidth).toBe(960);
    expect(wide.fontFamily).toBe("serif");
  });

  it("all presets have required fields", () => {
    for (const preset of BUILT_IN_PRESETS) {
      expect(preset.name).toBeTruthy();
      expect(preset.fontSize).toBeGreaterThan(0);
      expect(preset.lineHeight).toBeGreaterThan(0);
      expect(preset.contentWidth).toBeGreaterThan(0);
      expect(preset.fontFamily).toBeTruthy();
      expect(preset.paragraphSpacing).toBeTruthy();
    }
  });
});

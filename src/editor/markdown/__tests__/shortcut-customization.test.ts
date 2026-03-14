import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock modules that need browser APIs
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

// Mock filetree which may also need browser APIs
vi.mock("../../../state/filetree", () => ({
  fileTreeState: {
    sidebarVisible: () => true,
    setSidebarVisible: vi.fn(),
    toggleSidebar: vi.fn(),
  },
}));

const { normalizeShortcut, normalizeKeyEvent, detectConflict, isReservedShortcut } = await import("../../../state/shortcuts");
const { registerCommand, getCommands, applyCustomShortcuts } = await import("../../../commands/registry");

describe("normalizeShortcut", () => {
  it("normalizes basic shortcuts", () => {
    expect(normalizeShortcut("Cmd+S")).toBe("Cmd+S");
    expect(normalizeShortcut("cmd+s")).toBe("Cmd+S");
    expect(normalizeShortcut("Meta+s")).toBe("Cmd+S");
  });

  it("sorts modifiers in canonical order", () => {
    expect(normalizeShortcut("Shift+Cmd+P")).toBe("Cmd+Shift+P");
    expect(normalizeShortcut("Alt+Shift+Cmd+X")).toBe("Cmd+Shift+Alt+X");
  });

  it("handles chord shortcuts", () => {
    expect(normalizeShortcut("Cmd+J P")).toBe("Cmd+J P");
    expect(normalizeShortcut("cmd+j p")).toBe("Cmd+J P");
  });
});

describe("normalizeKeyEvent", () => {
  function makeEvent(opts: Partial<KeyboardEvent>): KeyboardEvent {
    return {
      key: "a",
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      ...opts,
    } as KeyboardEvent;
  }

  it("converts a simple Cmd+key event", () => {
    expect(normalizeKeyEvent(makeEvent({ key: "s", metaKey: true }))).toBe("Cmd+S");
  });

  it("converts Cmd+Shift+key event", () => {
    expect(normalizeKeyEvent(makeEvent({ key: "P", metaKey: true, shiftKey: true }))).toBe("Cmd+Shift+P");
  });

  it("returns empty string for bare modifier press", () => {
    expect(normalizeKeyEvent(makeEvent({ key: "Meta", metaKey: true }))).toBe("");
    expect(normalizeKeyEvent(makeEvent({ key: "Shift", shiftKey: true }))).toBe("");
  });

  it("handles special keys", () => {
    expect(normalizeKeyEvent(makeEvent({ key: " ", metaKey: true }))).toBe("Cmd+Space");
  });
});

describe("isReservedShortcut", () => {
  it("detects OS reserved shortcuts", () => {
    expect(isReservedShortcut("Cmd+Q")).toBe(true);
    expect(isReservedShortcut("Cmd+H")).toBe(true);
    expect(isReservedShortcut("Cmd+Tab")).toBe(true);
  });

  it("returns false for non-reserved shortcuts", () => {
    expect(isReservedShortcut("Cmd+S")).toBe(false);
    expect(isReservedShortcut("Cmd+Shift+P")).toBe(false);
  });
});

describe("detectConflict", () => {
  beforeEach(() => {
    registerCommand({ id: "test.save", label: "Save", shortcut: "Cmd+S", category: "File", execute: () => {} });
    registerCommand({ id: "test.open", label: "Open", shortcut: "Cmd+O", category: "File", execute: () => {} });
  });

  it("detects conflict with existing command", () => {
    const conflict = detectConflict("Cmd+S", "test.other");
    expect(conflict.conflictWith).toBeDefined();
    expect(conflict.conflictWith?.id).toBe("test.save");
  });

  it("excludes the specified command from conflict check", () => {
    const conflict = detectConflict("Cmd+S", "test.save");
    expect(conflict.conflictWith).toBeUndefined();
  });

  it("detects reserved shortcuts", () => {
    const conflict = detectConflict("Cmd+Q");
    expect(conflict.isReserved).toBe(true);
  });

  it("returns empty for non-conflicting shortcuts", () => {
    const conflict = detectConflict("Cmd+Shift+X");
    expect(conflict.conflictWith).toBeUndefined();
    expect(conflict.isReserved).toBeUndefined();
  });
});

describe("applyCustomShortcuts", () => {
  beforeEach(() => {
    registerCommand({ id: "test.cmd1", label: "Cmd1", shortcut: "Cmd+A", category: "Edit", execute: () => {} });
    registerCommand({ id: "test.cmd2", label: "Cmd2", shortcut: "Cmd+B", category: "Edit", execute: () => {} });
  });

  it("overrides command shortcuts from the custom map", () => {
    applyCustomShortcuts({ "test.cmd1": "Cmd+X" });
    const cmd = getCommands().find((c) => c.id === "test.cmd1");
    expect(cmd?.shortcut).toBe("Cmd+X");
  });

  it("restores default shortcuts for unmapped commands", () => {
    applyCustomShortcuts({ "test.cmd1": "Cmd+X" });
    applyCustomShortcuts({});
    const cmd = getCommands().find((c) => c.id === "test.cmd1");
    expect(cmd?.shortcut).toBe("Cmd+A");
  });
});

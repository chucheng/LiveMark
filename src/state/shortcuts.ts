import { getCommands, type Command } from "../commands/registry";
import { preferencesState } from "./preferences";

/** Known OS-reserved shortcuts that should trigger warnings */
const RESERVED_SHORTCUTS = new Set([
  "Cmd+Q", "Cmd+H", "Cmd+M", "Cmd+Tab",
  "Cmd+Space", "Cmd+Shift+3", "Cmd+Shift+4",
  "Ctrl+Alt+Delete",
]);

/**
 * Normalize a shortcut string to a canonical form.
 * e.g. "Cmd+Shift+P" stays as-is; handles inconsistent casing.
 */
export function normalizeShortcut(shortcut: string): string {
  // Handle chord shortcuts like "Cmd+J P"
  if (shortcut.includes(" ")) {
    const [prefix, key] = shortcut.split(" ");
    return normalizeShortcut(prefix) + " " + key.toUpperCase();
  }

  const parts = shortcut.split("+");
  const mods: string[] = [];
  let key = "";

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === "cmd" || lower === "meta" || lower === "⌘") {
      mods.push("Cmd");
    } else if (lower === "ctrl" || lower === "control") {
      mods.push("Ctrl");
    } else if (lower === "shift" || lower === "⇧") {
      mods.push("Shift");
    } else if (lower === "alt" || lower === "opt" || lower === "option" || lower === "⌥") {
      mods.push("Alt");
    } else {
      key = part.length === 1 ? part.toUpperCase() : part;
    }
  }

  // Canonical order: Cmd, Ctrl, Shift, Alt
  const order = ["Cmd", "Ctrl", "Shift", "Alt"];
  mods.sort((a, b) => order.indexOf(a) - order.indexOf(b));

  return [...mods, key].join("+");
}

/**
 * Convert a KeyboardEvent to a normalized shortcut string.
 */
export function normalizeKeyEvent(e: KeyboardEvent): string {
  const mods: string[] = [];
  if (e.metaKey) mods.push("Cmd");
  if (e.ctrlKey) mods.push("Ctrl");
  if (e.shiftKey) mods.push("Shift");
  if (e.altKey) mods.push("Alt");

  let key = e.key;
  // Normalize common key names
  if (key === " ") key = "Space";
  else if (key === "\\") key = "\\";
  else if (key.length === 1) key = key.toUpperCase();

  // Ignore bare modifier presses
  if (["Meta", "Control", "Shift", "Alt"].includes(key)) return "";

  return [...mods, key].join("+");
}

export interface ConflictInfo {
  conflictWith?: Command;
  isReserved?: boolean;
}

/**
 * Check if a shortcut conflicts with an existing command.
 */
export function detectConflict(shortcut: string, excludeCmdId?: string): ConflictInfo {
  const normalized = normalizeShortcut(shortcut);

  if (RESERVED_SHORTCUTS.has(normalized)) {
    return { isReserved: true };
  }

  const commands = getCommands();
  const customs = preferencesState.customShortcuts();

  for (const cmd of commands) {
    if (cmd.id === excludeCmdId) continue;

    // Check if this command's effective shortcut matches
    const cmdShortcut = customs[cmd.id] || cmd.shortcut;
    if (cmdShortcut && normalizeShortcut(cmdShortcut) === normalized) {
      return { conflictWith: cmd };
    }
  }

  return {};
}

/**
 * Check if a shortcut is a known OS-reserved shortcut.
 */
export function isReservedShortcut(shortcut: string): boolean {
  return RESERVED_SHORTCUTS.has(normalizeShortcut(shortcut));
}

/**
 * Set a custom shortcut for a command.
 * Returns conflict info if there is a conflict.
 */
export function setShortcut(cmdId: string, shortcut: string): ConflictInfo {
  const conflict = detectConflict(shortcut, cmdId);
  const customs = { ...preferencesState.customShortcuts() };
  customs[cmdId] = shortcut;
  preferencesState.setCustomShortcuts(customs);
  return conflict;
}

/**
 * Reset a command's shortcut to its default.
 */
export function resetShortcut(cmdId: string) {
  const customs = { ...preferencesState.customShortcuts() };
  delete customs[cmdId];
  preferencesState.setCustomShortcuts(customs);
}

/**
 * Get the effective shortcut for a command (custom or default).
 */
export function getEffectiveShortcut(cmd: Command): string | undefined {
  const customs = preferencesState.customShortcuts();
  return customs[cmd.id] || cmd.shortcut;
}

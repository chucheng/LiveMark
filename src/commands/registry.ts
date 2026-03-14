export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  defaultShortcut?: string;
  category: "File" | "Edit" | "View" | "Export";
  execute: () => void | Promise<void>;
}

const commands: Command[] = [];

export function registerCommand(cmd: Command) {
  // Preserve original shortcut as defaultShortcut
  if (cmd.shortcut && !cmd.defaultShortcut) {
    cmd.defaultShortcut = cmd.shortcut;
  }
  const existing = commands.findIndex((c) => c.id === cmd.id);
  if (existing >= 0) {
    commands[existing] = cmd;
  } else {
    commands.push(cmd);
  }
}

export function getCommands(): Command[] {
  return commands;
}

export function getCommandById(id: string): Command | undefined {
  return commands.find((c) => c.id === id);
}

export function searchCommands(query: string): Command[] {
  if (!query.trim()) return commands;
  const q = query.toLowerCase();
  return commands
    .map((cmd) => {
      const label = cmd.label.toLowerCase();
      const idx = label.indexOf(q);
      if (idx < 0) return null;
      // Score: prefer start-of-word matches
      const score = idx === 0 ? 100 : 50 - idx;
      return { cmd, score };
    })
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score)
    .map((r) => r!.cmd);
}

/**
 * Apply custom shortcut overrides from preferences.
 * Restores defaults first, then applies the custom map.
 */
export function applyCustomShortcuts(map: Record<string, string>) {
  for (const cmd of commands) {
    if (map[cmd.id]) {
      cmd.shortcut = map[cmd.id];
    } else if (cmd.defaultShortcut) {
      cmd.shortcut = cmd.defaultShortcut;
    }
  }
}

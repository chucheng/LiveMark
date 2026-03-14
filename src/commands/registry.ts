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
    const prev = commands[existing];
    // Protect custom shortcuts: if the existing command has a custom shortcut
    // (different from its defaultShortcut), preserve it during re-registration
    if (prev.defaultShortcut && prev.shortcut !== prev.defaultShortcut) {
      cmd.shortcut = prev.shortcut;
    }
    // Preserve defaultShortcut if already set and not provided in the new command
    if (prev.defaultShortcut && !cmd.defaultShortcut) {
      cmd.defaultShortcut = prev.defaultShortcut;
    }
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
      // Score: prefer start-of-string matches, then start-of-word matches
      let score = 50 - idx;
      if (idx === 0) {
        score = 100;
      } else if (label[idx - 1] === " " || label[idx - 1] === "-" || label[idx - 1] === "/") {
        // Bonus for start-of-word matches (preceded by space or separator)
        score += 30;
      }
      return { cmd, score };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const scoreDiff = b!.score - a!.score;
      if (scoreDiff !== 0) return scoreDiff;
      // Tiebreaker: shorter labels rank higher
      return a!.cmd.label.length - b!.cmd.label.length;
    })
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

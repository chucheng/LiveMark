export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  category: "File" | "Edit" | "View" | "Export";
  execute: () => void | Promise<void>;
}

const commands: Command[] = [];

export function registerCommand(cmd: Command) {
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

# Contributing to LiveMark

Thanks for your interest in contributing! LiveMark is an open-source Markdown editor and we welcome contributions of all kinds.

## Getting Started

```bash
git clone https://github.com/chucheng/LiveMark.git
cd LiveMark
pnpm install
pnpm tauri dev
```

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- Tauri system dependencies — see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

## How to Contribute

### Reporting Bugs

Open an [issue](https://github.com/chucheng/LiveMark/issues) with:
- Steps to reproduce
- Expected vs actual behavior
- OS and LiveMark version
- Screenshots if applicable

### Suggesting Features

Open an issue with the **feature request** label. Describe the use case and why it would be valuable.

### Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run tests: `pnpm test`
4. Run the app and verify manually: `pnpm tauri dev`
5. Open a PR with a clear description of what and why

### What Makes a Good PR

- **Small and focused** — one feature or fix per PR
- **Tests included** — if you're adding behavior, add tests
- **Follows existing patterns** — look at similar code in the codebase

## Project Structure

- `src/editor/` — ProseMirror editor core (schema, plugins, nodeviews)
- `src/ui/` — SolidJS UI components
- `src/state/` — Reactive state (SolidJS signals)
- `src/commands/` — Command registry and handlers
- `src-tauri/` — Rust backend (Tauri)
- `src/styles/` — CSS

## Running Tests

```bash
pnpm test          # Run all tests once
pnpm test:watch    # Run in watch mode
```

## Code Style

- TypeScript with strict mode
- SolidJS (not React) — use `createSignal`, `createEffect`, etc.
- ProseMirror conventions for editor code
- No external state library — SolidJS signals only

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0 License](LICENSE).

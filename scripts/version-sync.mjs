#!/usr/bin/env node

/**
 * Sync version across package.json, src-tauri/tauri.conf.json, and src-tauri/Cargo.toml.
 *
 * Usage:
 *   node scripts/version-sync.mjs [version]
 *
 * If no version is given, reads the current version from package.json and syncs it
 * to the other two files. If a version is given, sets all three files to that version.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const SEMVER_RE = /^\d+\.\d+\.\d+$/;

const FILES = {
  'package.json': {
    path: resolve(root, 'package.json'),
    read(content) {
      return JSON.parse(content).version;
    },
    write(content, version) {
      const json = JSON.parse(content);
      json.version = version;
      return JSON.stringify(json, null, 2) + '\n';
    },
  },
  'src-tauri/tauri.conf.json': {
    path: resolve(root, 'src-tauri/tauri.conf.json'),
    read(content) {
      return JSON.parse(content).version;
    },
    write(content, version) {
      const json = JSON.parse(content);
      json.version = version;
      return JSON.stringify(json, null, 2) + '\n';
    },
  },
  'src-tauri/Cargo.toml': {
    path: resolve(root, 'src-tauri/Cargo.toml'),
    read(content) {
      const match = content.match(/^version\s*=\s*"([^"]+)"/m);
      return match ? match[1] : null;
    },
    write(content, version) {
      return content.replace(
        /^(version\s*=\s*")([^"]+)(")/m,
        `$1${version}$3`
      );
    },
  },
};

function main() {
  const arg = process.argv[2];

  // Determine target version
  const pkgContent = readFileSync(FILES['package.json'].path, 'utf-8');
  const currentVersion = FILES['package.json'].read(pkgContent);

  const targetVersion = arg || currentVersion;

  if (!SEMVER_RE.test(targetVersion)) {
    console.error(`Error: "${targetVersion}" is not a valid semver version (expected X.Y.Z)`);
    process.exit(1);
  }

  if (arg) {
    console.log(`Setting version to ${targetVersion}`);
  } else {
    console.log(`Syncing version ${targetVersion} from package.json`);
  }

  let changed = 0;

  for (const [name, file] of Object.entries(FILES)) {
    const content = readFileSync(file.path, 'utf-8');
    const oldVersion = file.read(content);

    if (oldVersion === targetVersion) {
      console.log(`  ${name}: ${oldVersion} (already up to date)`);
      continue;
    }

    const newContent = file.write(content, targetVersion);
    writeFileSync(file.path, newContent, 'utf-8');
    console.log(`  ${name}: ${oldVersion} → ${targetVersion}`);
    changed++;
  }

  if (changed === 0) {
    console.log('\nAll files already at the target version.');
  } else {
    console.log(`\nUpdated ${changed} file${changed > 1 ? 's' : ''}.`);
  }
}

main();

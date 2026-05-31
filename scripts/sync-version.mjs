#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const sectionConfigs = {
  'apps/api': {
    extraFiles: [
      {
        file: 'src/app.ts',
        replacements: [/version:\s*'[^']*'/g],
      },
      {
        file: 'src/app.test.ts',
        replacements: [/version:\s*'[^']*'/g],
      },
    ],
  },
  'apps/desktop': {
    extraFiles: [
      {
        file: 'electron/main.ts',
        replacements: [/applicationVersion:\s*'[^']*'/g, /version:\s*'[^']*'/g],
      },
    ],
  },
  'packages/core': {},
  'packages/storage': {},
  'packages/platform-electron': {},
};

function readVersion(sectionRoot) {
  const versionFilePath = path.join(repoRoot, sectionRoot, 'version');
  if (!fs.existsSync(versionFilePath)) {
    throw new Error(`Missing version file: ${path.relative(repoRoot, versionFilePath)}`);
  }

  const version = fs.readFileSync(versionFilePath, 'utf-8').trim();
  if (!version) {
    throw new Error(`Version file is empty: ${path.relative(repoRoot, versionFilePath)}`);
  }

  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid version "${version}" in ${path.relative(repoRoot, versionFilePath)}`);
  }

  return version;
}

function writeJsonIfChanged(filePath, value) {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
  if (current !== next) {
    fs.writeFileSync(filePath, next);
    return true;
  }

  return false;
}

function updateFileVersions(filePath, version, replacements) {
  if (!fs.existsSync(filePath)) return false;

  const original = fs.readFileSync(filePath, 'utf-8');
  let next = original;

  for (const replacement of replacements) {
    next = next.replace(replacement, (match) => {
      const prefix = match.replace(/'[^']*'$/, '');
      return `${prefix}'${version}'`;
    });
  }

  if (next !== original) {
    fs.writeFileSync(filePath, next);
    return true;
  }

  return false;
}

function syncSection(sectionRoot) {
  const packageJsonPath = path.join(repoRoot, sectionRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Missing package.json: ${path.relative(repoRoot, packageJsonPath)}`);
  }

  const version = readVersion(sectionRoot);
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const changes = [];

  if (packageJson.version !== version) {
    packageJson.version = version;
    writeJsonIfChanged(packageJsonPath, packageJson);
    changes.push(`package.json -> ${version}`);
  }

  const extraFiles = sectionConfigs[sectionRoot]?.extraFiles ?? [];
  for (const entry of extraFiles) {
    const filePath = path.join(repoRoot, sectionRoot, entry.file);
    if (updateFileVersions(filePath, version, entry.replacements)) {
      changes.push(`${path.posix.join(sectionRoot, entry.file)} -> ${version}`);
    }
  }

  if (changes.length === 0) {
    console.log(`✓ ${sectionRoot}: already synced to ${version}`);
  } else {
    console.log(`✓ ${sectionRoot}: ${changes.join(', ')}`);
  }
}

const args = new Set(process.argv.slice(2));
const cwdRelative = path.relative(repoRoot, process.cwd()).replace(/\\/g, '/');
const sectionRoots = Object.keys(sectionConfigs);

if (args.has('--all') || cwdRelative === '') {
  for (const sectionRoot of sectionRoots) {
    syncSection(sectionRoot);
  }
  process.exit(0);
}

if (sectionConfigs[cwdRelative]) {
  syncSection(cwdRelative);
  process.exit(0);
}

throw new Error(
  `Unsupported sync-version working directory: ${cwdRelative || '.'}. Run this from a package root or pass --all from the repo root.`,
);
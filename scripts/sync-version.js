#!/usr/bin/env node

/**
 * Script to sync version from version file to package.json
 * This ensures package.json always has the correct version from the source file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Read version from file
const versionFilePath = path.join(rootDir, 'version');
const version = fs.readFileSync(versionFilePath, 'utf-8').trim();

if (!version) {
  console.error('❌ Error: version file is empty');
  process.exit(1);
}

// Validate semantic versioning format (X.Y.Z)
const semverRegex = /^\d+\.\d+\.\d+$/;
if (!semverRegex.test(version)) {
  console.error(`❌ Error: Invalid version format "${version}". Expected format: X.Y.Z (e.g., 1.0.0)`);
  process.exit(1);
}

// Read package.json
const packageJsonPath = path.join(rootDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Update version if different
if (packageJson.version !== version) {
  packageJson.version = version;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✓ Updated package.json version to ${version}`);
} else {
  console.log(`✓ Version is already synced: ${version}`);
}

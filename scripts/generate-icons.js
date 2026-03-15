#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import png2icons from 'png2icons';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const buildDir = path.join(rootDir, 'build');

const sourcePng = path.join(buildDir, 'icon-source.png');
const budgetSourcePng = path.join(buildDir, 'budget-icon-source.png');
const skipIfMissing = process.argv.includes('--if-present');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function generateIconSet(inputBuffer, outputBaseName) {
  const outputPng = path.join(buildDir, `${outputBaseName}.png`);
  const outputIco = path.join(buildDir, `${outputBaseName}.ico`);
  const outputIcns = path.join(buildDir, `${outputBaseName}.icns`);

  const icnsBuffer = png2icons.createICNS(inputBuffer, png2icons.BICUBIC2, 0);
  if (!icnsBuffer) {
    fail(`Failed to generate ICNS file for ${outputBaseName}`);
  }

  const icoBuffer = png2icons.createICO(inputBuffer, png2icons.BICUBIC2, 0, false, true);
  if (!icoBuffer) {
    fail(`Failed to generate ICO file for ${outputBaseName}`);
  }

  fs.copyFileSync(
    outputBaseName === 'icon' ? sourcePng : budgetSourcePng,
    outputPng
  );
  fs.writeFileSync(outputIcns, icnsBuffer);
  fs.writeFileSync(outputIco, icoBuffer);

  console.log(`✓ Generated icon files for ${outputBaseName}:`);
  console.log(`  - ${path.relative(rootDir, outputPng)}`);
  console.log(`  - ${path.relative(rootDir, outputIcns)}`);
  console.log(`  - ${path.relative(rootDir, outputIco)}`);
}

if (!fs.existsSync(sourcePng)) {
  if (skipIfMissing) {
    console.log('ℹ️  Skipping icon generation: build/icon-source.png not found.');
    process.exit(0);
  }

  fail(
    [
      'Missing source icon: build/icon-source.png',
      'Add a square PNG (recommended 1024x1024) and run `npm run generate-icons` again.',
    ].join('\n')
  );
}

const inputBuffer = fs.readFileSync(sourcePng);

if (!inputBuffer || inputBuffer.length === 0) {
  fail('Source icon file is empty: build/icon-source.png');
}

fs.mkdirSync(buildDir, { recursive: true });

generateIconSet(inputBuffer, 'icon');

if (fs.existsSync(budgetSourcePng)) {
  const budgetInputBuffer = fs.readFileSync(budgetSourcePng);

  if (!budgetInputBuffer || budgetInputBuffer.length === 0) {
    fail('Source icon file is empty: build/budget-icon-source.png');
  }

  generateIconSet(budgetInputBuffer, 'budget-file-icon');
} else {
  // Fallback so file association always has a valid icon set.
  fs.copyFileSync(path.join(buildDir, 'icon.png'), path.join(buildDir, 'budget-file-icon.png'));
  fs.copyFileSync(path.join(buildDir, 'icon.icns'), path.join(buildDir, 'budget-file-icon.icns'));
  fs.copyFileSync(path.join(buildDir, 'icon.ico'), path.join(buildDir, 'budget-file-icon.ico'));

  console.log('ℹ️  build/budget-icon-source.png not found. Using app icon for .budget files.');
}

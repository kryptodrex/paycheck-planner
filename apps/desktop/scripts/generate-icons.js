#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import png2icons from 'png2icons';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const buildDir = path.join(rootDir, 'build');

const sourcePng = path.join(buildDir, 'icon-source.png');
const sourceWinPng = path.join(buildDir, 'icon-source-win.png');
const budgetSourcePng = path.join(buildDir, 'budget-icon-source.png');
const budgetSourceWinPng = path.join(buildDir, 'budget-icon-source-win.png');
const skipIfMissing = process.argv.includes('--if-present');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function getPngDimensions(buffer, label) {
  if (!buffer || buffer.length < 24) {
    fail(`Invalid PNG data for ${label}: file is too small.`);
  }

  // PNG signature (8 bytes)
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const hasValidSignature = signature.every((value, index) => buffer[index] === value);
  if (!hasValidSignature) {
    fail(`Invalid PNG data for ${label}: missing PNG signature.`);
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  if (!width || !height) {
    fail(`Invalid PNG dimensions for ${label}: width=${width}, height=${height}.`);
  }

  return { width, height };
}

function assertSquareIcon(buffer, label) {
  const { width, height } = getPngDimensions(buffer, label);
  if (width !== height) {
    fail(
      [
        `${label} must be a square PNG for reliable .ico/.icns output.`,
        `Found ${width}x${height}.`,
        'Please export a square image (recommended 1024x1024) and try again.',
      ].join(' ')
    );
  }

  if (width < 256) {
    fail(
      [
        `${label} is too small (${width}x${height}).`,
        'Use at least 256x256 (recommended 1024x1024) for crisp icon variants.',
      ].join(' ')
    );
  }

  return { width, height };
}

function readValidatedSquarePng(filePath, label) {
  const buffer = fs.readFileSync(filePath);

  if (!buffer || buffer.length === 0) {
    fail(`Source icon file is empty: ${label}`);
  }

  assertSquareIcon(buffer, label);
  return buffer;
}

function generateIconSet(inputBuffer, outputBaseName, options = {}) {
  const { icoInputBuffer = inputBuffer, sourceFilePath, icoSourceLabel } = options;
  const outputPng = path.join(buildDir, `${outputBaseName}.png`);
  const outputIco = path.join(buildDir, `${outputBaseName}.ico`);
  const outputIcns = path.join(buildDir, `${outputBaseName}.icns`);

  const icnsBuffer = png2icons.createICNS(inputBuffer, png2icons.BICUBIC2, 0);
  if (!icnsBuffer) {
    fail(`Failed to generate ICNS file for ${outputBaseName}`);
  }

  // Use BMP payloads for all ICO entries to maximize compatibility across
  // shell previews and older Windows icon decoders.
  const icoBuffer = png2icons.createICO(icoInputBuffer, png2icons.BICUBIC2, 0, false, false);
  if (!icoBuffer) {
    fail(`Failed to generate ICO file for ${outputBaseName}`);
  }

  fs.copyFileSync(sourceFilePath, outputPng);
  fs.writeFileSync(outputIcns, icnsBuffer);
  fs.writeFileSync(outputIco, icoBuffer);

  console.log(`✓ Generated icon files for ${outputBaseName}:`);
  if (icoSourceLabel) {
    console.log(`  - Windows ICO source: ${icoSourceLabel}`);
  }
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

const inputBuffer = readValidatedSquarePng(sourcePng, 'build/icon-source.png');
const inputWinBuffer = fs.existsSync(sourceWinPng)
  ? readValidatedSquarePng(sourceWinPng, 'build/icon-source-win.png')
  : inputBuffer;

fs.mkdirSync(buildDir, { recursive: true });

generateIconSet(inputBuffer, 'icon', {
  icoInputBuffer: inputWinBuffer,
  sourceFilePath: sourcePng,
  icoSourceLabel: fs.existsSync(sourceWinPng) ? 'build/icon-source-win.png' : 'build/icon-source.png',
});

if (fs.existsSync(budgetSourcePng)) {
  const budgetInputBuffer = readValidatedSquarePng(budgetSourcePng, 'build/budget-icon-source.png');
  const budgetWinInputBuffer = fs.existsSync(budgetSourceWinPng)
    ? readValidatedSquarePng(budgetSourceWinPng, 'build/budget-icon-source-win.png')
    : budgetInputBuffer;

  const { width, height } = getPngDimensions(budgetInputBuffer, 'build/budget-icon-source.png');

  if (width !== height) {
    console.warn(
      [
        '⚠️  build/budget-icon-source.png is not square',
        `(${width}x${height}).`,
        'Using app icon for .budget file associations to avoid corrupted icon output.',
      ].join(' ')
    );

    fs.copyFileSync(path.join(buildDir, 'icon.png'), path.join(buildDir, 'budget-file-icon.png'));
    fs.copyFileSync(path.join(buildDir, 'icon.icns'), path.join(buildDir, 'budget-file-icon.icns'));
    fs.copyFileSync(path.join(buildDir, 'icon.ico'), path.join(buildDir, 'budget-file-icon.ico'));
  } else {
    generateIconSet(budgetInputBuffer, 'budget-file-icon', {
      icoInputBuffer: budgetWinInputBuffer,
      sourceFilePath: budgetSourcePng,
      icoSourceLabel: fs.existsSync(budgetSourceWinPng)
        ? 'build/budget-icon-source-win.png'
        : 'build/budget-icon-source.png',
    });
  }
} else {
  // Fallback so file association always has a valid icon set.
  fs.copyFileSync(path.join(buildDir, 'icon.png'), path.join(buildDir, 'budget-file-icon.png'));
  fs.copyFileSync(path.join(buildDir, 'icon.icns'), path.join(buildDir, 'budget-file-icon.icns'));
  fs.copyFileSync(path.join(buildDir, 'icon.ico'), path.join(buildDir, 'budget-file-icon.ico'));

  console.log('ℹ️  build/budget-icon-source.png not found. Using app icon for .budget files.');
}

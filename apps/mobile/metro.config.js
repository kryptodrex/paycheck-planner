const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo so Metro resolves workspace packages
config.watchFolders = [monorepoRoot];

// Resolve packages in priority order: app-local first, then workspace root.
// disableHierarchicalLookup prevents Metro from walking up the directory tree
// past these entries — critical in pnpm monorepos to avoid loading a mismatched
// @expo/metro-runtime (or similar) from a stale parent node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;

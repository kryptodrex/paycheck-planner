const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo so Metro resolves workspace packages
config.watchFolders = [monorepoRoot];

// Resolve packages in priority order: app-local first, then workspace root.
// Do NOT set disableHierarchicalLookup — pnpm needs hierarchical resolution to
// locate packages inside its virtual store (node_modules/.pnpm/).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;

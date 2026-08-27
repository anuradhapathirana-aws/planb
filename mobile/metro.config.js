// Learn more: https://docs.expo.dev/guides/monorepos/
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '..', 'shared');

const config = getDefaultConfig(projectRoot);

/*
 * `shared/` lives outside this project and is never installed as a package — it
 * ships TypeScript source that each app compiles itself (root CLAUDE.md §2).
 * Metro only watches the project root by default, so without this the alias
 * resolves at type-check time and then fails at bundle time.
 */
config.watchFolders = [sharedRoot];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@shared': path.resolve(sharedRoot, 'src'),
};

/*
 * shared/ has no node_modules of its own, so when its files import a peer
 * dependency (zod, axios) Metro must be told to look here. Mirrors the explicit
 * `paths` entries in tsconfig.json.
 */
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });

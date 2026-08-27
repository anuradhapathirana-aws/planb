/*
 * Reanimated's plugin is NOT listed here on purpose — `babel-preset-expo`
 * configures it automatically as of SDK 57, and adding it manually applies it
 * twice. NativeWind is the only thing that needs wiring.
 */
module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      // jsxImportSource lets NativeWind add `className` to React Native's
      // built-in components without wrapping every one of them.
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};

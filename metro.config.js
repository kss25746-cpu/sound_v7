const { getDefaultConfig } = require('expo/metro-config');
const { getBundleModeMetroConfig } = require('react-native-worklets/bundleMode');

/** @type {import('expo/metro-config').MetroConfig} */
let config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
};

// B에서 따라온 에셋 확장자: Rive(.riv) 애니메이션 · FLAC 음원
config.resolver.assetExts.push("riv", "flac");

// Reanimated Android 메모리 우회: worklets Bundle Mode
config = getBundleModeMetroConfig(config);

module.exports = config;

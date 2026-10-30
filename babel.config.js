module.exports = function (api) {
  api.cache(true);

  /** @type {import('react-native-worklets/plugin').PluginOptions} */
  const workletsPluginOptions = {
    bundleMode: true,
    strictGlobal: true,
  };

  return {
    // Expo 기본 worklets 자동 추가를 끄고, bundleMode 옵션으로 수동 등록
    presets: [['babel-preset-expo', { worklets: false, reanimated: false }]],
    plugins: [['react-native-worklets/plugin', workletsPluginOptions]],
  };
};

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated 4 moved its worklet compiler into a separate
    // package; the plugin must always be listed last.
    plugins: ['react-native-worklets/plugin'],
  };
};

module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  presets: ['module:@react-native/babel-preset'],
  env: {
    production: {
      plugins: ['react-native-paper/babel'],
    },
  },
};

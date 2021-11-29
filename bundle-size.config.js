const path = require("path");

module.exports = {
  webpack: (config) => {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          keyborg: path.resolve(__dirname, "./lib/index.js"),
        },
      },
    };
  },
};

const path = require("path");

module.exports = {
    webpack: (config) => {
        return {
            ...config,
            resolve: {
                ...config.resolve,
                alias: {
                    tabster: path.resolve(__dirname, "./dist/index.js"),
                },
            },
        };
    },
};

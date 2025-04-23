const path = require("path");

module.exports = ({ config }) => {
    // Add TypeScript support
    config.module.rules.push({
        test: /\.(ts|tsx)$/,
        use: [
            {
                loader: require.resolve("babel-loader"),
                options: {
                    presets: [
                        ["@babel/preset-env", { targets: { node: "current" } }],
                        "@babel/preset-typescript",
                        "@babel/preset-react",
                    ],
                    plugins: [
                        ["@babel/plugin-proposal-decorators", { legacy: true }],
                        [
                            "@babel/plugin-proposal-class-properties",
                            { loose: true },
                        ],
                    ],
                },
            },
        ],
    });

    config.resolve.extensions.push(".ts", ".tsx");
    return config;
};

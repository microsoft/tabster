module.exports = (api) => {
    const isTest = api.env("test");

    // Currently babel is only used to transform tests
    if (!isTest) {
        return {};
    }

    return {
        presets: [
            "@babel/preset-react",
            "@babel/preset-typescript",
            ["@babel/preset-env", { targets: { node: "current" } }],
        ],
        plugins: [
            "@babel/plugin-proposal-class-properties",
            "@babel/plugin-proposal-optional-chaining",
            "@babel/plugin-transform-typescript",
            [
                "@babel/plugin-transform-react-jsx",
                { pragma: "BroTest.createElementString" },
            ],
        ],
    };
};

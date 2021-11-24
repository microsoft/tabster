module.exports = (api) => {
    const isTest = api.env("test");

    const preset = isTest
        ? ["@babel/preset-env", { targets: { node: "current" } }]
        : [
              "@babel/preset-env",
              {
                  modules: false,
                  loose: true,
                  forceAllTransforms: true,
              },
          ];

    return {
        presets: ["@babel/preset-typescript", preset],
        plugins: [
            [
                "@babel/plugin-transform-react-jsx",
                { pragma: "BroTest.createElementString" },
            ],
            "babel-plugin-annotate-pure-calls",
        ],
    };
};

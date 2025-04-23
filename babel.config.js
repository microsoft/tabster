module.exports = (api) => {
    const isTest = api.env("test");

    const presetEnv = isTest
        ? ["@babel/preset-env", { targets: { node: "current" } }]
        : [
              "@babel/preset-env",
              {
                  modules: false,
                  loose: true,
              },
          ];

    return {
        presets: ["@babel/preset-typescript", "@babel/preset-react", presetEnv],
        plugins: [
            ["@babel/plugin-transform-react-jsx"],
            "babel-plugin-annotate-pure-calls",
        ],
    };
};

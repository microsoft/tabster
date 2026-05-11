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
        presets: [
            // `allowDeclareFields` lets us write `declare field: T;` on
            // class members — TS-only typed declarations that don't emit a
            // class-field initializer at runtime. Used in src/* to drop the
            // `this.x = void 0` writes that the constructor immediately
            // overwrites.
            ["@babel/preset-typescript", { allowDeclareFields: true }],
            "@babel/preset-react",
            presetEnv,
        ],
        plugins: [["@babel/plugin-transform-react-jsx"]],
    };
};

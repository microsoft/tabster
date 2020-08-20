const replace = require('@rollup/plugin-replace');

module.exports = {
    // A workaround for babel-plugin-transform-async-to-promises used by tsdx
    // injecting helper code with `const` and producing invalid ES5 code.
    rollup(config, options) {
        config.plugins.push(replace({
          'const ': 'var '
        }));

        return config;
    },
};

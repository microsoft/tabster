const replace = require('@rollup/plugin-replace');

module.exports = {
    rollup(config, options) {
        config.plugins.push(replace({
          'const ': 'var '
        }));

        return config;
    },
};

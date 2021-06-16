const replace = require('@rollup/plugin-replace');
const typescript = require('rollup-plugin-typescript2');
const version = require('./package.json').version;

module.exports = {
    rollup(config, options) {
        // TSDX imports obsolete TypeScript. Overriding it here to the one in our package.json.
        for (let i = 0; i < config.plugins.length; i++) {
            const p = config.plugins[i];
            if (p && (p.name === 'rpt2')) {
                config.plugins[i] = typescript({
                    typescript: require('typescript')
                });
                break;
            }
        }

        // A workaround for babel-plugin-transform-async-to-promises used by tsdx
        // injecting helper code with `const` and producing invalid ES5 code.
        config.plugins.push(replace({
            'const ': 'var ',
            'LOCAL_VERSION': version,
        }));

        return config;
    },
};

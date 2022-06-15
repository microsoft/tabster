import { defineConfig } from "vite";
import replace from "@rollup/plugin-replace";

module.exports = defineConfig({
    build: {
        rollupOptions: {
            plugins: [
                replace({
                    preventAssignment: true,
                    __DEV__: `process.env.NODE_ENV === 'development'`,
                    __VERSION__: JSON.stringify("0.0.0"),
                }),
            ],
        },
    },
});

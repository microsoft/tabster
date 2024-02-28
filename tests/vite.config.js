import { defineConfig } from "vite";
import replace from "@rollup/plugin-replace";

module.exports = defineConfig({
    build: {
        minify: false,
        rollupOptions: {
            plugins: [
                replace({
                    preventAssignment: true,
                    __DEV__: "true",
                    __VERSION__: JSON.stringify("0.0.0"),
                }),
            ],
        },
    },
});

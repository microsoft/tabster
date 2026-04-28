import { defineConfig } from "vite";

export default defineConfig({
    build: {
        minify: false,
    },
    define: {
        __DEV__: "true",
        __VERSION__: JSON.stringify("0.0.0"),
    },
});

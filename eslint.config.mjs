// eslint.config.mjs
import eslintPluginImport from "eslint-plugin-import";
import eslintPluginHeader from "eslint-plugin-header";
import tseslint from "typescript-eslint";

eslintPluginHeader.rules.header.meta.schema = false;

export default [
    {
        files: ["**/*.ts", "**/*.tsx"],
        ignores: ["*.config.js", "dist", "node_modules"],
        languageOptions: {
            ecmaVersion: 2015,
            sourceType: "module",
            globals: {
                window: "readonly",
                document: "readonly",
            },
            parser: tseslint.parser,
            parserOptions: {
                project: [
                    "src/tsconfig.lib.json",
                    "tests/tsconfig.spec.json",
                    "stories/tsconfig.stories.json",
                    "tsconfig.json",
                ],
                sourceType: "module",
            },
        },
        plugins: {
            import: eslintPluginImport,
            header: eslintPluginHeader,
            "@typescript-eslint": tseslint.plugin,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            curly: "error",
            eqeqeq: ["error", "smart"],
            "guard-for-in": "error",
            "header/header": [
                "warn",
                "block",
                [
                    "!",
                    " * Copyright (c) Microsoft Corporation. All rights reserved.",
                    " * Licensed under the MIT License.",
                    " ",
                ],
                1,
            ],
            "id-denylist": "off",
            "id-match": "off",
            "import/order": "error",
            "no-bitwise": "off",
            "no-caller": "error",
            "no-console": [
                "error",
                {
                    allow: [
                        "log",
                        "warn",
                        "dir",
                        "timeLog",
                        "assert",
                        "clear",
                        "count",
                        "countReset",
                        "group",
                        "groupEnd",
                        "table",
                        "dirxml",
                        "error",
                        "groupCollapsed",
                        "Console",
                        "profile",
                        "profileEnd",
                        "timeStamp",
                        "context",
                    ],
                },
            ],
            "no-debugger": "error",
            "no-empty": "error",
            "no-empty-function": "error",
            "no-eval": "error",
            "no-fallthrough": "error",
            "no-new-wrappers": "error",
            "no-underscore-dangle": "off",
            "no-unused-expressions": "off",
            "no-unused-labels": "error",
            radix: "error",

            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-empty-function": "error",
            "@typescript-eslint/no-unused-vars": "error",
            "@typescript-eslint/no-empty-interface": "error",
            "@typescript-eslint/no-non-null-assertion": "error",
            "no-case-declarations": "error",
            "@typescript-eslint/no-unused-expressions": [
                "error",
                { allowTernary: true, allowShortCircuit: true },
            ],
        },
    },
];

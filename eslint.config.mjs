// eslint.config.mjs
import { fixupPluginRules } from "@eslint/compat";
import eslintPluginImport from "eslint-plugin-import-x";
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
            header: fixupPluginRules(eslintPluginHeader),
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
            "@typescript-eslint/consistent-type-imports": [
                "error",
                {
                    prefer: "type-imports",
                    fixStyle: "inline-type-imports",
                },
            ],
        },
    },
    {
        // Library source must go through the free-function helpers in
        // `Utils.ts` instead of calling the raw DOM event APIs directly —
        // helper names mangle to single chars after minification, native
        // property names like `addEventListener` are preserved verbatim.
        files: ["src/**/*.ts"],
        ignores: ["src/Utils.ts"],
        rules: {
            "no-restricted-syntax": [
                "error",
                {
                    selector:
                        "CallExpression[callee.property.name='addEventListener']",
                    message:
                        "Use `addListener` from './Utils.js' (saves bytes after minification).",
                },
                {
                    selector:
                        "CallExpression[callee.property.name='removeEventListener']",
                    message: "Use `removeListener` from './Utils.js'.",
                },
                {
                    selector:
                        "CallExpression[callee.property.name='dispatchEvent']",
                    message: "Use `dispatchEvent` from './Utils.js'.",
                },
            ],
        },
    },
];

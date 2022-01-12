// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: "Tabster",
    tagline: "Tabindex on steroids",
    url: "https://tabster.io",
    baseUrl: "/",
    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "warn",
    favicon: "img/favicon.ico",
    organizationName: "microsoft",
    projectName: "tabster",

    presets: [
        [
            "classic",
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                docs: {
                    sidebarPath: false,
                },
                blog: false,
                theme: {
                    customCss: require.resolve("./src/css/custom.css"),
                },
            }),
        ],
    ],

    themeConfig:
        /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
        ({
            navbar: {
                title: "Tabster",
                logo: {
                    alt: "Tabster Logo",
                    src: "img/logo.svg",
                },
                items: [
                    {
                        type: "doc",
                        docId: "core",
                        position: "left",
                        label: "Core",
                    },
                    {
                        type: "doc",
                        docId: "mover",
                        position: "left",
                        label: "Mover",
                    },
                    {
                        type: "doc",
                        docId: "groupper",
                        position: "left",
                        label: "Groupper",
                    },
                    {
                        type: "doc",
                        docId: "deloser",
                        position: "left",
                        label: "Deloser",
                    },
                    {
                        type: "doc",
                        docId: "modalizer",
                        position: "left",
                        label: "Modalizer",
                    },

                    {
                        href: "https://github.com/microsoft/tabster",
                        label: "GitHub",
                        position: "right",
                    },
                ],
            },
        }),
};

module.exports = config;

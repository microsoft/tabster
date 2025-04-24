// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: "Tabster",
    tagline: "Tabindex on steroids",
    url: "https://tabster.io",
    baseUrl: "/",
    onBrokenLinks: "throw",
    onBrokenMarkdownLinks: "warn",
    favicon: "img/favicon.png",
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
                    src: "img/favicon.png",
                },
                items: [
                    {
                        type: "doc",
                        docId: "concept",
                        position: "left",
                        label: "Concept",
                    },
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
                        type: "doc",
                        docId: "observed",
                        position: "left",
                        label: "Observed",
                    },
                    {
                        type: "doc",
                        docId: "outline",
                        position: "left",
                        label: "Outline",
                    },
                    {
                        type: "doc",
                        docId: "more",
                        position: "left",
                        label: "More",
                    },

                    {
                        href: "https://github.com/microsoft/tabster",
                        label: "GitHub",
                        position: "right",
                    },
                ],
            },
        }),

    themes: ["@docusaurus/theme-live-codeblock"],
};

module.exports = config;

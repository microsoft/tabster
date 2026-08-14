// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: "Tabster",
    tagline: "Tabindex on steroids",
    url: "https://tabster.io",
    baseUrl: "/",
    onBrokenLinks: "throw",
    markdown: {
        hooks: {
            onBrokenMarkdownLinks: "warn",
        },
    },
    favicon: "img/favicon.png",
    organizationName: "microsoft",
    projectName: "tabster",

    presets: [
        [
            "classic",
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                docs: {
                    sidebarPath: require.resolve("./sidebars.js"),
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
                        type: "docSidebar",
                        sidebarId: "docsSidebar",
                        position: "left",
                        label: "Docs",
                    },
                    {
                        type: "doc",
                        docId: "api-reference",
                        position: "left",
                        label: "API Reference",
                    },
                    {
                        href: "https://tabster.io/storybook/",
                        label: "Storybook",
                        position: "left",
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

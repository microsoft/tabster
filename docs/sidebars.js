// @ts-check

/**
 * Manual sidebar so the docs read in a deliberate learning order:
 * orientation, then core mechanics, then opt-in features, then reference
 * material for people who already know what they're looking for.
 *
 * @type {import('@docusaurus/plugin-content-docs').SidebarsConfig}
 */
const sidebars = {
    docsSidebar: [
        {
            type: "category",
            label: "Introduction",
            collapsed: false,
            items: ["intro", "concept", "browser-support"],
        },
        {
            type: "category",
            label: "Core",
            collapsed: false,
            items: ["core", "attribute-helpers", "uncontrolled", "shadow-dom"],
        },
        {
            type: "category",
            label: "Features",
            collapsed: false,
            items: [
                "mover",
                "groupper",
                "deloser",
                "modalizer",
                "observed",
                "restorer",
                "outline",
                "cross-origin",
            ],
        },
        {
            type: "category",
            label: "Reference",
            collapsed: false,
            items: ["events", "api-reference"],
        },
    ],
};

module.exports = sidebars;

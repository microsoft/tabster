import * as React from "react";
import {
    createTabster,
    disposeTabster,
    getCurrentTabster,
    getDeloser,
    getModalizer,
} from "tabster";

import "./styles.css";

export const parameters = {
    actions: { argTypesRegex: "^on[A-Z].*" },
    previewTabs: {
        "storybook/docs/panel": {
            hidden: true,
        },
    },
    options: {
        storySort: {
            order: [
                "Home",
                "GettingStarted",
                "API",
                ["createTabster", "getCurrentTabster", "getTabsterAttribute"],
            ],
        },
    },
};

export const decorators = [
    (Story) => {
        // ensures Tabster is only created once
        React.useState(() => {
            const tabster = createTabster(window, { autoRoot: {} });

            // initialize Tabster API instances
            getModalizer(tabster);
            getDeloser(tabster);
            // getOutline(tabster).setup();
        });
        React.useEffect(() => {
            return () => {
                if (getCurrentTabster(window)) {
                    disposeTabster(getCurrentTabster(window));
                }
            };
        }, []);

        return <Story />;
    },
];

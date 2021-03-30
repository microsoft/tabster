import * as React from "react";
import {
    createTabster,
    disposeTabster,
    getTabsterAttribute,
    getCurrentTabster,
    getDeloser,
    getModalizer,
} from "tabster";

export const parameters = {
    actions: { argTypesRegex: "^on[A-Z].*" },
};

export const decorators = [
    (Story) => {
        // ensures Tabster is only created once
        React.useState(() => {
            const tabster = createTabster(window)

            // initialize Tabster API instances
            getModalizer(tabster);
            getDeloser(tabster);
        });
        React.useEffect(() => {
            return () => {
                if (getCurrentTabster(window)) {
                    disposeTabster(getCurrentTabster(window));
                }
            };
        }, []);

        return (
            <div {...getTabsterAttribute({ root: {} })}>
                <Story />
            </div>
        );
    },
];

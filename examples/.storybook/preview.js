import * as React from "react";
import {
    createAbilityHelpers,
    disposeAbilityHelpers,
    getAbilityHelpersAttribute,
    getCurrentAbilityHelpers,
} from "ability-helpers";

export const parameters = {
    actions: { argTypesRegex: "^on[A-Z].*" },
};

export const decorators = [
    (Story) => {
        // ensures AH is only created once
        React.useState(() => createAbilityHelpers(window));
        React.useEffect(() => {
            return () => {
                if (getCurrentAbilityHelpers(window)) {
                    disposeAbilityHelpers(getCurrentAbilityHelpers(window));
                }
            };
        }, []);

        return (
            <div {...getAbilityHelpersAttribute({ root: {} })}>
                <Story />
            </div>
        );
    },
];

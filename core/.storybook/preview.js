import {
    createTabster,
    getCurrentTabster,
    getGroupper,
    getModalizer,
    getMover,
} from "../src";

export const parameters = {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
        matchers: {
            color: /(background|color)$/i,
            date: /Date$/,
        },
    },
};

export const decorators = [
    (Story) => {
        if (!getCurrentTabster(window)) {
            const tabster = createTabster(window, { autoRoot: {} });
            getMover(tabster);
            getModalizer(tabster);
            getGroupper(tabster);
        }

        return Story();
    },
];

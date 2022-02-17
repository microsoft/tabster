import {
    createTabster,
    getCurrentTabster,
    getDeloser,
    getGroupper,
    getModalizer,
    getMover,
    getObservedElement,
    getOutline,
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
            const controlTab = !process.env.STORYBOOK_UNCONTROLLED;
            const rootDummyInputs = process.env.STORYBOOK_ROOT_DUMMY_INPUTS;
            const tabster = createTabster(window, {
                autoRoot: {},
                controlTab,
                rootDummyInputs,
            });
            console.log(
                "created tabster",
                `as ${
                    controlTab ? "controlled" : "uncontrolled"
                }, root dummy inputs ${rootDummyInputs}`
            );
            getModalizer(tabster);
            console.log("created modalizer");
            getDeloser(tabster);
            console.log("created deloser");
            getOutline(tabster);
            console.log("created outline");
            getMover(tabster);
            console.log("created mover");
            getGroupper(tabster);
            console.log("created groupper");
            getObservedElement(tabster);
            console.log("created observed");
        }

        return Story();
    },
];

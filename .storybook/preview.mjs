import {
    createTabster,
    disposeTabster,
    getDeloser,
    getGroupper,
    getModalizer,
    getMover,
    getObservedElement,
    getOutline,
    getCrossOrigin,
    getRestorer,
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
        const env =
            typeof import.meta !== "undefined" && import.meta.env
                ? import.meta.env
                : {};

        const controlTab = !env.STORYBOOK_UNCONTROLLED;
        const rootDummyInputs = env.STORYBOOK_ROOT_DUMMY_INPUTS === "true";

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
        const crossOrigin = getCrossOrigin(tabster);
        crossOrigin.setup();
        console.log("created cross origin");
        getRestorer(tabster);
        console.log("created restorer");

        window.createTabster = createTabster;
        window.disposeTabster = disposeTabster;

        return Story();
    },
];

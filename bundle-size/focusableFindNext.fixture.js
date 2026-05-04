import {
    createTabster,
    disposeTabster,
    getTabsterAttribute,
    setTabsterAttribute,
    Types,
} from "tabster";

/** @param {ReturnType<typeof createTabster>} tabster */
const useFocusable = (tabster) => tabster.focusable.findNext;

console.log(
    createTabster,
    disposeTabster,
    getTabsterAttribute,
    setTabsterAttribute,
    useFocusable,
    Types
);

export default {
    name: "focusable.findNext",
};

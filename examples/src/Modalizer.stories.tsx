import * as React from "react";
import { Meta } from "@storybook/react";
import {
    getTabsterAttribute,
    getCurrentTabster,
    getDeloser,
    getModalizer,
} from "tabster";
import { Modal } from "./components/Modal";

// eslint-disable-next-line import/no-anonymous-default-export
export default {
    title: "Modalizer",
} as Meta;

export const ModalDialog = () => {
    const ref = React.useRef<Modal>(null);

    const onClick = () => ref.current?.show();
    return (
        <>
            <div
                aria-label="Main"
                {...getTabsterAttribute({
                    modalizer: { id: "main" },
                    deloser: {},
                })}
            >
                <button onClick={onClick}>Open modal</button>
            </div>
            <Modal ref={ref} />
        </>
    );
};

export const PopupContent = () => {
    const [open, setOpen] = React.useState<boolean>(false);
    const modalizerRef = React.useCallback((node) => {
        const tabster = getCurrentTabster(window);
        if (tabster && node !== null) {
            const modalizer = getModalizer(tabster);
            const deloser = getDeloser(tabster);
            modalizer.add(node, { id: "popup" });
            deloser.add(node);
            modalizer.focus(node);
        }
    }, []);

    const onClick = () => setOpen((s) => !s);

    const popupStyles = {
        maxWidth: 400,
        maxHeight: 400,
        border: "1px solid",
        padding: 5,
    };

    return (
        <>
            <div
                aria-label="Main"
                {...getTabsterAttribute({
                    modalizer: { id: "main" },
                    deloser: {},
                })}
            >
                <button onClick={onClick}>Toggle popup</button>
            </div>
            <div>
                {open && (
                    <div ref={modalizerRef} style={popupStyles}>
                        <div tabIndex={0}>Focusable item</div>
                        <div tabIndex={0}>Focusable item</div>
                        <div tabIndex={0}>Focusable item</div>
                        <div tabIndex={0}>Focusable item</div>
                        <button onClick={onClick}>Dismiss</button>
                    </div>
                )}
            </div>
            <div
                aria-label="Main"
                {...getTabsterAttribute({
                    modalizer: { id: "main" },
                    deloser: {},
                })}
            >
                <button>Do not focus</button>
            </div>
        </>
    );
};

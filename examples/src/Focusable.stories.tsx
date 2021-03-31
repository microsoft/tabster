import * as React from "react";
import { getCurrentTabster, getTabsterAttribute } from "tabster";

// eslint-disable-next-line import/no-anonymous-default-export
export default {
    title: "Focusable",
};

export const IgnoreAriaDisabled = () => {
    const ref = React.useRef<HTMLButtonElement>(null);
    const tabster = getCurrentTabster(window);
    const onClick = () => {
        console.log(
            tabster?.focusable.findNext(ref.current as HTMLButtonElement)
        );
        tabster?.focusable
            .findNext(ref.current as HTMLButtonElement, undefined, true)
            ?.focus();
    };
    return (
        <div>
            <button onClick={onClick} ref={ref}>
                Focus aria disabled element
            </button>
            <div
                aria-disabled={true}
                tabIndex={-1}
                {...getTabsterAttribute({
                    focusable: { ignoreAriaDisabled: true },
                })}
            >
                aria-disabled element
            </div>
        </div>
    );
};

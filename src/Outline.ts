/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement } from "./Instance.js";
import type * as Types from "./Types.js";
import {
    addListener,
    clearTimer,
    createTimer,
    getBoundingRect,
    removeListener,
    setTimer,
} from "./Utils.js";

interface WindowWithOutlineStyle extends Window {
    __tabsterOutline?: {
        style?: HTMLStyleElement;
        elements?: Types.OutlineElements;
    };
}

const defaultProps: Types.OutlineProps = {
    areaClass: "tabster-focus-outline-area",
    outlineClass: "tabster-focus-outline",
    outlineColor: "#ff4500",
    outlineWidth: 2,
    zIndex: 2147483647,
};

let _props: Types.OutlineProps = defaultProps;

class OutlinePosition {
    public left: number;
    public top: number;
    public right: number;
    public bottom: number;

    constructor(left: number, top: number, right: number, bottom: number) {
        this.left = left;
        this.top = top;
        this.right = right;
        this.bottom = bottom;
    }

    public equalsTo(other: OutlinePosition): boolean {
        return (
            this.left === other.left &&
            this.top === other.top &&
            this.right === other.right &&
            this.bottom === other.bottom
        );
    }

    public clone(): OutlinePosition {
        return new OutlinePosition(
            this.left,
            this.top,
            this.right,
            this.bottom
        );
    }
}

function isParentChild(parent: HTMLElement, child: HTMLElement): boolean {
    return (
        child === parent ||
        // tslint:disable-next-line:no-bitwise
        !!(
            parent.compareDocumentPosition(child) &
            document.DOCUMENT_POSITION_CONTAINED_BY
        )
    );
}

export function createOutlineAPI(tabster: Types.TabsterCore): Types.OutlineAPI {
    const win = tabster.getWindow;
    const updateTimer = createTimer();
    let outlinedElement: HTMLElement | undefined;
    let curPos: OutlinePosition | undefined;
    let isVisible = false;
    let curOutlineElements: Types.OutlineElements | undefined;
    let allOutlineElements: Types.OutlineElements[] = [];
    let fullScreenElement: HTMLElement | undefined;
    let fullScreenEventName: string | undefined;
    let fullScreenElementName: string | undefined;

    if (typeof document !== "undefined") {
        if ("onfullscreenchange" in document) {
            fullScreenEventName = "fullscreenchange";
            fullScreenElementName = "fullscreenElement";
        } else if ("onwebkitfullscreenchange" in document) {
            fullScreenEventName = "webkitfullscreenchange";
            fullScreenElementName = "webkitFullscreenElement";
        } else if ("onmozfullscreenchange" in document) {
            fullScreenEventName = "mozfullscreenchange";
            fullScreenElementName = "mozFullScreenElement";
        } else if ("onmsfullscreenchange" in document) {
            fullScreenEventName = "msfullscreenchange";
            fullScreenElementName = "msFullscreenElement";
        }
    }

    const onFullScreenChanged = (e: Event): void => {
        if (!fullScreenElementName || !e.target) {
            return;
        }

        const target = (e.target as Document).body || (e.target as HTMLElement);
        const outlineElements = getDOM(target);

        if (target.ownerDocument && outlineElements) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fsElement: HTMLElement | null = (target.ownerDocument as any)[
                fullScreenElementName
            ];

            if (fsElement) {
                fsElement.appendChild(outlineElements.container);
                fullScreenElement = fsElement;
            } else {
                target.ownerDocument.body.appendChild(
                    outlineElements.container
                );
                fullScreenElement = undefined;
            }
        }
    };

    const onKeyboardNavigationStateChanged = (): void => {
        onFocus(tabster.focusedElement.getFocusedElement());
    };

    const shouldShowCustomOutline = (element: HTMLElement): boolean => {
        const tabsterOnElement = getTabsterOnElement(tabster, element);

        if (
            tabsterOnElement &&
            tabsterOnElement.outline &&
            tabsterOnElement.outline.isIgnored
        ) {
            return false;
        }

        for (let i: HTMLElement | null = element; i; i = i.parentElement) {
            if (i.classList && i.classList.contains(_props.areaClass)) {
                return true;
            }
        }

        return false;
    };

    const onFocus = (e: HTMLElement | undefined): void => {
        if (!updateElement(e) && isVisible) {
            setVisibility(false);
        }
    };

    const updateElement = (e: HTMLElement | undefined): boolean => {
        outlinedElement = undefined;

        clearTimer(updateTimer, win());

        curPos = undefined;

        if (!tabster.keyboardNavigation.isNavigatingWithKeyboard()) {
            return false;
        }

        if (e) {
            // TODO: It's hard (and not necessary) to come up with every possible
            // condition when there should be no outline, it's better to add an
            // API to customize the ignores.
            if (e.tagName === "INPUT") {
                const inputType = (e as HTMLInputElement).type;
                const outlinedInputTypes = {
                    button: true,
                    checkbox: true,
                    file: true,
                    image: true,
                    radio: true,
                    range: true,
                    reset: true,
                    submit: true,
                };

                if (!(inputType in outlinedInputTypes)) {
                    return false;
                }
            } else if (
                e.tagName === "TEXTAREA" ||
                e.contentEditable === "true" ||
                e.tagName === "IFRAME"
            ) {
                return false;
            }

            if (!shouldShowCustomOutline(e)) {
                return false;
            }

            if (tabster.keyboardNavigation.isNavigatingWithKeyboard()) {
                outlinedElement = e;
                updateOutline();
            }

            return true;
        }

        return false;
    };

    const onScroll = (e: Event): void => {
        if (
            !outlinedElement ||
            !isParentChild(e.target as HTMLElement, outlinedElement)
        ) {
            return;
        }

        curPos = undefined;

        setOutlinePosition();
    };

    const updateOutline = (): void => {
        setOutlinePosition();

        clearTimer(updateTimer, win());

        if (!outlinedElement) {
            return;
        }

        setTimer(updateTimer, win(), updateOutline, 30);
    };

    const setVisibility = (visible: boolean): void => {
        isVisible = visible;

        if (curOutlineElements) {
            if (visible) {
                curOutlineElements.container.classList.add(
                    `${_props.outlineClass}_visible`
                );
            } else {
                curOutlineElements.container.classList.remove(
                    `${_props.outlineClass}_visible`
                );
                curPos = undefined;
            }
        }
    };

    const setOutlinePosition = (): void => {
        if (!outlinedElement) {
            return;
        }

        let boundingRect = getBoundingRect(win, outlinedElement);

        const position = new OutlinePosition(
            boundingRect.left,
            boundingRect.top,
            boundingRect.right,
            boundingRect.bottom
        );

        if (curPos && position.equalsTo(curPos)) {
            return;
        }

        const outlineElements = getDOM(outlinedElement);
        const elWin =
            outlinedElement.ownerDocument &&
            outlinedElement.ownerDocument.defaultView;

        if (!outlineElements || !elWin) {
            return;
        }

        if (curOutlineElements !== outlineElements) {
            setVisibility(false);
            curOutlineElements = outlineElements;
        }

        curPos = position;

        const p = position.clone();
        let hasAbsolutePositionedParent = false;
        let hasFixedPositionedParent = false;

        const container = outlineElements.container;
        const scrollingElement =
            container &&
            container.ownerDocument &&
            (container.ownerDocument.scrollingElement as HTMLElement);

        if (!scrollingElement) {
            return;
        }

        for (
            let parent = outlinedElement.parentElement;
            parent && parent.nodeType === Node.ELEMENT_NODE;
            parent = parent.parentElement
        ) {
            // The element might be partially visible within its scrollable parent,
            // reduce the bounding rect if this is the case.

            if (parent === fullScreenElement) {
                break;
            }

            boundingRect = getBoundingRect(win, parent);

            const parentWin =
                parent.ownerDocument && parent.ownerDocument.defaultView;

            if (!parentWin) {
                return;
            }

            const computedStyle = parentWin.getComputedStyle(parent);
            const position = computedStyle.position;

            if (position === "absolute") {
                hasAbsolutePositionedParent = true;
            } else if (position === "fixed" || position === "sticky") {
                hasFixedPositionedParent = true;
            }

            if (computedStyle.overflow === "visible") {
                continue;
            }

            if (
                (!hasAbsolutePositionedParent && !hasFixedPositionedParent) ||
                computedStyle.overflow === "hidden"
            ) {
                if (boundingRect.left > p.left) {
                    p.left = boundingRect.left;
                }
                if (boundingRect.top > p.top) {
                    p.top = boundingRect.top;
                }
                if (boundingRect.right < p.right) {
                    p.right = boundingRect.right;
                }
                if (boundingRect.bottom < p.bottom) {
                    p.bottom = boundingRect.bottom;
                }
            }
        }

        const allRect = getBoundingRect(win, scrollingElement);
        const allWidth = allRect.left + allRect.right;
        const allHeight = allRect.top + allRect.bottom;
        const ow = _props.outlineWidth;

        p.left = p.left > ow ? p.left - ow : 0;
        p.top = p.top > ow ? p.top - ow : 0;
        p.right = p.right < allWidth - ow ? p.right + ow : allWidth;
        p.bottom = p.bottom < allHeight - ow ? p.bottom + ow : allHeight;

        const width = p.right - p.left;
        const height = p.bottom - p.top;

        if (width > ow * 2 && height > ow * 2) {
            const leftBorderNode = outlineElements.left;
            const topBorderNode = outlineElements.top;
            const rightBorderNode = outlineElements.right;
            const bottomBorderNode = outlineElements.bottom;
            const sx =
                fullScreenElement || hasFixedPositionedParent
                    ? 0
                    : elWin.pageXOffset;
            const sy =
                fullScreenElement || hasFixedPositionedParent
                    ? 0
                    : elWin.pageYOffset;

            container.style.position = hasFixedPositionedParent
                ? "fixed"
                : "absolute";

            container.style.background = _props.outlineColor;

            leftBorderNode.style.width =
                rightBorderNode.style.width =
                topBorderNode.style.height =
                bottomBorderNode.style.height =
                    _props.outlineWidth + "px";

            leftBorderNode.style.left =
                topBorderNode.style.left =
                bottomBorderNode.style.left =
                    p.left + sx + "px";
            rightBorderNode.style.left = p.left + sx + width - ow + "px";

            leftBorderNode.style.top =
                rightBorderNode.style.top =
                topBorderNode.style.top =
                    p.top + sy + "px";
            bottomBorderNode.style.top = p.top + sy + height - ow + "px";

            leftBorderNode.style.height = rightBorderNode.style.height =
                height + "px";

            topBorderNode.style.width = bottomBorderNode.style.width =
                width + "px";

            setVisibility(true);
        } else {
            setVisibility(false);
        }
    };

    const getDOM = (
        contextElement: HTMLElement
    ): Types.OutlineElements | undefined => {
        const doc = contextElement.ownerDocument;
        const elWin = (doc && doc.defaultView) as WindowWithOutlineStyle;

        if (!doc || !elWin || !elWin.__tabsterOutline) {
            return undefined;
        }

        if (!elWin.__tabsterOutline.style) {
            elWin.__tabsterOutline.style = appendStyles(doc, _props);
        }

        if (!elWin.__tabsterOutline.elements) {
            const outlineElements: Types.OutlineElements = {
                container: doc.createElement("div"),
                left: doc.createElement("div"),
                top: doc.createElement("div"),
                right: doc.createElement("div"),
                bottom: doc.createElement("div"),
            };

            outlineElements.container.className = _props.outlineClass;
            outlineElements.left.className = `${_props.outlineClass}__left`;
            outlineElements.top.className = `${_props.outlineClass}__top`;
            outlineElements.right.className = `${_props.outlineClass}__right`;
            outlineElements.bottom.className = `${_props.outlineClass}__bottom`;

            outlineElements.container.appendChild(outlineElements.left);
            outlineElements.container.appendChild(outlineElements.top);
            outlineElements.container.appendChild(outlineElements.right);
            outlineElements.container.appendChild(outlineElements.bottom);

            doc.body.appendChild(outlineElements.container);

            elWin.__tabsterOutline.elements = outlineElements;

            // TODO: Make a garbage collector to remove the references
            // to the outlines which are nowhere in the DOM anymore.
            allOutlineElements.push(outlineElements);
        }

        return elWin.__tabsterOutline.elements;
    };

    const removeDOM = (contextElement: HTMLElement): void => {
        const elWin = (contextElement.ownerDocument &&
            contextElement.ownerDocument.defaultView) as WindowWithOutlineStyle;
        const outline = elWin && elWin.__tabsterOutline;

        if (!outline) {
            return;
        }

        if (outline.style && outline.style.parentNode) {
            outline.style.parentNode.removeChild(outline.style);

            delete outline.style;
        }

        const outlineElements = outline && outline.elements;

        if (outlineElements) {
            if (outlineElements.container.parentNode) {
                outlineElements.container.parentNode.removeChild(
                    outlineElements.container
                );
            }

            delete outline.elements;
        }
    };

    tabster.queueInit(() => {
        tabster.keyboardNavigation.subscribe(onKeyboardNavigationStateChanged);
        tabster.focusedElement.subscribe(onFocus);

        const w = win();

        addListener(w, "scroll", onScroll, true); // Capture!

        if (fullScreenEventName) {
            addListener(w.document, fullScreenEventName, onFullScreenChanged);
        }
    });

    return {
        setup(props?: Partial<Types.OutlineProps>): void {
            _props = { ..._props, ...props };

            const w = win() as WindowWithOutlineStyle;

            if (!w.__tabsterOutline) {
                w.__tabsterOutline = {};
            }

            if (!w.__tabsterOutline.style) {
                w.__tabsterOutline.style = appendStyles(w.document, _props);
            }

            if (!props || !props.areaClass) {
                w.document.body.classList.add(defaultProps.areaClass);
            } else {
                w.document.body.classList.remove(defaultProps.areaClass);
            }
        },

        dispose(): void {
            const w = win();
            clearTimer(updateTimer, w);

            tabster.keyboardNavigation.unsubscribe(
                onKeyboardNavigationStateChanged
            );
            tabster.focusedElement.unsubscribe(onFocus);

            removeListener(w, "scroll", onScroll, true);

            if (fullScreenEventName) {
                removeListener(
                    w.document,
                    fullScreenEventName,
                    onFullScreenChanged
                );
            }

            allOutlineElements.forEach((outlineElements) =>
                removeDOM(outlineElements.container)
            );
            allOutlineElements = [];

            outlinedElement = undefined;
            curPos = undefined;
            curOutlineElements = undefined;
            fullScreenElement = undefined;
        },
    };
}

function appendStyles(
    document: HTMLDocument,
    props: Types.OutlineProps
): HTMLStyleElement {
    const style = document.createElement("style");
    style.type = "text/css";
    style.appendChild(document.createTextNode(getOutlineStyles(props)));
    document.head.appendChild(style);
    return style;
}

function getOutlineStyles(props: Types.OutlineProps): string {
    return `
.${props.areaClass} *, .${props.areaClass} *:focus {
outline: none !important;
}

.${props.outlineClass} {
display: none;
position: absolute;
width: 0;
height: 0;
left: 0;
top: 0;
z-index: ${props.zIndex};
}

.${props.outlineClass}.${props.outlineClass}_visible {
display: block;
}

.${props.outlineClass}__left,
.${props.outlineClass}__top,
.${props.outlineClass}__right,
.${props.outlineClass}__bottom {
position: absolute;
background: inherit;
}`;
}

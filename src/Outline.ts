/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTabsterOnElement } from "./Instance";
import * as Types from "./Types";
import { getBoundingRect } from "./Utils";

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

let _fullScreenEventName: string | undefined;
let _fullScreenElementName: string | undefined;

if (typeof document !== "undefined") {
    if ("onfullscreenchange" in document) {
        _fullScreenEventName = "fullscreenchange";
        _fullScreenElementName = "fullscreenElement";
    } else if ("onwebkitfullscreenchange" in document) {
        _fullScreenEventName = "webkitfullscreenchange";
        _fullScreenElementName = "webkitFullscreenElement";
    } else if ("onmozfullscreenchange" in document) {
        _fullScreenEventName = "mozfullscreenchange";
        _fullScreenElementName = "mozFullScreenElement";
    } else if ("onmsfullscreenchange" in document) {
        _fullScreenEventName = "msfullscreenchange";
        _fullScreenElementName = "msFullscreenElement";
    }
}

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

export class OutlineAPI implements Types.OutlineAPI {
    private _tabster: Types.TabsterCore;
    private _win: Types.GetWindow;
    private _initTimer: number | undefined;
    private _updateTimer: number | undefined;
    private _outlinedElement: HTMLElement | undefined;
    private _curPos: OutlinePosition | undefined;
    private _isVisible = false;
    private _curOutlineElements: Types.OutlineElements | undefined;
    private _allOutlineElements: Types.OutlineElements[] = [];
    private _fullScreenElement: HTMLElement | undefined;

    constructor(tabster: Types.TabsterCore) {
        this._tabster = tabster;
        this._win = tabster.getWindow;
        this._initTimer = this._win().setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        this._tabster.keyboardNavigation.subscribe(
            this._onKeyboardNavigationStateChanged
        );
        this._tabster.focusedElement.subscribe(this._onFocus);

        const win = this._win();

        win.addEventListener("scroll", this._onScroll, true); // Capture!

        if (_fullScreenEventName) {
            win.document.addEventListener(
                _fullScreenEventName,
                this._onFullScreenChanged
            );
        }
    };

    setup(props?: Partial<Types.OutlineProps>): void {
        _props = { ..._props, ...props };

        const win = this._win() as WindowWithOutlineStyle;

        if (!win.__tabsterOutline) {
            win.__tabsterOutline = {};
        }

        if (!win.__tabsterOutline.style) {
            win.__tabsterOutline.style = appendStyles(win.document, _props);
        }

        if (!props || !props.areaClass) {
            win.document.body.classList.add(defaultProps.areaClass);
        } else {
            win.document.body.classList.remove(defaultProps.areaClass);
        }
    }

    dispose(): void {
        const win = this._win();

        if (this._initTimer) {
            win.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        if (this._updateTimer) {
            win.clearTimeout(this._updateTimer);
            this._updateTimer = undefined;
        }

        this._tabster.keyboardNavigation.unsubscribe(
            this._onKeyboardNavigationStateChanged
        );
        this._tabster.focusedElement.unsubscribe(this._onFocus);

        win.removeEventListener("scroll", this._onScroll, true);

        if (_fullScreenEventName) {
            win.document.removeEventListener(
                _fullScreenEventName,
                this._onFullScreenChanged
            );
        }

        this._allOutlineElements.forEach((outlineElements) =>
            this._removeDOM(outlineElements.container)
        );
        this._allOutlineElements = [];

        delete this._outlinedElement;
        delete this._curPos;
        delete this._curOutlineElements;
        delete this._fullScreenElement;
    }

    private _onFullScreenChanged = (e: Event): void => {
        if (!_fullScreenElementName || !e.target) {
            return;
        }

        const target = (e.target as Document).body || (e.target as HTMLElement);
        const outlineElements = this._getDOM(target);

        if (target.ownerDocument && outlineElements) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fsElement: HTMLElement | null = (target.ownerDocument as any)[
                _fullScreenElementName
            ];

            if (fsElement) {
                fsElement.appendChild(outlineElements.container);
                this._fullScreenElement = fsElement;
            } else {
                target.ownerDocument.body.appendChild(
                    outlineElements.container
                );
                this._fullScreenElement = undefined;
            }
        }
    };

    private _onKeyboardNavigationStateChanged = (): void => {
        this._onFocus(this._tabster.focusedElement.getFocusedElement());
    };

    private _shouldShowCustomOutline(element: HTMLElement): boolean {
        const tabsterOnElement = getTabsterOnElement(this._tabster, element);

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
    }

    private _onFocus = (e: HTMLElement | undefined): void => {
        if (!this._updateElement(e) && this._isVisible) {
            this._setVisibility(false);
        }
    };

    private _updateElement(e: HTMLElement | undefined): boolean {
        this._outlinedElement = undefined;

        if (this._updateTimer) {
            this._win().clearTimeout(this._updateTimer);
            this._updateTimer = undefined;
        }

        this._curPos = undefined;

        if (!this._tabster.keyboardNavigation.isNavigatingWithKeyboard()) {
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

            if (!this._shouldShowCustomOutline(e)) {
                return false;
            }

            if (this._tabster.keyboardNavigation.isNavigatingWithKeyboard()) {
                this._outlinedElement = e;
                this._updateOutline();
            }

            return true;
        }

        return false;
    }

    private _onScroll = (e: UIEvent): void => {
        if (
            !this._outlinedElement ||
            !OutlineAPI._isParentChild(
                e.target as HTMLElement,
                this._outlinedElement
            )
        ) {
            return;
        }

        this._curPos = undefined;

        this._setOutlinePosition();
    };

    private _updateOutline(): void {
        this._setOutlinePosition();

        if (this._updateTimer) {
            this._win().clearTimeout(this._updateTimer);
            this._updateTimer = undefined;
        }

        if (!this._outlinedElement) {
            return;
        }

        this._updateTimer = this._win().setTimeout(() => {
            this._updateTimer = undefined;
            this._updateOutline();
        }, 30);
    }

    private _setVisibility(visible: boolean): void {
        this._isVisible = visible;

        if (this._curOutlineElements) {
            if (visible) {
                this._curOutlineElements.container.classList.add(
                    `${_props.outlineClass}_visible`
                );
            } else {
                this._curOutlineElements.container.classList.remove(
                    `${_props.outlineClass}_visible`
                );
                this._curPos = undefined;
            }
        }
    }

    private _setOutlinePosition(): void {
        if (!this._outlinedElement) {
            return;
        }

        let boundingRect = getBoundingRect(this._win, this._outlinedElement);

        const position = new OutlinePosition(
            boundingRect.left,
            boundingRect.top,
            boundingRect.right,
            boundingRect.bottom
        );

        if (this._curPos && position.equalsTo(this._curPos)) {
            return;
        }

        const outlineElements = this._getDOM(this._outlinedElement);
        const win =
            this._outlinedElement.ownerDocument &&
            this._outlinedElement.ownerDocument.defaultView;

        if (!outlineElements || !win) {
            return;
        }

        if (this._curOutlineElements !== outlineElements) {
            this._setVisibility(false);
            this._curOutlineElements = outlineElements;
        }

        this._curPos = position;

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
            let parent = this._outlinedElement.parentElement;
            parent;
            parent = parent.parentElement
        ) {
            // The element might be partially visible within its scrollable parent,
            // reduce the bounding rect if this is the case.

            if (parent === this._fullScreenElement) {
                break;
            }

            boundingRect = getBoundingRect(this._win, parent);

            const win =
                parent.ownerDocument && parent.ownerDocument.defaultView;

            if (!win) {
                return;
            }

            const computedStyle = win.getComputedStyle(parent);
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

        const allRect = getBoundingRect(this._win, scrollingElement);
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
                this._fullScreenElement || hasFixedPositionedParent
                    ? 0
                    : win.pageXOffset;
            const sy =
                this._fullScreenElement || hasFixedPositionedParent
                    ? 0
                    : win.pageYOffset;

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

            this._setVisibility(true);
        } else {
            this._setVisibility(false);
        }
    }

    private _getDOM(
        contextElement: HTMLElement
    ): Types.OutlineElements | undefined {
        const doc = contextElement.ownerDocument;
        const win = (doc && doc.defaultView) as WindowWithOutlineStyle;

        if (!doc || !win || !win.__tabsterOutline) {
            return undefined;
        }

        if (!win.__tabsterOutline.style) {
            win.__tabsterOutline.style = appendStyles(doc, _props);
        }

        if (!win.__tabsterOutline.elements) {
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

            win.__tabsterOutline.elements = outlineElements;

            // TODO: Make a garbage collector to remove the references
            // to the outlines which are nowhere in the DOM anymore.
            this._allOutlineElements.push(outlineElements);
        }

        return win.__tabsterOutline.elements;
    }

    private _removeDOM(contextElement: HTMLElement): void {
        const win = (contextElement.ownerDocument &&
            contextElement.ownerDocument.defaultView) as WindowWithOutlineStyle;
        const outline = win && win.__tabsterOutline;

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
    }

    private static _isParentChild(
        parent: HTMLElement,
        child: HTMLElement
    ): boolean {
        return (
            child === parent ||
            // tslint:disable-next-line:no-bitwise
            !!(
                parent.compareDocumentPosition(child) &
                document.DOCUMENT_POSITION_CONTAINED_BY
            )
        );
    }
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

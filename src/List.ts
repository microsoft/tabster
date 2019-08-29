/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EventFromIFrame, EventFromIFrameDescriptorType, setupIFrameToMainWindowEventsDispatcher } from './IFrameEvents';
import { getAbilityHelpersOnElement, setAbilityHelpersOnElement } from './Instance';
import { dispatchMutationEvent, MUTATION_EVENT_NAME, MutationEvent } from './MutationEvent';
import * as Types from './Types';
import { createElementTreeWalker } from './Utils';

const _customEventName = 'ability-helpers:list-related';

let _lastId = 0;

export interface ListAndItem {
    list: Types.ListContainer;
    listItem: Types.ListItem;
    isListItem: boolean;
}

export interface ListState {
    currentItem?: string;
}

export class ListNavigation {
    private _ah: Types.AbilityHelpers;
    private _element: HTMLElement;
    private _context: HTMLElement;
    private _focus: (e: HTMLElement) => void;

    constructor(container: HTMLElement, context: HTMLElement, focus: (e: HTMLElement) => void, ah: Types.AbilityHelpers) {
        this._ah = ah;

        this._element = container;
        this._context = context;
        this._focus = focus;
    }

    prev(noFocus?: boolean): HTMLElement | null {
        const prev = this._ah.focusable.findPrevListItem(false, false, this._element, this._context);

        if (prev) {
            this._context = prev;

            if (!noFocus) {
                this._focus(prev);
            }
        }

        return prev;
    }

    next(noFocus?: boolean): HTMLElement | null {
        const next = this._ah.focusable.findNextListItem(false, false, this._element, this._context);

        if (next) {
            this._context = next;

            if (!noFocus) {
                this._focus(next);
            }
        }

        return next;
    }

    pageUp(noFocus?: boolean): HTMLElement | null {
        let ue = this._ah.focusable.findPrevListItem(false, false, this._element, this._context);
        let pue: HTMLElement | null = null;

        while (ue) {
            pue = ue;

            ue = isListItemFullyVisible(ue)
                ? this._ah.focusable.findPrevListItem(false, false, this._element, ue)
                : null;
        }

        if (pue) {
            this._context = pue;

            if (!noFocus) {
                List.scrollIntoView(pue, false);

                this._focus(pue);
            }
        }

        return pue;
    }

    pageDown(noFocus?: boolean): HTMLElement | null {
        let de = this._ah.focusable.findNextListItem(false, false, this._element, this._context);
        let pde: HTMLElement | null = null;

        while (de) {
            pde = de;

            de = isListItemFullyVisible(de)
                ? this._ah.focusable.findNextListItem(false, false, this._element, de)
                : null;
        }

        if (pde) {
            this._context = pde;

            if (!noFocus) {
                List.scrollIntoView(pde, true);

                this._focus(pde);
            }
        }

        return pde;
    }

    home(noFocus?: boolean): HTMLElement | null {
        const el = this._ah.focusable.findFirstListItem(this._element);

        if (el) {
            this._context = el;

            if (!noFocus) {
                this._focus(el);
            }
        }

        return el;
    }

    end(noFocus?: boolean): HTMLElement | null {
        const el = this._ah.focusable.findLastListItem(this._element);

        if (el) {
            this._context = el;

            if (!noFocus) {
                this._focus(el);
            }
        }

        return el;
    }
}

export class ListContainer implements Types.ListContainer {
    readonly id: string;

    private _ah: Types.AbilityHelpers;
    private _props: Types.ListProps;
    private _element: HTMLElement;
    private _curItem: Types.ListItem | undefined;

    constructor(element: HTMLElement, props: Types.ListProps, ah: Types.AbilityHelpers) {
        this._ah = ah;

        this.id = 'list' + ++_lastId;
        this._props = props;
        this._element = element;
        this._add();
    }

    dispose(): void {
        this._remove();
    }

    move(newElement: HTMLElement): void {
        this._remove();
        this._element = newElement;
        this._curItem = undefined;
        this._add();
    }

    getCurrentItem(): Types.ListItem | undefined {
        if (this._curItem) {
            return this._curItem;
        }

        return this._findCurrentItem();
    }

    setCurrentItem(item: Types.ListItem | undefined): void {
        this._curItem = item;
        this._setInformativeStyle();
    }

    getElement(): HTMLElement {
        return this._element;
    }

    private _findCurrentItem(): Types.ListItem | undefined {
        if (!this._element.ownerDocument) {
            return undefined;
        }

        let li: Types.ListItem | undefined;

        const walker = createElementTreeWalker(
            this._element.ownerDocument,
            this._element,
            (element: HTMLElement) => acceptCurrentItem.call(this, element)
        );

        if (!walker) {
            return undefined;
        }

        if (this._props.bottomUp) {
            let lastChild: HTMLElement | null = null;

            for (let i = this._element.lastElementChild; i; i = i.lastElementChild) {
                lastChild = i as HTMLElement;
            }

            if (lastChild) {
                if (acceptCurrentItem.call(this, lastChild) !== NodeFilter.FILTER_ACCEPT) {
                    walker.currentNode = lastChild;
                    walker.previousNode();
                }
            }
        } else {
            walker.nextNode();
        }

        if (li && (li !== this._curItem)) {
            this.setCurrentItem(li);
        }

        return li;

        function acceptCurrentItem(this: ListContainer, element: HTMLElement): number {
            const ah = getAbilityHelpersOnElement(element);

            if (ah && ah.listItem) {
                if (this._ah.focusable.isFocusable(ah.listItem.getElement())) {
                    if (!li) {
                        li = ah.listItem;
                    }

                    if ((this._curItem === undefined) || (ah.listItem === this._curItem)) {
                        li = ah.listItem;
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }

                return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_SKIP;
        }
    }

    private _add(): void {
        this._setInformativeStyle();
    }

    private _remove(): void {
        this._element.style.removeProperty('--ah-list');
    }

    private _setInformativeStyle(): void {
        this._element.style.setProperty('--ah-list', this._curItem ? this._curItem.id : 'no-current');
    }
}

export class ListItem implements Types.ListItem {
    readonly id: string;

    private _element: HTMLElement;

    constructor(element: HTMLElement) {
        this.id = 'li' + ++_lastId;
        this._element = element;
        this._add();
    }

    dispose(): void {
        this._remove();
    }

    move(newElement: HTMLElement): void {
        this._remove();
        this._element = newElement;
        this._add();
    }

    getElement(): HTMLElement {
        return this._element;
    }

    private _add(): void {
        this._element.tabIndex = 0;
        this._element.style.setProperty('--ah-list-item', this.id);
    }

    private _remove(): void {
        this._element.style.removeProperty('--ah-list-item');
    }
}

export class List implements Types.List {
    private _ah: Types.AbilityHelpers;
    private _mainWindow: Window;
    private _initTimer: number | undefined;

    constructor(mainWindow: Window, ah: Types.AbilityHelpers) {
        this._ah = ah;

        this._mainWindow = mainWindow;
        this._initTimer = this._mainWindow.setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        this._mainWindow.document.addEventListener(MUTATION_EVENT_NAME, this._onMutation);
        this._mainWindow.addEventListener(_customEventName, this._onIFrameEvent);
    }

    protected dispose(): void {
        if (this._initTimer) {
            this._mainWindow.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        this._mainWindow.document.removeEventListener(MUTATION_EVENT_NAME, this._onMutation);
        this._mainWindow.removeEventListener(_customEventName, this._onIFrameEvent);
    }

    add(element: HTMLElement, props?: Types.ListProps): void {
        const p: Types.ListProps = props || {};

        setAbilityHelpersOnElement(element, {
            list: new ListContainer(element, p, this._ah)
        });

        this._ah.focusDeloser.add(element, {
            onFocusLost: p.onFocusLost
        });
    }

    remove(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);

        if (!ah || !ah.list) {
            return;
        }

        this._ah.focusDeloser.remove(element);

        ah.list.dispose();

        setAbilityHelpersOnElement(element, { list: undefined });
    }

    move(from: HTMLElement, to: HTMLElement): void {
        const ahFrom = getAbilityHelpersOnElement(from);
        const list = ahFrom && ahFrom.list;

        if (list) {
            list.move(to);

            setAbilityHelpersOnElement(to, { list });
            setAbilityHelpersOnElement(from, { list: undefined });

            this._ah.focusDeloser.move(from, to);
        }
    }

    addItem(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);

        if (ah && ah.listItem) {
            return;
        }

        const listItem = new ListItem(element);

        setAbilityHelpersOnElement(element, { listItem });

        dispatchMutationEvent(element, { item: listItem });
    }

    removeItem(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);
        const listItem = ah && ah.listItem;

        if (listItem) {
            listItem.dispose();

            setAbilityHelpersOnElement(element, { listItem: undefined });

            dispatchMutationEvent(element, { item: listItem, removed: true });
        }
    }

    moveItem(from: HTMLElement, to: HTMLElement): void {
        const ahFrom = getAbilityHelpersOnElement(from);
        const listItem = ahFrom && ahFrom.listItem;

        if (listItem) {
            listItem.move(to);

            setAbilityHelpersOnElement(to, { listItem });
            setAbilityHelpersOnElement(from, { listItem: undefined });

            dispatchMutationEvent(from, { item: listItem, removed: true });
            dispatchMutationEvent(to, { item: listItem });
        }
    }

    setActionable(element: HTMLElement, isActionable?: boolean): void {
        // isActionable is optional, so we're making the element actionable
        // if it's true or undefined.
        const actionable = isActionable === false ? undefined : true;

        setAbilityHelpersOnElement(element, {
            listActionable: actionable
        });

        if (actionable) {
            element.style.setProperty('--ah-list-actionable', 'yes');
        } else {
            element.style.removeProperty('--ah-list-actionable');
        }
    }

    setCurrent(context: HTMLElement, element: HTMLElement | undefined): boolean {
        const list = List._getList(context);

        if (list) {
            if (element) {
                const newLi = List.getItemFor(element);

                if (newLi && (newLi.list === list)) {
                    list.setCurrentItem(newLi.listItem);

                    return true;
                }
            } else {
                list.setCurrentItem(undefined);

                return true;
            }
        }

        return false;
    }

    private _onIFrameEvent = (e: EventFromIFrame): void => {
        if (!e.targetDetails) {
            return;
        }

        switch (e.targetDetails.descriptor.name) {
            case MUTATION_EVENT_NAME:
                this._onMutation(e.originalEvent as MutationEvent);
                break;
        }
    }

    private _onMutation = (e: MutationEvent): void => {
        if (!e.target) {
            return;
        }

        const details = e.details;

        if (details.list) {
            details.list.setCurrentItem(undefined);

            return;
        }

        if (!details.item) {
            return;
        }

        const l = List._getList(e.target as Node);

        if (!l) {
            return;
        }

        if (e.details.removed && (l.getCurrentItem() === details.item)) {
            l.setCurrentItem(undefined);
        }
    }

    private static _getList(element: Node): Types.ListContainer | undefined {
        for (let e: (Node | null) = element; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(e);

            if (ah && ah.list) {
                return ah.list;
            }
        }

        return undefined;
    }

    static getItemFor(element: Node): ListAndItem | undefined {
        if (!element.ownerDocument) {
            return undefined;
        }

        let list: Types.ListContainer | undefined;
        let item: Types.ListItem | undefined;
        let itemElement: Node | undefined;

        for (let e: (Node | null) = element; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(e);

            if (!ah) {
                continue;
            }

            if (!item && ah.listItem) {
                item = ah.listItem;
                itemElement = e;
            }

            if (item && ah.list) {
                list = ah.list;

                break;
            }
        }

        if (!list || !item) {
            return undefined;
        }

        return {
            list,
            listItem: item,
            isListItem: element === itemElement
        };
    }

    static findActionable(element: HTMLElement): HTMLElement | null {
        if (!element.ownerDocument) {
            return null;
        }

        const walker = createElementTreeWalker(element.ownerDocument, element, (el: Node) => {
            const ah = getAbilityHelpersOnElement(el);

            return ah && ah.listActionable ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        });

        return (walker ? walker.nextNode() : null) as (HTMLElement | null);
    }

    static scrollIntoView(element: HTMLElement, alignToTop: boolean): void {
        // Built-in DOM's scrollIntoView() is cool, but when we have nested containers,
        // it scrolls all of them, not just the deepest one. So, trying to work it around.
        const l = List.getItemFor(element);

        if (l) {
            const listElement = l.list.getElement();
            const listRect = listElement.getBoundingClientRect();
            const itemRect = l.listItem.getElement().getBoundingClientRect();

            if (alignToTop) {
                listElement.scrollTop += (itemRect.top - listRect.top);
            } else {
                listElement.scrollTop += (itemRect.bottom - listRect.bottom);
            }
        }
    }
}

export function setupListInIFrame(mainWindow: Window, iframeDocument: HTMLDocument): void {
    setupIFrameToMainWindowEventsDispatcher(mainWindow, iframeDocument, _customEventName, [
        { type: EventFromIFrameDescriptorType.Document, name: MUTATION_EVENT_NAME, capture: false }
    ]);
}

function isListItemFullyVisible(element: HTMLElement): boolean {
    const li = List.getItemFor(element);

    if (!li) {
        return false;
    }

    const l = li.list.getElement().getBoundingClientRect();
    const i = element.getBoundingClientRect();

    return (i.left >= l.left) && (i.top >= l.top) && (i.right <= l.right) && (i.bottom <= l.bottom);
}

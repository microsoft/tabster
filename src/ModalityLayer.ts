/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { EventFromIFrame, EventFromIFrameDescriptorType, setupIFrameToMainWindowEventsDispatcher } from './IFrameEvents';
import { getAbilityHelpersOnElement, setAbilityHelpersOnElement } from './Instance';
import { dispatchMutationEvent, MUTATION_EVENT_NAME, MutationEvent } from './MutationEvent';
import * as Types from './Types';
import { createElementTreeWalker } from './Utils';

const _customEventName = 'ability-helpers:modality-layer-related';
const _noRootId = 'no-root';

let _lastInternalId = 0;
let _rootById: { [id: string]: Types.ModalityLayerRoot } = {};

export interface ModalityLayerFor {
    root: Types.ModalityLayerRoot;
    layer: Types.ModalityLayerContainer;
}

export class ModalityLayerContainer implements Types.ModalityLayerContainer {
    readonly internalId: string;
    readonly userId: string;

    private _ah: Types.AbilityHelpers;
    private _element: HTMLElement;
    private _props: Types.ModalityLayerProps;
    private _isActive: boolean | undefined;
    private _isAccessible = true;
    private _setAccessibleTimer: number | undefined;
    private _isFocused = false;

    constructor(element: HTMLElement, id: string, props: Types.ModalityLayerProps, ah: Types.AbilityHelpers) {
        this._ah = ah;

        this.internalId = 'ml' + ++_lastInternalId;
        this.userId = id;

        this._element = element;
        this._props = props;
        this._setAccessibilityProps();
        this._setInformativeStyle();
    }

    setup(props: Partial<Types.ModalityLayerProps>): void {
        this._props = { ...this._props, ...props };
        this._setAccessibilityProps();
    }

    dispose(): void {
        this._remove();
    }

    move(newElement: HTMLElement): void {
        this._remove();

        this._element = newElement;

        this._setAccessibilityProps();

        this._isAccessible = !this._isAccessible;
        this._isActive = !this._isActive;

        this.setAccessible(!this._isAccessible);
        this.setActive(!this._isActive);
    }

    setAccessible(accessible: boolean): void {
        if (accessible === this._isAccessible) {
            return;
        }

        this._isAccessible = accessible;

        if (this._setAccessibleTimer) {
            window.clearTimeout(this._setAccessibleTimer);

            this._setAccessibleTimer = undefined;
        }

        if (accessible) {
            this._element.removeAttribute('aria-hidden');
        } else {
            this._setAccessibleTimer = window.setTimeout(() => {
                this._setAccessibleTimer = undefined;

                this._element.setAttribute('aria-hidden', 'true');
            }, 0);
        }

        this._setInformativeStyle();
    }

    setActive(active: boolean): void {
        if (active === this._isActive) {
            return;
        }

        this._isActive = active;

        this._setInformativeStyle();
    }

    isActive(): boolean {
        return !!this._isActive;
    }

    isOthersAccessible(): boolean {
        return !!this._props.othersAccessible;
    }

    isAlwaysAccessible(): boolean {
        return !!this._props.alwaysAccessible;
    }

    isNoFocusFirst(): boolean {
        return !!this._props.noFocusFirst;
    }

    isNoFocusDefault(): boolean {
        return !!this._props.noFocusDefault;
    }

    getElement(): HTMLElement {
        return this._element;
    }

    setFocused(focused: boolean): void {
        if (this._isFocused === focused) {
            return;
        }

        this._isFocused = focused;

        if (focused) {
            if (this._props.onFocusIn) {
                this._props.onFocusIn();
            }
        } else {
            if (this._props.onFocusOut) {
                this._props.onFocusOut(false);
            }
        }

        this._setInformativeStyle();
    }

    onBeforeFocusOut(): boolean {
        if (this._props.onFocusOut) {
            return this._props.onFocusOut(true);
        }

        return false;
    }

    private _remove(): void {
        this._element.style.removeProperty('--ah-modality-layer');
    }

    private _setAccessibilityProps(): void {
        this._element.setAttribute('aria-label', this._props.accessibilityLabel);

        if (!this._element.hasAttribute('tabindex')) {
            this._element.tabIndex = -1;
        }

        if (this._element.tabIndex < 0) {
            this._ah.outline.ignoreElement(this._element);
        }
    }

    private _setInformativeStyle(): void {
        this._element.style.setProperty(
            '--ah-modality-layer',
            this.internalId + ',' + this.userId +
                ',' +
                    (this._isActive ? 'active' : 'inactive') +
                        ',' +
                            (this._isAccessible ? 'accessible' : 'inaccessible') +
                                ',' +
                                    (this._isFocused ? 'focused' : 'not-focused')
        );
    }
}

export class ModalityLayerRoot implements Types.ModalityLayerRoot {
    readonly id: string;

    private _element: HTMLElement;
    private _curLayerId: string | undefined;
    private _knownLayers: { [id: string]: Types.ModalityLayerContainer } = {};
    private _updateLayersTimer: number | undefined;

    constructor(element: HTMLElement) {
        this.id = 'root' + ++_lastInternalId;
        this._element = element;
        this._add();
    }

    dispose(): void {
        if (this._updateLayersTimer) {
            window.clearTimeout(this._updateLayersTimer);
            this._updateLayersTimer = undefined;
        }

        this._remove();
    }

    move(newElement: HTMLElement): void {
        this._remove();
        this._element = newElement;
        this._add();
        this.updateLayers();
    }

    getElement(): HTMLElement {
        return this._element;
    }

    getCurrentLayerId(): string | undefined {
        return this._curLayerId;
    }

    setCurrentLayerId(id: string | undefined, noLayersUpdate?: boolean): void {
        this._curLayerId = id;

        this._setInformativeStyle();

        if (!noLayersUpdate) {
            this.updateLayers();
        }
    }

    getLayers(): Types.ModalityLayerContainer[] {
        const layers: Types.ModalityLayerContainer[] = [];

        for (let id of Object.keys(this._knownLayers)) {
            layers.push(this._knownLayers[id]);
        }

        return layers;
    }

    updateLayers(): void {
        if (this._updateLayersTimer) {
            return;
        }

        this._updateLayersTimer = window.setTimeout(() => {
            this._updateLayersTimer = undefined;
            this._reallyUpdateLayers();
        }, 0);
    }

    private _add(): void {
        this._setInformativeStyle();
    }

    private _remove(): void {
        this._element.style.removeProperty('--ah-modality-layer-root');
    }

    private _reallyUpdateLayers(): void {
        if (!this._element.ownerDocument) {
            return;
        }

        const layersToUpdate: Types.ModalityLayerContainer[] = [];

        const walker = createElementTreeWalker(this._element.ownerDocument, this._element, (element: HTMLElement) => {
            const ah = getAbilityHelpersOnElement(element);

            if (ah && ah.modalityLayer) {
                layersToUpdate.push(ah.modalityLayer);

                return NodeFilter.FILTER_ACCEPT;
            }

            return NodeFilter.FILTER_SKIP;
        });

        if (walker) {
            while (walker.nextNode()) { /* Iterating for the sake of calling acceptNode callback. */ }
        }

        let othersAccessible = (this._curLayerId === undefined);
        let currentIsPresent = false;

        const prevKnownLayers = this._knownLayers;
        const newKnownLayers: { [id: string]: Types.ModalityLayerContainer } = {};
        const addedLayers: { [id: string]: Types.ModalityLayerContainer } = {};
        const removedLayers: { [id: string]: Types.ModalityLayerContainer } = {};

        for (let i = 0; i < layersToUpdate.length; i++) {
            const layer = layersToUpdate[i];
            const layerId = layer.userId;
            const isCurrent = layerId === this._curLayerId;

            if (!othersAccessible && isCurrent) {
                othersAccessible = layer.isOthersAccessible();
            }

            if (isCurrent) {
                currentIsPresent = true;
            }

            newKnownLayers[layerId] = layer;

            if (!(layerId in prevKnownLayers)) {
                addedLayers[layerId] = layer;
            }
        }

        for (let id of Object.keys(prevKnownLayers)) {
            if (!(id in newKnownLayers)) {
                removedLayers[id] = prevKnownLayers[id];
            }
        }

        if (!currentIsPresent) {
            this.setCurrentLayerId(undefined, true);
        }

        this._knownLayers = newKnownLayers;

        for (let i = 0; i < layersToUpdate.length; i++) {
            const layer = layersToUpdate[i];
            const layerId = layer.userId;

            const active = (this._curLayerId === undefined) || (layerId === this._curLayerId);

            layer.setActive(active);
            layer.setAccessible(layer.isAlwaysAccessible() || othersAccessible || active);
        }
    }

    private _setInformativeStyle(): void {
        this._element.style.setProperty(
            '--ah-modality-layer-root',
            this.id + ',' + (this._curLayerId || 'undefined')
        );
    }
}

export class ModalityLayer implements Types.ModalityLayer {
    private _ah: Types.AbilityHelpers;
    private _mainWindow: Window;
    private _initTimer: number | undefined;
    private _curFocusInLayer: Types.ModalityLayerContainer | undefined;
    private _focusOutTimer: number | undefined;

    constructor(mainWindow: Window, ah: Types.AbilityHelpers) {
        this._ah = ah;

        this._mainWindow = mainWindow;
        this._initTimer = this._mainWindow.setTimeout(this._init, 0);
    }

    private _init = (): void => {
        this._initTimer = undefined;

        this._ah.focusedElement.subscribe(this._onElementFocused);

        this._mainWindow.document.addEventListener(MUTATION_EVENT_NAME, this._onMutation);
        this._mainWindow.addEventListener(_customEventName, this._onIFrameEvent);

        observeMutationEvents(this._mainWindow.document);
    }

    protected dispose(): void {
        if (this._initTimer) {
            this._mainWindow.clearTimeout(this._initTimer);
            this._initTimer = undefined;
        }

        if (this._focusOutTimer) {
            this._mainWindow.clearTimeout(this._focusOutTimer);
            this._focusOutTimer = undefined;
        }

        this._ah.focusedElement.unsubscribe(this._onElementFocused);

        this._mainWindow.document.removeEventListener(MUTATION_EVENT_NAME, this._onMutation);
        this._mainWindow.removeEventListener(_customEventName, this._onIFrameEvent);

        // TODO: Stop the observer.
    }

    addRoot(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);

        if (ah && ah.modalityRoot) {
            return;
        }

        const modalityRoot = new ModalityLayerRoot(element);

        setAbilityHelpersOnElement(element, { modalityRoot });

        const n: HTMLElement[] = [];
        for (let i: any = element; i; i = i.parentElement) {
            n.push(i);
        }

        dispatchMutationEvent(element, { root: modalityRoot });
    }

    removeRoot(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);
        const root = ah && ah.modalityRoot;

        if (!root) {
            return;
        }

        dispatchMutationEvent(element, { root, removed: true });

        setAbilityHelpersOnElement(element, { modalityRoot: undefined });

        root.dispose();
    }

    moveRoot(from: HTMLElement, to: HTMLElement): void {
        const ahFrom = getAbilityHelpersOnElement(from);
        const root = ahFrom && ahFrom.modalityRoot;

        if (root) {
            root.move(to);

            setAbilityHelpersOnElement(to, { modalityRoot: root });
            setAbilityHelpersOnElement(from, { modalityRoot: undefined });

            dispatchMutationEvent(from, { root, removed: true });
            dispatchMutationEvent(to, { root });
        }
    }

    addLayer(element: HTMLElement, id: string, props: Types.ModalityLayerProps): void {
        const ah = getAbilityHelpersOnElement(element);

        if (ah && ah.modalityLayer) {
            if (ah.modalityLayer.userId !== id) {
                throw new Error('The element already has a modality layer with different id.');
            }

            return;
        }

        const layer = new ModalityLayerContainer(element, id, props, this._ah);

        setAbilityHelpersOnElement(element, { modalityLayer: layer });

        this._ah.focusDeloser.add(element, {
            onFocusLost: props.onFocusLost
        });

        dispatchMutationEvent(element, { layer });
    }

    removeLayer(element: HTMLElement): void {
        const ah = getAbilityHelpersOnElement(element);

        const layer = ah && ah.modalityLayer;

        if (!layer) {
            return;
        }

        setAbilityHelpersOnElement(element, {
            modalityLayer: undefined
        });

        this._ah.focusDeloser.remove(element);

        dispatchMutationEvent(element, { layer, removed: true });

        layer.dispose();
    }

    moveLayer(from: HTMLElement, to: HTMLElement): void {
        const ahFrom = getAbilityHelpersOnElement(from);

        const layer = ahFrom && ahFrom.modalityLayer;

        if (layer) {
            layer.move(to);

            setAbilityHelpersOnElement(to, { modalityLayer: layer });
            setAbilityHelpersOnElement(from, { modalityLayer: undefined });

            this._ah.focusDeloser.move(from, to);

            dispatchMutationEvent(from, { layer, removed: true });
            dispatchMutationEvent(to, { layer });
        }
    }

    focusLayer(elementFromLayer: HTMLElement, noFocusFirst?: boolean, noFocusDefault?: boolean): boolean {
        const l = ModalityLayer.getLayerFor(elementFromLayer);

        if (l) {
            const actions = this._ah.focusDeloser.getActions(l.layer.getElement());

            if (actions) {
                if (noFocusFirst === undefined) {
                    noFocusFirst = l.layer.isNoFocusFirst();
                }

                if (!noFocusFirst && this._ah.keyboardNavigation.isNavigatingWithKeyboard() && actions.focusFirst()) {
                    return true;
                }

                if (noFocusDefault === undefined) {
                    noFocusDefault = l.layer.isNoFocusDefault();
                }

                if (!noFocusDefault && actions.focusDefault()) {
                    return true;
                }

                return actions.resetFocus();
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
        if (!e.target || !e.details.layer) {
            return;
        }

        const root = ModalityLayer._getRootOnly(e.target as Node);

        if (root) {
            root.updateLayers();
        }
    }

    private _onElementFocused = (e: HTMLElement): void => {
        if (this._focusOutTimer) {
            this._mainWindow.clearTimeout(this._focusOutTimer);
            this._focusOutTimer = undefined;
        }

        let layer: Types.ModalityLayerContainer | undefined;

        if (e) {
            const l = ModalityLayer.getLayerFor(e);

            if (l) {
                layer = l.layer;
            }
        }

        if (layer) {
            if (this._curFocusInLayer && (layer !== this._curFocusInLayer)) {
                this._curFocusInLayer.setFocused(false);
            }

            this._curFocusInLayer = layer;

            this._curFocusInLayer.setFocused(true);
        } else if (this._curFocusInLayer) {
            this._focusOutTimer = this._mainWindow.setTimeout(() => {
                this._focusOutTimer = undefined;

                if (this._curFocusInLayer) {
                    this._curFocusInLayer.setFocused(false);

                    this._curFocusInLayer = undefined;
                }
            }, 0);
        }
    }

    private static _getRootOnly(element: Node): Types.ModalityLayerRoot | undefined {
        for (let e: (Node | null) = element; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(e);

            if (ah && ah.modalityRoot) {
                return ah.modalityRoot;
            }
        }

        return undefined;
    }

    static getLayerFor(element: Node): ModalityLayerFor | undefined {
        if (!element.ownerDocument) {
            return undefined;
        }

        let root: Types.ModalityLayerRoot | undefined;
        let layer: Types.ModalityLayerContainer | undefined;

        for (let e: (Node | null) = element; e; e = e.parentElement) {
            const ah = getAbilityHelpersOnElement(e);

            if (!ah) {
                continue;
            }

            if (!layer && ah.modalityLayer) {
                layer = ah.modalityLayer;
            }

            if (layer && ah.modalityRoot) {
                root = ah.modalityRoot;

                break;
            }
        }

        if (!layer || !root) {
            return undefined;
        }

        return { layer, root };
    }

    static getRootId(element: HTMLElement): string {
        const l = ModalityLayer.getLayerFor(element);
        return (l && l.root.id) || _noRootId;
    }

    static getRootById(id: string): Types.ModalityLayerRoot | undefined {
        if (id === _noRootId) {
            return undefined;
        }

        return _rootById[id];
    }
}

export function setupModalityLayerInIFrame(mainWindow: Window, iframeDocument: HTMLDocument): void {
    observeMutationEvents(iframeDocument);

    setupIFrameToMainWindowEventsDispatcher(mainWindow, iframeDocument, _customEventName, [
        { type: EventFromIFrameDescriptorType.Document, name: MUTATION_EVENT_NAME, capture: false }
    ]);
}

function observeMutationEvents(doc: HTMLDocument): void {
    doc.addEventListener(MUTATION_EVENT_NAME, (e: MutationEvent) => {
        const root = e.details.root;

        if (root) {
            if (e.details.removed) {
                delete _rootById[root.id];
            } else {
                _rootById[root.id] = root;
            }
        }
    });
}

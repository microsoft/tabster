/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export interface AbilityHelpers {
    announcer: Announcer;
    keyboardNavigation: KeyboardNavigationState;
    focusedElement: FocusedElementState;
    outline: Outline;
    focusDeloser: FocusDeloser;
    focusable: Focusable;
    modalityLayer: ModalityLayer;
    list: List;
}

export type SubscribableCallback<A, B = undefined> = (val: A, details: B) => void;

export interface Subscribable<A, B = undefined> {
    subscribe(callback: SubscribableCallback<A, B>): void;
    unsubscribe(callback: SubscribableCallback<A, B>): void;
}

export interface AnnouncerProps {
    title: string;
    historyLength: number;
    parent: HTMLElement | undefined;
}

export interface Announcer {
    setup(props: Partial<AnnouncerProps>): void;
    announce(text: string, assertive?: boolean): void;
}

export interface KeyboardNavigationState extends Subscribable<boolean> {
    isNavigatingWithKeyboard(): boolean;
}

export interface FocusedElementDetails {
    relatedTarget?: HTMLElement;
    isFocusedProgrammatically?: boolean;
}

export interface FocusedElementState extends Subscribable<HTMLElement | undefined, FocusedElementDetails> {
    getFocusedElement(): HTMLElement | undefined;
    focus(element: HTMLElement, noFocusedProgrammaticallyFlag?: boolean, noAccessibleCheck?: boolean): boolean;
}

export interface OutlineProps {
    areaClass: string;
    outlineClass: string;
    outlineColor: string;
    outlineWidth: number;
    zIndex: number;
}

export interface Outline {
    setup(props: Partial<OutlineProps>): void;
    ignoreElement(element: HTMLElement, unignore?: boolean): void;
}

export interface FocusDeloserElementActions {
    focusDefault: () => boolean;
    focusFirst: () => boolean;
    resetFocus: () => boolean;
    clearHistory: (preserveExisting?: boolean) => void;
    setSnapshot: (index: number) => void;
    isActive: () => boolean;
}

export interface FocusDeloserProps {
    onFocusLost?(last: HTMLElement, actions: FocusDeloserElementActions): boolean;
}

export interface FocusDeloserContainer {
    readonly id: string;
    setup(props: Partial<FocusDeloserProps>): void;
    move(newContainer: HTMLElement): void;
    dispose(): void;
    isActive(): boolean;
    setActive(active: boolean): void;
    getActions(): FocusDeloserElementActions;
    setSnapshot(index: number): void;
    focusFirst(): boolean;
    unshift(element: HTMLElement): void;
    focusDefault(): boolean;
    resetFocus(): boolean;
    findAvailable(): HTMLElement | null;
    clearHistory(preserveExisting?: boolean): void;
    customFocus(last: HTMLElement): boolean;
}

export interface FocusDeloser {
    getActions(element: HTMLElement): FocusDeloserElementActions | undefined;
    add(element: HTMLElement, props?: FocusDeloserProps): void;
    remove(element: HTMLElement): void;
    move(from: HTMLElement, to: HTMLElement): void;
    pause(): void;
    resume(restore?: boolean): void;
}

export interface FocusableElementInfo {
    isDefaultFocusable: boolean;
    isIgnoredFocusable: boolean;
}

export interface Focusable {
    getInfo(element: HTMLElement): FocusableElementInfo;
    setup(element: HTMLElement, info: Partial<FocusableElementInfo>): void;
    isFocusable(el: HTMLElement, includeProgrammaticallyFocusable?: boolean, noAccessibleCheck?: boolean): boolean;
    isVisible(el: HTMLElement): boolean;
    isAccessible(el: HTMLElement): boolean;
    findFirst(container: HTMLElement, includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean): HTMLElement | null;
    findLast(container: HTMLElement, includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean): HTMLElement | null;
    findNext(includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean,
            container?: HTMLElement, focused?: HTMLElement): HTMLElement | null;
    findPrev(includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean,
            container?: HTMLElement, focused?: HTMLElement): HTMLElement | null;
    findFirstListItem(container: HTMLElement, includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean): HTMLElement | null;
    findLastListItem(container: HTMLElement, includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean): HTMLElement | null;
    findNextListItem(includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean,
            container?: HTMLElement, focused?: HTMLElement): HTMLElement | null;
    findPrevListItem(includeProgrammaticallyFocusable?: boolean, ignoreLayer?: boolean,
            container?: HTMLElement, focused?: HTMLElement): HTMLElement | null;
    findDefault(container: HTMLElement): HTMLElement | null;
}

export interface ModalityLayerProps extends FocusDeloserProps {
    accessibilityLabel: string;
    onFocusIn?: () => void;
    onFocusOut?: (before: boolean) => boolean;
    othersAccessible?: boolean;
    alwaysAccessible?: boolean;
    noFocusFirst?: boolean;
    noFocusDefault?: boolean;
}

export interface ModalityLayerContainer {
    readonly internalId: string;
    readonly userId: string;
    setup(props: Partial<ModalityLayerProps>): void;
    dispose(): void;
    move(newElement: HTMLElement): void;
    setAccessible(accessible: boolean): void;
    setActive(active: boolean): void;
    isActive(): boolean;
    isOthersAccessible(): boolean;
    isAlwaysAccessible(): boolean;
    isNoFocusFirst(): boolean;
    isNoFocusDefault(): boolean;
    getElement(): HTMLElement;
    setFocused(focused: boolean): void;
    onBeforeFocusOut(): boolean;
}

export interface ModalityLayerRoot {
    readonly id: string;
    dispose(): void;
    move(newElement: HTMLElement): void;
    getElement(): HTMLElement;
    getCurrentLayerId(): string | undefined;
    setCurrentLayerId(id: string | undefined, noLayersUpdate?: boolean): void;
    getLayers(): ModalityLayerContainer[];
    updateLayers(): void;
}

export interface ModalityLayer {
    addRoot(element: HTMLElement): void;
    removeRoot(element: HTMLElement): void;
    moveRoot(from: HTMLElement, to: HTMLElement): void;
    addLayer(element: HTMLElement, id: string, props: ModalityLayerProps): void;
    removeLayer(element: HTMLElement): void;
    moveLayer(from: HTMLElement, to: HTMLElement): void;
    focusLayer(elementFromLayer: HTMLElement, noFocusFirst?: boolean, noFocusDefault?: boolean): boolean;
}

export interface ListProps extends FocusDeloserProps {
    bottomUp?: boolean;
}

export interface ListContainer {
    readonly id: string;
    dispose(): void;
    move(newElement: HTMLElement): void;
    getCurrentItem(): ListItem | undefined;
    setCurrentItem(item: ListItem | undefined): void;
    getElement(): HTMLElement;
}

export interface ListItem {
    readonly id: string;
    dispose(): void;
    move(newElement: HTMLElement): void;
    getElement(): HTMLElement;
}

export interface List {
    add(element: HTMLElement, props?: ListProps): void;
    remove(element: HTMLElement): void;
    move(from: HTMLElement, to: HTMLElement): void;
    addItem(element: HTMLElement): void;
    removeItem(element: HTMLElement): void;
    moveItem(from: HTMLElement, to: HTMLElement): void;
    setActionable(element: HTMLElement, isActionable?: boolean): void;
    setCurrent(context: HTMLElement, element: HTMLElement | undefined): boolean;
}

export interface FocusDeloserOnElement {
    focusDeloser?: FocusDeloserContainer;
}

export interface ModalityLayerRootOnElement {
    modalityRoot?: ModalityLayerRoot;
}

export interface ModalityLayerOnElement {
    modalityLayer?: ModalityLayerContainer;
}

export interface ListOnElement {
    list?: ListContainer;
}

export interface ListItemOnElement {
    listItem?: ListItem;
}

export interface ListActionableOnElement {
    listActionable?: boolean;
}

export interface FocusableOnElement {
    focusable?: {
        default?: boolean;
        ignored?: boolean;
    };
}

export interface OutlineOnElement {
    outline?: { ignored: boolean };
}

export type AbilityHelpersOnElement =
    FocusDeloserOnElement &
    ModalityLayerRootOnElement &
    ModalityLayerOnElement &
    ListOnElement &
    ListItemOnElement &
    ListActionableOnElement &
    FocusableOnElement &
    OutlineOnElement;

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
    getLastFocusedElement(): HTMLElement | undefined;
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

export interface FocusableProps {
    isDefault: boolean;
    isIgnored: boolean;
}

export enum ElementVisibility {
    Invisible = 0,
    Visible = 1,
    PartiallyVisible = 2
}

export interface FocusableGroupState {
    isCurrent: boolean | undefined;
    isPrevious: boolean;
    isNext: boolean;
    isFirst: boolean;
    isLast: boolean;
    isVisible: ElementVisibility;
    hasFocus: boolean;
    siblingHasFocus: boolean;
    isLimited: boolean;
}

export enum FocusableGroupFocusLimit {
    Unlimited = 0,
    Limited = 1, // The focus is limited to the container only and explicit Enter is needed to go inside.
    LimitedTrapFocus = 2 // The focus is limited as above, plus trapped when inside.
}

export enum FocusableGroupNextDirection {
    Both = 0, // Default, both left/up keys move to the previous, right/down move to the next.
    Vertical = 1, // Only up/down arrows move to the next/previous.
    Horizontal = 2, // Only left/right arrows move to the next/previous.
    Grid = 3 // Two-dimentional movement depending on the visual placement.
}

export interface FocusableGroupProps {
    isDefault?: boolean | (() => boolean);
    isLimited?: FocusableGroupFocusLimit;
    nextDirection?: FocusableGroupNextDirection;
    onChange?: (state: FocusableGroupState) => void;
}

export interface FocusableGroupContainerProps {
}

export interface FocusableGroupContainer {
    readonly id: string;
    dispose(): void;
    setProps(props: Partial<FocusableGroupContainerProps> | null): void;
    getProps(): FocusableGroupContainerProps;
    getElement(): HTMLElement;
    addGroup(group: FocusableGroup): void;
    removeGroup(group: FocusableGroup): void;
    setUnlimitedGroup(group: FocusableGroup | undefined): void;
    setFocusedGroup(group: FocusableGroup | undefined): void;
    setCurrentGroup(group: FocusableGroup): void;
    getCurrentGroup(): FocusableGroup | null;
    getGroupState(group: FocusableGroup): FocusableGroupState;
    isEmpty(): boolean;
}

export interface FocusableGroup {
    readonly id: string;
    dispose(): void;
    getElement(): HTMLElement;
    moveTo(newElement: HTMLElement): void;
    getState(): FocusableGroupState;
    makeCurrent(): void;
    isDefault(): boolean;
    getProps(): FocusableGroupProps;
    setProps(props: FocusableGroupProps): void;
    setFocused(focused: boolean): void;
    setUnlimited(unlimited: boolean): void;
    setupContainer(remove?: boolean): void;
}

export interface Focusable {
    addGroup(element: HTMLElement, props: FocusableGroupProps): void;
    removeGroup(element: HTMLElement): void;
    moveGroup(from: HTMLElement, to: HTMLElement): void;
    setGroupProps(element: HTMLElement, props: FocusableGroupProps): void;
    setCurrentGroup(element: HTMLElement): void;
    isInCurrentGroup(element: HTMLElement): boolean;
    findGroup(element: HTMLElement): HTMLElement | null;

    findFirstGroup(context: HTMLElement, ignoreLayer?: boolean): HTMLElement | null;
    findLastGroup(context: HTMLElement, ignoreLayer?: boolean): HTMLElement | null;
    findNextGroup(context: HTMLElement, ignoreLayer?: boolean): HTMLElement | null;
    findPrevGroup(context: HTMLElement, ignoreLayer?: boolean): HTMLElement | null;

    getGroupContainerProps(element: HTMLElement): FocusableGroupContainerProps | null;
    setGroupContainerProps(element: HTMLElement, props: Partial<FocusableGroupContainerProps> | null): void;

    getProps(element: HTMLElement): FocusableProps;
    setProps(element: HTMLElement, props: Partial<FocusableProps> | null): void;

    isFocusable(element: HTMLElement, includeProgrammaticallyFocusable?: boolean, noAccessibleCheck?: boolean): boolean;
    isVisible(element: HTMLElement): boolean;
    isAccessible(element: HTMLElement): boolean;
    findFirst(context?: HTMLElement, includeProgrammaticallyFocusable?: boolean,
        ignoreLayer?: boolean, ignoreGroup?: boolean): HTMLElement | null;
    findLast(context?: HTMLElement, includeProgrammaticallyFocusable?: boolean,
        ignoreLayer?: boolean, ignoreGroup?: boolean): HTMLElement | null;
    findNext(current: HTMLElement, context?: HTMLElement, includeProgrammaticallyFocusable?: boolean,
        ignoreLayer?: boolean, ignoreGroup?: boolean): HTMLElement | null;
    findPrev(current: HTMLElement, context?: HTMLElement, includeProgrammaticallyFocusable?: boolean,
        ignoreLayer?: boolean, ignoreGroup?: boolean): HTMLElement | null;
    findDefault(context?: HTMLElement, includeProgrammaticallyFocusable?: boolean,
        ignoreLayer?: boolean, ignoreGroup?: boolean): HTMLElement | null;
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

export interface FocusDeloserOnElement {
    focusDeloser?: FocusDeloserContainer;
}

export interface ModalityLayerRootOnElement {
    modalityRoot?: ModalityLayerRoot;
}

export interface ModalityLayerOnElement {
    modalityLayer?: ModalityLayerContainer;
}

export interface FocusableOnElement {
    focusable?: FocusableProps;
}

export interface FocusableGroupOnElement {
    focusableGroup?: FocusableGroup;
}

export interface FocusableGroupContainerOnElement {
    focusableGroupContainer?: FocusableGroupContainer;
}

export interface OutlineOnElement {
    outline?: { ignored: boolean };
}

export type AbilityHelpersOnElement =
    FocusDeloserOnElement &
    ModalityLayerRootOnElement &
    ModalityLayerOnElement &
    FocusableOnElement &
    FocusableGroupOnElement &
    FocusableGroupContainerOnElement &
    OutlineOnElement;

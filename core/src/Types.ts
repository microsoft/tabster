/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const AbilityHelpersAttributeName = 'data-ah';

export interface AbilityHelpersDOMAttribute {
    [AbilityHelpersAttributeName]: string | undefined;
}

export interface AbilityHelpers {
    keyboardNavigation: KeyboardNavigationState;
    focusedElement: FocusedElementState;
    outline: OutlineAPI;
    root: RootAPI;
    deloser: DeloserAPI;
    focusable: FocusableAPI;
    modalizer: ModalizerAPI;
    getAttribute: (props: AbilityHelpersAttributeProps | null) => AbilityHelpersDOMAttribute;
}

export type SubscribableCallback<A, B = undefined> = (val: A, details: B) => void;

export interface Subscribable<A, B = undefined> {
    subscribe(callback: SubscribableCallback<A, B>): void;
    unsubscribe(callback: SubscribableCallback<A, B>): void;
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
    getPrevFocusedElement(): HTMLElement | undefined;
    focus(element: HTMLElement, noFocusedProgrammaticallyFlag?: boolean, noAccessibleCheck?: boolean): boolean;
    focusDefault(container: HTMLElement): boolean;
    focusFirst(container: HTMLElement): boolean;
    resetFocus(container: HTMLElement): boolean;
}

export interface OutlineProps {
    areaClass: string;
    outlineClass: string;
    outlineColor: string;
    outlineWidth: number;
    zIndex: number;
}

export interface OutlinedElementProps {
    isIgnored: boolean;
}

export interface OutlineAPI {
    setup(props?: Partial<OutlineProps>): void;
    setProps(element: HTMLElement, props: Partial<OutlinedElementProps> | null): void;
}

export interface DeloserElementActions {
    focusDefault: () => boolean;
    focusFirst: () => boolean;
    resetFocus: () => boolean;
    clearHistory: (preserveExisting?: boolean) => void;
    setSnapshot: (index: number) => void;
    isActive: () => boolean;
}

export interface DeloserBasicProps {
}

export interface DeloserExtendedProps {
    onFocusLost?(last: HTMLElement, actions: DeloserElementActions): boolean;
}

export interface Deloser {
    readonly id: string;
    setProps(basic?: Partial<DeloserBasicProps> | null, extended?: Partial<DeloserExtendedProps> | null): void;
    move(newContainer: HTMLElement): void;
    dispose(): void;
    isActive(): boolean;
    setActive(active: boolean): void;
    getActions(): DeloserElementActions;
    setSnapshot(index: number): void;
    focusFirst(): boolean;
    unshift(element: HTMLElement): void;
    focusDefault(): boolean;
    resetFocus(): boolean;
    findAvailable(): HTMLElement | null;
    clearHistory(preserveExisting?: boolean): void;
    customFocusLostHandler(element: HTMLElement): boolean;
}

export interface DeloserAPI {
    getActions(element: HTMLElement): DeloserElementActions | undefined;
    add(element: HTMLElement, basic?: DeloserBasicProps, props?: DeloserExtendedProps): void;
    remove(element: HTMLElement): void;
    move(from: HTMLElement, to: HTMLElement): void;
    setProps(element: HTMLElement, basic?: Partial<DeloserBasicProps>, extended?: Partial<DeloserExtendedProps>): void;
    pause(): void;
    resume(restore?: boolean): void;
}

export interface FocusableProps {
    isDefault: boolean;
    isIgnored: boolean;
}

export interface FocusableAPI {
    addGroupper(element: HTMLElement, basic?: GroupperBasicProps, extended?: GroupperExtendedProps): void;
    removeGroupper(element: HTMLElement): void;
    moveGroupper(from: HTMLElement, to: HTMLElement): void;
    setGroupperProps(element: HTMLElement, basic?: Partial<GroupperBasicProps> | null,
        extended?: Partial<GroupperExtendedProps> | null): void;
    setCurrentGroupper(element: HTMLElement): void;
    isInCurrentGroupper(element: HTMLElement): boolean | undefined;
    findGroupper(element: HTMLElement): HTMLElement | null;

    findFirstGroupper(context: HTMLElement, ignoreModalizer?: boolean): HTMLElement | null;
    findLastGroupper(context: HTMLElement, ignoreModalizer?: boolean): HTMLElement | null;
    findNextGroupper(context: HTMLElement, ignoreModalizer?: boolean): HTMLElement | null;
    findPrevGroupper(context: HTMLElement, ignoreModalizer?: boolean): HTMLElement | null;

    getProps(element: HTMLElement): FocusableProps;
    setProps(element: HTMLElement, props: Partial<FocusableProps> | null): void;

    isFocusable(element: HTMLElement,
        includeProgrammaticallyFocusable?: boolean, noVisibleCheck?: boolean, noAccessibleCheck?: boolean): boolean;
    isVisible(element: HTMLElement): boolean;
    isAccessible(element: HTMLElement): boolean;
    findFirst(context?: HTMLElement, includeProgrammaticallyFocusable?: boolean,
        ignoreModalizer?: boolean, ignoreGroupper?: boolean): HTMLElement | null;
    findLast(context?: HTMLElement, includeProgrammaticallyFocusable?: boolean,
        ignoreModalizer?: boolean, ignoreGroupper?: boolean): HTMLElement | null;
    findNext(current: HTMLElement, context?: HTMLElement, includeProgrammaticallyFocusable?: boolean,
        ignoreModalizer?: boolean, ignoreGroupper?: boolean): HTMLElement | null;
    findPrev(current: HTMLElement, context?: HTMLElement, includeProgrammaticallyFocusable?: boolean,
        ignoreModalizer?: boolean, ignoreGroupper?: boolean): HTMLElement | null;
    findDefault(context?: HTMLElement, includeProgrammaticallyFocusable?: boolean,
        ignoreModalizer?: boolean, ignoreGroupper?: boolean): HTMLElement | null;
}

export enum ElementVisibility {
    Invisible = 0,
    PartiallyVisible = 1,
    Visible = 2
}

export interface GroupperState {
    isCurrent: boolean | undefined; // Tri-state bool. Undefined when there is no current in the container.
    isPrevious: boolean;
    isNext: boolean;
    isFirst: boolean;
    isLast: boolean;
    isVisible: ElementVisibility;
    hasFocus: boolean;
    siblingIsVisible: boolean;
    siblingHasFocus: boolean;
    isLimited: boolean;
}

export enum GroupperFocusLimit {
    Unlimited = 0,
    Limited = 1, // The focus is limited to the container only and explicit Enter is needed to go inside.
    LimitedTrapFocus = 2 // The focus is limited as above, plus trapped when inside.
}

export enum GroupperNextDirection {
    Both = 0, // Default, both left/up keys move to the previous, right/down move to the next.
    Vertical = 1, // Only up/down arrows move to the next/previous.
    Horizontal = 2, // Only left/right arrows move to the next/previous.
    Grid = 3 // Two-dimentional movement depending on the visual placement.
}

export interface GroupperBasicProps {
    isDefault?: boolean;
    isLimited?: GroupperFocusLimit;
    nextDirection?: GroupperNextDirection;
    memorizeCurrent?: boolean;
    lookupVisibility?: ElementVisibility;
}

export interface GroupperExtendedProps {
    isDefault?: () => boolean;
    onChange?: (state: GroupperState) => void;
}

export interface UberGroupper {
    readonly id: string;
    dispose(): void;
    getElement(): HTMLElement;
    addGroupper(groupper: Groupper): void;
    removeGroupper(groupper: Groupper): void;
    setUnlimitedGroupper(groupper: Groupper | undefined): void;
    setFocusedGroupper(groupper: Groupper | undefined): void;
    setCurrentGroupper(groupper: Groupper): void;
    getCurrentGroupper(): Groupper | null;
    getGroupperState(groupper: Groupper): GroupperState;
    isEmpty(): boolean;
}

export interface Groupper {
    readonly id: string;
    dispose(): void;
    getElement(): HTMLElement;
    moveTo(newElement: HTMLElement): void;
    getState(): GroupperState;
    makeCurrent(): void;
    isDefault(): boolean;
    getBasicProps(): GroupperBasicProps;
    getExtendedProps(): GroupperExtendedProps;
    setProps(basic?: Partial<GroupperBasicProps> | null, extended?: Partial<GroupperExtendedProps> | null): void;
    setFocused(focused: boolean): void;
    setUnlimited(unlimited: boolean): void;
    setupContainer(remove?: boolean): void;
}

export interface ModalizerBasicProps {
    id: string;
    isOthersAccessible?: boolean;
    isAlwaysAccessible?: boolean;
    isNoFocusFirst?: boolean;
    isNoFocusDefault?: boolean;
}

export interface ModalizerExtendedProps {
    onFocusIn?: () => void;
    onFocusOut?: (before: boolean) => boolean;
}

export interface Modalizer {
    readonly internalId: string;
    readonly userId: string;
    setProps(basic?: Partial<ModalizerBasicProps> | null, extended?: Partial<ModalizerExtendedProps> | null): void;
    getBasicProps(): ModalizerBasicProps;
    getExtendedProps(): ModalizerExtendedProps;
    dispose(): void;
    move(newElement: HTMLElement): void;
    setAccessible(accessible: boolean): void;
    setActive(active: boolean): void;
    isActive(): boolean;
    getElement(): HTMLElement;
    setFocused(focused: boolean): void;
    onBeforeFocusOut(): boolean;
}

export interface Root {
    readonly id: string;
    dispose(): void;
    move(newElement: HTMLElement): void;
    getElement(): HTMLElement;
    getCurrentModalizerId(): string | undefined;
    setCurrentModalizerId(id: string | undefined, noModalizersUpdate?: boolean): void;
    getModalizers(): Modalizer[];
    updateModalizers(): void;
}

export interface RootAndModalizer {
    root: Root;
    modalizer?: Modalizer;
}

export interface RootAPI {
    add(element: HTMLElement): void;
    remove(element: HTMLElement): void;
    move(from: HTMLElement, to: HTMLElement): void;
}

export interface ModalizerAPI {
    add(element: HTMLElement, basic: ModalizerBasicProps, extended?: ModalizerExtendedProps): void;
    remove(element: HTMLElement): void;
    move(from: HTMLElement, to: HTMLElement): void;
    setProps(element: HTMLElement, basic?: Partial<ModalizerBasicProps> | null, extended?: Partial<ModalizerExtendedProps> | null): void;
    focus(elementFromModalizer: HTMLElement, noFocusFirst?: boolean, noFocusDefault?: boolean): boolean;
}

export interface DeloserOnElement {
    deloser: Deloser;
}

export interface RootOnElement {
    root: Root;
}

export interface ModalizerOnElement {
    modalizer: Modalizer;
}

export interface FocusableOnElement {
    focusable: FocusableProps;
}

export interface GroupperOnElement {
    groupper: Groupper;
}

export interface UberGroupperOnElement {
    uberGroupper: UberGroupper;
}

export interface OutlineOnElement {
    outline: OutlinedElementProps;
}

export type AbilityHelpersAttributeProps = Partial<{
    deloser: true,
    root: true,
    modalizer: ModalizerBasicProps,
    focusable: FocusableProps,
    groupper: GroupperBasicProps,
    uberGroupper: true,
    outline: OutlinedElementProps
}>;

export interface AbilityHelpersAttributeOnElement {
    string: string;
    object: AbilityHelpersAttributeProps;
    changing: boolean;
}

export interface AbilityHelpersAugmentedAttributes {
    [name: string]: string | null;
}

export type AbilityHelpersOnElement = Partial<
    RootOnElement &
    DeloserOnElement &
    ModalizerOnElement &
    FocusableOnElement &
    GroupperOnElement &
    UberGroupperOnElement &
    OutlineOnElement
>;

export interface OutlineElements {
    container: HTMLDivElement;
    left: HTMLDivElement;
    top: HTMLDivElement;
    right: HTMLDivElement;
    bottom: HTMLDivElement;
}

export interface WindowWithAbilityHelpers extends Window {
    __ah?: {
        helpers: AbilityHelpers,
        mainWindow: Window,
        outlineStyle?: HTMLStyleElement,
        outline?: OutlineElements
    };
}

export interface HTMLElementWithAbilityHelpers extends HTMLElement {
    __ah?: AbilityHelpersOnElement;
}

export interface HTMLElementWithAbilityHelpersAttribute extends HTMLElementWithAbilityHelpers {
    __ahAttr?: AbilityHelpersAttributeOnElement;
}

export interface HTMLElementWithAugmentedAttributes extends HTMLElement {
    __ahAug?: AbilityHelpersAugmentedAttributes;
}

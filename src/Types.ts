/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const TabsterAttributeName = "data-tabster";
export const TabsterDummyInputAttributeName = "data-tabster-dummy";
export const DeloserEventName = "tabster:deloser";
export const ModalizerEventName = "tabster:modalizer";
export const MoverEventName = "tabster:mover";

export interface TabsterEventWithDetails<D> extends Event {
    details: D;
}

export interface TabsterDOMAttribute {
    [TabsterAttributeName]: string | undefined;
}

export interface TabsterCoreProps {
    autoRoot?: RootProps;
    /**
     * Allows all tab key presses under the tabster root to be controlled by tabster
     * @default true
     */
    controlTab?: boolean;
    /**
     * When controlTab is false, Root doesn't have dummy inputs by default.
     * This option allows to enable dummy inputs on Root.
     */
    rootDummyInputs?: boolean;
}

export type GetTabster = () => TabsterCore;
export type GetWindow = () => Window;

export type SubscribableCallback<A, B = undefined> = (
    val: A,
    details: B
) => void;

export interface Disposable {
    /** @internal */
    dispose(): void;
}

export interface Subscribable<A, B = undefined> {
    subscribe(callback: SubscribableCallback<A, B>): void;
    unsubscribe(callback: SubscribableCallback<A, B>): void;
}

export interface KeyboardNavigationState
    extends Subscribable<boolean>,
        Disposable {
    isNavigatingWithKeyboard(): boolean;
}

export interface FocusedElementDetails {
    relatedTarget?: HTMLElement;
    isFocusedProgrammatically?: boolean;
}

export interface FocusedElementState
    extends Subscribable<HTMLElement | undefined, FocusedElementDetails>,
        Disposable {
    getFocusedElement(): HTMLElement | undefined;
    getLastFocusedElement(): HTMLElement | undefined;
    focus(
        element: HTMLElement,
        noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean
    ): boolean;
    focusDefault(container: HTMLElement): boolean;
    focusFirst(props: FindFirstProps): boolean;
    focusLast(props: FindFirstProps): boolean;
    resetFocus(container: HTMLElement): boolean;
}

export interface WeakHTMLElement<D = undefined> {
    get(): HTMLElement | undefined;
    getData(): D | undefined;
}

export interface TabsterPart<P> {
    readonly id: string;
    getElement(): HTMLElement | undefined;
    getProps(): P;
    setProps(props: P): void;
}

export interface ObservedElementProps {
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any;
}

export interface ObservedElementDetails extends ObservedElementProps {
    accessibility?: ObservedElementAccesibility;
}

export interface ObservedElementAccesibilities {
    Any: 0;
    Accessible: 1;
    Focusable: 2;
}
export type ObservedElementAccesibility =
    ObservedElementAccesibilities[keyof ObservedElementAccesibilities];
export const ObservedElementAccesibilities: ObservedElementAccesibilities = {
    Any: 0,
    Accessible: 1,
    Focusable: 2,
};

export interface ObservedElementAsyncRequest<T> {
    result: Promise<T>;
    cancel(): void;
}

interface ObservedElementAPIInternal {
    /** @internal */
    onObservedElementUpdate(element: HTMLElement): void;
}

export interface ObservedElementAPI
    extends Subscribable<HTMLElement, ObservedElementDetails>,
        Disposable,
        ObservedElementAPIInternal {
    getElement(
        observedName: string,
        accessibility?: ObservedElementAccesibility
    ): HTMLElement | null;
    waitElement(
        observedName: string,
        timeout: number,
        accessibility?: ObservedElementAccesibility
    ): ObservedElementAsyncRequest<HTMLElement | null>;
    requestFocus(
        observedName: string,
        timeout: number
    ): ObservedElementAsyncRequest<boolean>;
}

export interface CrossOriginElement {
    readonly uid: string;
    readonly ownerId: string;
    readonly id?: string;
    readonly rootId?: string;
    readonly observedName?: string;
    readonly observedDetails?: string;
    focus(
        noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean
    ): Promise<boolean>;
}

export interface CrossOriginSentTo {
    [id: string]: true;
}

export interface CrossOriginTransactionTypes {
    Bootstrap: 1;
    FocusElement: 2;
    State: 3;
    GetElement: 4;
    RestoreFocusInDeloser: 5;
    Ping: 6;
}
export type CrossOriginTransactionType =
    CrossOriginTransactionTypes[keyof CrossOriginTransactionTypes];

export interface CrossOriginTransactionData<I, O> {
    transaction: string;
    type: CrossOriginTransactionType;
    isResponse: boolean;
    timestamp: number;
    owner: string;
    sentto: CrossOriginSentTo;
    timeout?: number;
    target?: string;
    beginData?: I;
    endData?: O;
}

export type CrossOriginTransactionSend = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: CrossOriginTransactionData<any, any>
) => void;

export interface CrossOriginMessage {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: CrossOriginTransactionData<any, any>;
    send: CrossOriginTransactionSend;
}

export interface CrossOriginFocusedElementState
    extends Subscribable<CrossOriginElement | undefined, FocusedElementDetails>,
        Disposable {
    focus(
        element: CrossOriginElement,
        noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean
    ): Promise<boolean>;
    focusById(
        elementId: string,
        rootId?: string,
        noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean
    ): Promise<boolean>;
    focusByObservedName(
        observedName: string,
        timeout?: number,
        rootId?: string,
        noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean
    ): Promise<boolean>;
}

export interface CrossOriginObservedElementState
    extends Subscribable<CrossOriginElement, ObservedElementProps>,
        Disposable {
    getElement(
        observedName: string,
        accessibility?: ObservedElementAccesibility
    ): Promise<CrossOriginElement | null>;
    waitElement(
        observedName: string,
        timeout: number,
        accessibility?: ObservedElementAccesibility
    ): Promise<CrossOriginElement | null>;
    requestFocus(observedName: string, timeout: number): Promise<boolean>;
}

export interface CrossOriginAPI {
    focusedElement: CrossOriginFocusedElementState;
    observedElement: CrossOriginObservedElementState;

    setup(
        sendUp?: CrossOriginTransactionSend | null
    ): (msg: CrossOriginMessage) => void;
    isSetUp(): boolean;
    dispose(): void;
}

export interface OutlineProps {
    areaClass: string;
    outlineClass: string;
    outlineColor: string;
    outlineWidth: number;
    zIndex: number;
}

export interface OutlinedElementProps {
    isIgnored?: boolean;
}

export interface OutlineAPI extends Disposable {
    setup(props?: Partial<OutlineProps>): void;
}

export interface DeloserElementActions {
    focusDefault: () => boolean;
    focusFirst: () => boolean;
    resetFocus: () => boolean;
    clearHistory: (preserveExisting?: boolean) => void;
    setSnapshot: (index: number) => void;
    isActive: () => boolean;
}

export interface RestoreFocusOrders {
    History: 0;
    DeloserDefault: 1;
    RootDefault: 2;
    DeloserFirst: 3;
    RootFirst: 4;
}
export type RestoreFocusOrder = RestoreFocusOrders[keyof RestoreFocusOrders];
export const RestoreFocusOrders: RestoreFocusOrders = {
    History: 0,
    DeloserDefault: 1,
    RootDefault: 2,
    DeloserFirst: 3,
    RootFirst: 4,
};

export interface DeloserProps {
    restoreFocusOrder?: RestoreFocusOrder;
    noSelectorCheck?: boolean;
}

export interface Deloser extends TabsterPart<DeloserProps> {
    readonly uid: string;
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

export type DeloserConstructor = (
    element: HTMLElement,
    props: DeloserProps
) => Deloser;

interface DeloserInterfaceInternal {
    /** @internal */
    createDeloser(element: HTMLElement, props: DeloserProps): Deloser;
}

export interface DeloserAPI extends DeloserInterfaceInternal, Disposable {
    getActions(element: HTMLElement): DeloserElementActions | undefined;
    pause(): void;
    resume(restore?: boolean): void;
}

export interface FocusableProps {
    isDefault?: boolean;
    isIgnored?: boolean;
    /**
     * Do not determine an element's focusability based on aria-disabled.
     */
    ignoreAriaDisabled?: boolean;
    /**
     * Exclude element (and all subelements) from Mover navigation.
     */
    excludeFromMover?: boolean;
}

export interface FocusableAcceptElementState {
    container: HTMLElement;
    currentCtx?: TabsterContext;
    from: HTMLElement | null;
    fromCtx?: TabsterContext;
    isForward: boolean;
    found?: boolean;
    foundElement?: HTMLElement;
    nextUncontrolled?: HTMLElement;
    nextGroupper?: HTMLElement;
    nextMover?: HTMLElement;
    acceptCondition: (el: HTMLElement) => boolean;
    includeProgrammaticallyFocusable?: boolean;
    ignoreGroupper?: boolean;
    ignoreUncontrolled?: boolean;
    ignoreAccessibiliy?: boolean;
    grouppers: {
        [id: string]: {
            isActive: boolean | undefined;
            isInside: boolean;
            first?: HTMLElement | null;
        };
    };
    isFindAll?: boolean;
}

export interface FindFocusableProps {
    /**
     * The container used for the search
     */
    container?: HTMLElement;
    /**
     * The elemet to start from
     */
    currentElement?: HTMLElement;
    /**
     * includes elements that can be focused programmatically
     */
    includeProgrammaticallyFocusable?: boolean;
    ignoreGroupper?: boolean;
    /**
     * Ignore uncontrolled areas.
     */
    ignoreUncontrolled?: boolean;
    /**
     * Ignore accessibility check.
     */
    ignoreAccessibiliy?: boolean;
    prev?: boolean;
    /**
     * @param el element visited
     * @returns if an element should be accepted
     */
    acceptCondition?(el: HTMLElement): boolean;
    /**
     * A callback that will be called if an uncontrolled area is met.
     * @param el uncontrolled element.
     */
    onUncontrolled?(el: HTMLElement): void;
}

export type FindFirstProps = Pick<
    FindFocusableProps,
    | "container"
    | "includeProgrammaticallyFocusable"
    | "ignoreGroupper"
    | "ignoreUncontrolled"
    | "ignoreAccessibiliy"
>;

export type FindNextProps = Pick<
    FindFocusableProps,
    | "currentElement"
    | "container"
    | "includeProgrammaticallyFocusable"
    | "ignoreGroupper"
    | "ignoreUncontrolled"
    | "ignoreAccessibiliy"
    | "onUncontrolled"
>;

export type FindDefaultProps = Pick<
    FindFocusableProps,
    | "container"
    | "includeProgrammaticallyFocusable"
    | "ignoreGroupper"
    | "ignoreAccessibiliy"
>;

export type FindAllProps = Pick<
    FindFocusableProps,
    | "container"
    | "includeProgrammaticallyFocusable"
    | "ignoreGroupper"
    | "acceptCondition"
    | "ignoreUncontrolled"
    | "ignoreAccessibiliy"
> & { container: HTMLElement; skipDefaultCheck?: boolean };

export interface FocusableAPI extends Disposable {
    getProps(element: HTMLElement): FocusableProps;

    isFocusable(
        element: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        noVisibleCheck?: boolean,
        noAccessibleCheck?: boolean
    ): boolean;
    isVisible(element: HTMLElement): boolean;
    isAccessible(element: HTMLElement): boolean;
    // find* return null when there is no element and undefined when there is an uncontrolled area.
    findFirst(options: FindFirstProps): HTMLElement | null | undefined;
    findLast(options: FindFirstProps): HTMLElement | null | undefined;
    findNext(options: FindNextProps): HTMLElement | null | undefined;
    findPrev(options: FindNextProps): HTMLElement | null | undefined;
    findDefault(options: FindDefaultProps): HTMLElement | null;
    /**
     * @returns All focusables in a given context that satisfy an given condition
     */
    findAll(options: FindAllProps): HTMLElement[];
    findElement(options: FindFocusableProps): HTMLElement | null | undefined;
}

export interface DummyInputManager {
    moveOutWithDefaultAction: (backwards: boolean) => void;
}

export interface Visibilities {
    Invisible: 0;
    PartiallyVisible: 1;
    Visible: 2;
}
export const Visibilities: Visibilities = {
    Invisible: 0,
    PartiallyVisible: 1,
    Visible: 2,
};
export type Visibility = Visibilities[keyof Visibilities];

export interface MoverElementState {
    isCurrent: boolean | undefined; // Tri-state bool. Undefined when there is no current in the container.
    visibility: Visibility;
}

export interface MoverDirections {
    Both: 0; // Default, both left/up keys move to the previous, right/down move to the next.
    Vertical: 1; // Only up/down arrows move to the next/previous.
    Horizontal: 2; // Only left/right arrows move to the next/previous.
    Grid: 3; // Two-dimentional movement depending on the visual placement.
}
export const MoverDirections: MoverDirections = {
    Both: 0,
    Vertical: 1,
    Horizontal: 2,
    Grid: 3,
};
export type MoverDirection = MoverDirections[keyof MoverDirections];

export type NextTabbable = {
    element: HTMLElement | null | undefined;
    uncontrolled?: HTMLElement;
};

export interface MoverProps {
    direction?: MoverDirection;
    memorizeCurrent?: boolean;
    tabbable?: boolean;
    /**
     * Whether to allow cyclic navigation in the mover
     * Can only be applied if navigationType is MoverKeys.Arrows
     *
     * @defaultValue false
     */
    cyclic?: boolean;
    /**
     * In case we need a rich state of the elements inside a Mover,
     * we can track it. It takes extra resourses and might affect
     * performance when a Mover has many elements inside, so make sure
     * you use this prop when it is really needed.
     */
    trackState?: boolean;
    /**
     * When set to Visibility.Visible or Visibility.PartiallyVisible,
     * uses the visibility part of the trackState prop to be able to
     * go to first/last visible element (instead of first/last focusable
     * element in DOM) when tabbing from outside of the mover.
     */
    visibilityAware?: Visibility;
    disableHomeEndKeys?: boolean;
}

export type MoverEvent = TabsterEventWithDetails<MoverElementState>;

export interface Mover extends TabsterPart<MoverProps> {
    readonly id: string;
    readonly dummyManager: DummyInputManager | undefined;
    dispose(): void;
    setCurrent(element: HTMLElement | undefined): boolean;
    getCurrent(): HTMLElement | null;
    getState(element: HTMLElement): MoverElementState | undefined;
    findNextTabbable(current: HTMLElement, prev?: boolean): NextTabbable | null;
    acceptElement(
        element: HTMLElement,
        state: FocusableAcceptElementState
    ): number | undefined;
}

export type MoverConstructor = (
    tabster: TabsterCore,
    element: HTMLElement,
    props: MoverProps
) => Mover;

interface MoverAPIInternal {
    /** @internal */
    createMover(element: HTMLElement, props: MoverProps): Mover;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MoverAPI extends MoverAPIInternal, Disposable {}

export interface GroupperTabbabilities {
    Unlimited: 0;
    Limited: 1; // The tabbability is limited to the container (or first element if container is not focusable)
    // and explicit Enter is needed to go inside.
    LimitedTrapFocus: 2; // The focus is limited as above, plus trapped when inside.
}
export const GroupperTabbabilities: GroupperTabbabilities = {
    Unlimited: 0,
    Limited: 1,
    LimitedTrapFocus: 2,
};
export type GroupperTabbability =
    GroupperTabbabilities[keyof GroupperTabbabilities];

export interface GroupperProps {
    tabbability?: GroupperTabbability;
}

export interface Groupper extends TabsterPart<GroupperProps> {
    readonly id: string;
    readonly dummyManager: DummyInputManager | undefined;
    dispose(): void;
    makeTabbable(isUnlimited: boolean): void;
    shouldTabInside(): boolean;
    isActive(): boolean | undefined; // Tri-state boolean, undefined when parent is not active, false when parent is active.
    setFirst(element: HTMLElement | undefined): void;
    getFirst(): HTMLElement | undefined;
    findNextTabbable(current: HTMLElement, prev?: boolean): NextTabbable | null;
    acceptElement(
        element: HTMLElement,
        state: FocusableAcceptElementState
    ): number | undefined;
}

export type GroupperConstructor = (
    tabster: TabsterCore,
    element: HTMLElement,
    props: GroupperProps
) => Groupper;

export interface GroupperAPIInternal {
    /** @internal */
    createGroupper(element: HTMLElement, props: GroupperProps): Groupper;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GroupperAPI extends GroupperAPIInternal, Disposable {}

export interface GroupperAPIInternal {
    forgetCurrentGrouppers(): void;
}

export interface ModalizerProps {
    id: string;
    isOthersAccessible?: boolean;
    isAlwaysAccessible?: boolean;
    isNoFocusFirst?: boolean;
    isNoFocusDefault?: boolean;
    /** A focus trap variant, keeps focus inside the modal when tabbing */
    isTrapped?: boolean;
}

export type ModalizerEventDetails = { eventName: "beforefocusout" };

export type ModalizerEvent = TabsterEventWithDetails<ModalizerEventDetails>;

export interface Modalizer extends TabsterPart<ModalizerProps> {
    readonly internalId: string;
    readonly userId: string;
    /**
     * @returns - Whether the element is inside the modalizer
     */
    contains(element: HTMLElement): boolean;
    dispose(): void;
    isActive(): boolean;
    onBeforeFocusOut(): boolean;
    /**
     * Sets the active state of the modalizr
     * When active, sets `aria-hidden` on all other elements
     * Reverts `aria-hidden` changes when set to inactive
     *
     * @param active Whether the modalizer is active
     */
    setActive(active: boolean): void;
}

export type ModalizerConstructor = (
    tabster: TabsterCore,
    element: HTMLElement,
    props: ModalizerProps
) => Modalizer;

export interface RootProps {
    restoreFocusOrder?: RestoreFocusOrder;
}

export interface Root extends TabsterPart<RootProps> {
    readonly uid: string;
    dispose(): void;
    moveOutWithDefaultAction(backwards: boolean): void;
}

export type RootConstructor = (
    tabster: TabsterCore,
    element: HTMLElement,
    props: RootProps
) => Root;

export interface GetTabsterContextOptions {
    /**
     * Should visit **all** element ancestors to verify if `dir='rtl'` is set
     */
    checkRtl?: boolean;
    /**
     * Return all grouppers and movers walking up the DOM from the context element.
     */
    allMoversGrouppers?: boolean;
}

export type TabsterContextMoverGroupper =
    | { isMover: true; mover: Mover }
    | { isMover: false; groupper: Groupper };

export interface TabsterContext {
    root: Root;
    modalizer?: Modalizer;
    groupper?: Groupper;
    mover?: Mover;
    isGroupperFirst?: boolean;
    /**
     * Whether `dir='rtl'` is set on an ancestor
     */
    isRtl?: boolean;
    /**
     * The uncontrolled container of this element (if any).
     */
    uncontrolled?: HTMLElement;
    allMoversGrouppers?: {
        moverCount: number;
        groupperCount: number;
        instances: TabsterContextMoverGroupper[];
    };
    isExcludedFromMover?: boolean;
}

export interface RootFocusEventDetails {
    element: HTMLElement;
    fromAdjacent?: boolean;
}

interface RootAPIInternal {
    /**@internal*/
    createRoot(element: HTMLElement, props: RootProps): Root;
    /**@internal*/
    onRoot(root: Root, removed?: boolean): void;
}

export interface RootAPI extends Disposable, RootAPIInternal {
    eventTarget: EventTarget;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UncontrolledAPI {}

interface ModalizerAPIInternal {
    /** @internal */
    createModalizer(element: HTMLElement, props: ModalizerProps): Modalizer;
    /** @internal */
    updateModalizer: (modalizer: Modalizer, removed?: boolean) => void;
}

export interface ModalizerAPI extends ModalizerAPIInternal, Disposable {
    /**
     * Activates a Modalizer and focuses the first or default element within
     *
     * @param elementFromModalizer An element that belongs to a Modalizer
     * @param noFocusFirst Do not focus on the first element in the Modalizer
     * @param noFocusDefault Do not focus the default element in the Modalizre
     */
    focus(
        elementFromModalizer: HTMLElement,
        noFocusFirst?: boolean,
        noFocusDefault?: boolean
    ): boolean;
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

export interface MoverOnElement {
    mover: Mover;
}

export interface GroupperOnElement {
    groupper: Groupper;
}

export interface UncontrolledOnElement {
    uncontrolled: Record<string, never>;
}

export interface ObservedOnElement {
    observed: ObservedElementProps;
}

export interface OutlineOnElement {
    outline: OutlinedElementProps;
}

export type TabsterAttributeProps = Partial<{
    deloser: DeloserProps;
    root: RootProps;
    uncontrolled: UncontrolledOnElement["uncontrolled"];
    modalizer: ModalizerProps;
    focusable: FocusableProps;
    groupper: GroupperProps;
    mover: MoverProps;
    observed: ObservedElementProps;
    outline: OutlinedElementProps;
}>;

export interface TabsterAttributeOnElement {
    string: string;
    object: TabsterAttributeProps;
}

export interface TabsterAugmentedAttributes {
    [name: string]: string | null;
}

export type TabsterOnElement = Partial<
    RootOnElement &
        DeloserOnElement &
        ModalizerOnElement &
        FocusableOnElement &
        MoverOnElement &
        GroupperOnElement &
        ObservedOnElement &
        OutlineOnElement &
        UncontrolledOnElement
>;

export interface OutlineElements {
    container: HTMLDivElement;
    left: HTMLDivElement;
    top: HTMLDivElement;
    right: HTMLDivElement;
    bottom: HTMLDivElement;
}

export interface TabsterElementStorageEntry {
    tabster?: TabsterOnElement;
    attr?: TabsterAttributeOnElement;
    aug?: TabsterAugmentedAttributes;
}

export interface TabsterElementStorage {
    [uid: string]: TabsterElementStorageEntry;
}

export type DisposeFunc = () => void;

export interface InternalAPI {
    stopObserver(): void;
    resumeObserver(syncState: boolean): void;
}

interface TabsterCoreInternal {
    /** @internal */
    groupper?: GroupperAPI;
    /** @internal */
    mover?: MoverAPI;
    /** @internal */
    outline?: OutlineAPI;
    /** @internal */
    deloser?: DeloserAPI;
    /** @internal */
    modalizer?: ModalizerAPI;
    /** @internal */
    observedElement?: ObservedElementAPI;
    /** @internal */
    crossOrigin?: CrossOriginAPI;
    /** @internal */
    internal: InternalAPI;

    // The version of the tabster package this instance is on
    /** @internal */
    _version: string;

    // No operation flag for the debugging purposes
    /** @internal */
    _noop: boolean;

    /** @internal */
    storageEntry(
        element: HTMLElement,
        addremove?: boolean
    ): TabsterElementStorageEntry | undefined;
    /** @internal */
    getWindow: GetWindow;

    /** @internal */
    createTabster(): Tabster;
    /** @internal */
    disposeTabster(wrapper: Tabster): void;
    /** @internal */
    forceCleanup(): void;
}

export interface Tabster extends Disposable {
    keyboardNavigation: KeyboardNavigationState;
    focusedElement: FocusedElementState;
    focusable: FocusableAPI;
    root: RootAPI;
    uncontrolled: UncontrolledAPI;

    /** @internal */
    core: TabsterCore;
}

export interface TabsterCore
    extends Pick<TabsterCoreProps, "controlTab" | "rootDummyInputs">,
        Disposable,
        TabsterCoreInternal,
        Omit<Tabster, "core"> {}

export interface TabsterCompat {
    attributeTransform?: <P>(old: P) => TabsterAttributeProps;
}

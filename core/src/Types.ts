/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const TabsterAttributeName = 'data-tabster';

export interface InternalBasics {
    Promise?: PromiseConstructor;
    WeakRef?: WeakRefConstructor;
}

export interface TabsterDOMAttribute {
    [TabsterAttributeName]: string | undefined;
}

export interface TabsterCoreProps {
    autoRoot?: RootBasicProps;
}

export interface TabsterCore {
    keyboardNavigation: KeyboardNavigationState;
    focusedElement: FocusedElementState;
    focusable: FocusableAPI;
    root: RootAPI;
}

export type GetTabster = () => TabsterCore;
export type GetWindow = () => Window;

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
    focus(element: HTMLElement, noFocusedProgrammaticallyFlag?: boolean, noAccessibleCheck?: boolean): boolean;
    focusDefault(container: HTMLElement): boolean;
    focusFirst(container: HTMLElement): boolean;
    resetFocus(container: HTMLElement): boolean;
}

export interface WeakHTMLElement<D = undefined> {
    get(): HTMLElement | undefined;
    getData(): D | undefined;
}

export interface TabsterPart<B, E> {
    readonly id: string;
    getElement(): HTMLElement | undefined;
    getBasicProps(): Partial<B>;
    getExtendedProps(): Partial<E>;
    setProps(basic?: Partial<B> | null, extended?: Partial<E> | null): void;
}

export interface ObservedElementBasicProps {
    name: string;
    details?: any;
}

export interface ObservedElementExtendedProps {
}

export interface ObservedElementAccesibilities {
    Any: 0;
    Accessible: 1;
    Focusable: 2;
}
export type ObservedElementAccesibility = ObservedElementAccesibilities[keyof ObservedElementAccesibilities];
export const ObservedElementAccesibilities: ObservedElementAccesibilities = {
    Any: 0,
    Accessible: 1,
    Focusable: 2
};

export interface ObservedElementAPI extends Subscribable<HTMLElement, ObservedElementBasicProps> {
    add(element: HTMLElement, basic?: ObservedElementBasicProps, extended?: ObservedElementExtendedProps): void;
    remove(element: HTMLElement): void;
    move(from: HTMLElement, to: HTMLElement): void;
    setProps(element: HTMLElement, basic?: Partial<ObservedElementBasicProps>, extended?: Partial<ObservedElementExtendedProps>): void;
    getElement(observedName: string, accessibility?: ObservedElementAccesibility): HTMLElement | null;
    waitElement(observedName: string, timeout: number, accessibility?: ObservedElementAccesibility): Promise<HTMLElement | null>;
    requestFocus(observedName: string, timeout: number): Promise<boolean>;
}

export interface CrossOriginElement {
    readonly uid: string;
    readonly ownerId: string;
    readonly id?: string;
    readonly rootId?: string;
    readonly observedName?: string;
    readonly observedDetails?: string;
    focus(noFocusedProgrammaticallyFlag?: boolean, noAccessibleCheck?: boolean): Promise<boolean>;
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
export type CrossOriginTransactionType = CrossOriginTransactionTypes[keyof CrossOriginTransactionTypes];

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

export type CrossOriginTransactionSend = (data: CrossOriginTransactionData<any, any>) => void;

export interface CrossOriginMessage {
    data: CrossOriginTransactionData<any, any>;
    send: CrossOriginTransactionSend;
}

export interface CrossOriginFocusedElementState extends Subscribable<CrossOriginElement | undefined, FocusedElementDetails> {
    focus(element: CrossOriginElement, noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean): Promise<boolean>;
    focusById(elementId: string, rootId?: string, noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean): Promise<boolean>;
    focusByObservedName(observedName: string, timeout?: number, rootId?: string, noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean): Promise<boolean>;
}

export interface CrossOriginObservedElementState extends Subscribable<CrossOriginElement, ObservedElementBasicProps> {
    getElement(observedName: string, accessibility?: ObservedElementAccesibility): Promise<CrossOriginElement | null>;
    waitElement(observedName: string, timeout: number, accessibility?: ObservedElementAccesibility): Promise<CrossOriginElement | null>;
    requestFocus(observedName: string, timeout: number): Promise<boolean>;
}

export interface CrossOriginAPI {
    focusedElement: CrossOriginFocusedElementState;
    observedElement: CrossOriginObservedElementState;

    setup(sendUp?: CrossOriginTransactionSend | null): (msg: CrossOriginMessage) => void;
    isSetUp(): boolean;
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
    RootFirst: 4
};

export interface DeloserBasicProps {
    restoreFocusOrder?: RestoreFocusOrder;
    noSelectorCheck?: boolean;
}

export interface DeloserExtendedProps {
    onFocusLost?(last: HTMLElement, actions: DeloserElementActions): boolean;
}

export interface Deloser {
    readonly uid: string;
    setProps(basic?: Partial<DeloserBasicProps> | null, extended?: Partial<DeloserExtendedProps> | null): void;
    getBasicProps(): DeloserBasicProps;
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
    getElement(): HTMLElement | undefined;
}

export interface DeloserAPI {
    getActions(element: HTMLElement): DeloserElementActions | undefined;
    add(element: HTMLElement, basic?: DeloserBasicProps, extended?: DeloserExtendedProps): void;
    remove(element: HTMLElement): void;
    move(from: HTMLElement, to: HTMLElement): void;
    setProps(element: HTMLElement, basic?: Partial<DeloserBasicProps>, extended?: Partial<DeloserExtendedProps>): void;
    pause(): void;
    resume(restore?: boolean): void;
}

export interface FocusableProps {
    isDefault?: boolean;
    isIgnored?: boolean;
    /**
     * Do not determine an element's focusability based on aria-disabled
     */
    ignoreAriaDisabled?: boolean;
}

export interface FocusableAcceptElementState {
    container: HTMLElement;
    from: HTMLElement | null;
    isForward: boolean;
    found?: HTMLElement;
    acceptCondition: (el: HTMLElement) => boolean;
    includeProgrammaticallyFocusable?: boolean;
    ignoreGroupper?: boolean;
    grouppers: {
        [id: string]: {
            isActive: boolean | undefined,
            isInside: boolean,
            first?: HTMLElement | null
        }
    };
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
    prev?: boolean;
    /**
     * @param el element visited
     * @returns if an element should be accepted
     */
    acceptCondition?(el: HTMLElement): boolean;
}

export interface FocusableAPI {
    getProps(element: HTMLElement): FocusableProps;
    setProps(element: HTMLElement, props: Partial<FocusableProps> | null): void;

    isFocusable(element: HTMLElement,
        includeProgrammaticallyFocusable?: boolean, noVisibleCheck?: boolean, noAccessibleCheck?: boolean): boolean;
    isVisible(element: HTMLElement): boolean;
    isAccessible(element: HTMLElement): boolean;
    findFirst(
        options: Pick<
            FindFocusableProps,
            'container' | 'includeProgrammaticallyFocusable' | 'ignoreGroupper'
        >
    ): HTMLElement | null;
    findLast(
        options: Pick<
            FindFocusableProps,
            'container' | 'includeProgrammaticallyFocusable' | 'ignoreGroupper'
        >
    ): HTMLElement | null;
    findNext(
        options: Pick<
            FindFocusableProps,
            | 'currentElement'
            | 'container'
            | 'includeProgrammaticallyFocusable'
            | 'ignoreGroupper'
        >
    ): HTMLElement | null;
    findPrev(
        options: Pick<
            FindFocusableProps,
            | 'currentElement'
            | 'container'
            | 'includeProgrammaticallyFocusable'
            | 'ignoreGroupper'
        >
    ): HTMLElement | null;
    findDefault(
        options: Pick<
            FindFocusableProps,
            'container' | 'includeProgrammaticallyFocusable' | 'ignoreGroupper'
        >
    ): HTMLElement | null;
    /**
     * @returns All focusables in a given context that satisfy an given condition
     */
    findAll(
        options:
            | Pick<
                  FindFocusableProps,
                  | 'container'
                  | 'includeProgrammaticallyFocusable'
                  | 'ignoreGroupper'
                  | 'acceptCondition'
              >
            | { skipDefaultCheck?: boolean }
    ): HTMLElement[];
    findElement(options: FindFocusableProps): HTMLElement | null;
}

export interface Visibilities {
    Invisible: 0;
    PartiallyVisible: 1;
    Visible: 2;
}
export const Visibilities: Visibilities = {
    Invisible: 0,
    PartiallyVisible: 1,
    Visible: 2
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
    Grid: 3
};
export type MoverDirection = MoverDirections[keyof MoverDirections];

export interface MoverBasicProps {
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

export interface MoverExtendedProps {
    onChange?: (element: HTMLElement, state: MoverElementState) => void;
}

export interface NextTabbable {
    element: HTMLElement;
    callback?: () => void;
}

export interface Mover extends TabsterPart<MoverBasicProps, MoverExtendedProps> {
    readonly id: string;
    dispose(): void;
    setCurrent(element: HTMLElement | undefined): boolean;
    getCurrent(): HTMLElement | null;
    getState(element: HTMLElement): MoverElementState | undefined;
    forceUpdate(): void;
    findNextTabbable(current: HTMLElement, prev?: boolean): NextTabbable | null;
    acceptElement(element: HTMLElement, state: FocusableAcceptElementState): number | undefined;
}

export interface MoverAPI {
    add(element: HTMLElement, basic?: MoverBasicProps, extended?: MoverExtendedProps): void;
    remove(element: HTMLElement): void;
    setProps(element: HTMLElement, basic?: Partial<MoverBasicProps> | null,
        extended?: Partial<MoverExtendedProps> | null): void;
}

export interface GroupperTabbabilities {
    Unlimited: 0;
    Limited: 1; // The tabbability is limited to the container (or first element if container is not focusable)
                // and explicit Enter is needed to go inside.
    LimitedTrapFocus: 2; // The focus is limited as above, plus trapped when inside.
}
export const GroupperTabbabilities: GroupperTabbabilities = {
    Unlimited: 0,
    Limited: 1,
    LimitedTrapFocus: 2
};
export type GroupperTabbability = GroupperTabbabilities[keyof GroupperTabbabilities];

export interface GroupperBasicProps {
    tabbability?: GroupperTabbability;
}

export interface GroupperExtendedProps {}

export interface Groupper extends TabsterPart<GroupperBasicProps, GroupperExtendedProps> {
    readonly id: string;
    dispose(): void;
    makeUnlimited(isUnlimited: boolean): void;
    isUnlimited(): boolean;
    isActive(): boolean | undefined; // Tri-state boolean, undefined when parent is not active, false when parent is active.
    findNextTabbable(current: HTMLElement, prev?: boolean): NextTabbable | null;
    acceptElement(element: HTMLElement, state: FocusableAcceptElementState): number | undefined;
}

export interface GroupperAPI {
    add(element: HTMLElement, basic?: GroupperBasicProps, extended?: GroupperExtendedProps): void;
    remove(element: HTMLElement): void;
    setProps(element: HTMLElement, basic?: Partial<GroupperBasicProps> | null,
        extended?: Partial<GroupperExtendedProps> | null): void;
}

export interface GroupperInternalAPI {
    forgetUnlimitedGrouppers(): void;
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
    /**
     * @returns - Whether the element is inside the modalizer
     */
    contains(element: HTMLElement): boolean;
    dispose(): void;
    getBasicProps(): ModalizerBasicProps;
    /**
     * @returns The root element of the modal
     */
    getModalizerRoot(): HTMLElement | undefined;
    getExtendedProps(): ModalizerExtendedProps;
    isActive(): boolean;
    move(newElement: HTMLElement): void;
    onBeforeFocusOut(): boolean;
    /**
     * Sets the active state of the modalizr
     * When active, sets `aria-hidden` on all other elements
     * Reverts `aria-hidden` changes when set to inactive
     *
     * @param active Whether the modalizer is active
     */
    setActive(active: boolean): void;
    setFocused(focused: boolean): void;
    setProps(basic?: Partial<ModalizerBasicProps> | null, extended?: Partial<ModalizerExtendedProps> | null): void;
}

export interface RootBasicProps {
    restoreFocusOrder?: RestoreFocusOrder;
}

export interface Root {
    readonly uid: string;
    dispose(): void;
    setProps(basic?: Partial<RootBasicProps> | null): void;
    getBasicProps(): RootBasicProps;
    getElement(): HTMLElement | undefined;
    updateDummyInputs(): void;
    moveOutWithDefaultAction(backwards: boolean): void;
}

export interface GetTabsterContextOptions {
    /**
     * Should visit **all** element ancestors to verify if `dir='rtl'` is set
     */
    checkRtl?: boolean;

    getAllGrouppersAndMovers?: boolean;
}

export interface TabsterContextGroupper {
    isGroupper: true;
    groupper: Groupper;
}

export interface TabsterContextMover {
    isGroupper: false;
    mover: Mover;
}

export interface TabsterContext {
    root: Root;
    modalizer?: Modalizer;
    groupper?: Groupper;
    mover?: Mover;
    isGroupperFirst?: boolean;
    allGrouppersAndMovers?: (TabsterContextGroupper | TabsterContextMover)[];
    /**
     * Whether `dir='rtl'` is set on an ancestor
     */
    isRtl?: boolean;
}

export interface RootAPI {
    add(element: HTMLElement, basic?: RootBasicProps): void;
    remove(element: HTMLElement): void;
    setProps(element: HTMLElement, basic?: Partial<RootBasicProps> | null): void;
}

export interface ModalizerAPI {
    /**
     * Adds an element to be managed by Modalizer
     *
     * @param element Element that is not managed by Modalizer
     * @param basic Basic props
     * @param extended Extended props
     */
    add(element: HTMLElement, basic: ModalizerBasicProps, extended?: ModalizerExtendedProps): void;
    /**
     * Gets the currently active modalizer if it exists
     */
    getActiveModalizer(): Modalizer | undefined;
    /**
     * Stops managing an element with Modalizer. Should be called before the element is removed from DOM.
     *
     * @param element Element that is managed by Modalizer
     */
    remove(element: HTMLElement): void;
    move(from: HTMLElement, to: HTMLElement): void;
    setProps(element: HTMLElement, basic?: Partial<ModalizerBasicProps> | null, extended?: Partial<ModalizerExtendedProps> | null): void;
    /**
     * Activates a Modalizer and focuses the first or default element within
     *
     * @param elementFromModalizer An element that belongs to a Modalizer
     * @param noFocusFirst Do not focus on the first element in the Modalizer
     * @param noFocusDefault Do not focus the default element in the Modalizre
     */
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

export interface MoverOnElement {
    mover: Mover;
}

export interface GroupperOnElement {
    groupper: Groupper;
}

export interface ObservedOnElement {
    observed: ObservedElementBasicProps & ObservedElementExtendedProps;
}

export interface OutlineOnElement {
    outline: OutlinedElementProps;
}

export type TabsterAttributeProps = Partial<{
    deloser: DeloserBasicProps,
    root: RootBasicProps,
    modalizer: ModalizerBasicProps,
    focusable: FocusableProps,
    groupper: GroupperBasicProps,
    mover: MoverBasicProps,
    observed: ObservedElementBasicProps,
    outline: OutlinedElementProps
}>;

export interface TabsterAttributeOnElement {
    string: string;
    object: TabsterAttributeProps;
    changing: boolean;
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
    OutlineOnElement
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

export interface TabsterInternal {
    storageEntry(uid: string, addremove?: boolean): TabsterElementStorageEntry | undefined;
    getWindow: GetWindow;

    groupper?: GroupperAPI;
    mover?: MoverAPI;
    outline?: OutlineAPI;
    deloser?: DeloserAPI;
    modalizer?: ModalizerAPI;
    observedElement?: ObservedElementAPI;
    crossOrigin?: CrossOriginAPI;

    groupperDispose?: DisposeFunc;
    moverDispose?: DisposeFunc;
    outlineDispose?: DisposeFunc;
    rootDispose?: DisposeFunc;
    deloserDispose?: DisposeFunc;
    modalizerDispose?: DisposeFunc;
    observedElementDispose?: DisposeFunc;
    crossOriginDispose?: DisposeFunc;
}

export interface TabsterCompat {
    attributeTransform?: <P>(old: P) => TabsterAttributeProps;
}

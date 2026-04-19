/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import type { DOMAPI, MoverDirection } from "../Types";
import { MoverDirections } from "../Consts";
export { MoverDirections } from "../Consts";
export type { MoverDirection } from "../Types";
import { MoverMemorizedElementEventName } from "../Events";
import { findAll, findDefault } from "./focusable";

export interface MoverOptions {
    direction?: MoverDirection;
    cyclic?: boolean;
    memorizeCurrent?: boolean;
    hasDefault?: boolean;
    /** When true, Tab/Shift+Tab navigate between items instead of leaving the group. */
    tabbable?: boolean;
    /**
     * Keys the mover should NOT intercept, allowing default browser/component handling.
     * E.g. `{ Tab: true }` to let Tab leave even when tabbable is true.
     */
    ignoreKeydown?: Record<string, boolean>;
    visibilityAware?: boolean;
    visibilityTolerance?: number;
    gridColumns?: number;
    homeAndEnd?: boolean;
    pageUpDown?: boolean;
    pageSize?: number;
    useFocusgroup?: boolean;
    domAPI?: DOMAPI;
}

export interface MoverInstance {
    readonly element: HTMLElement;
    setCurrentElement(el: HTMLElement | null): void;
    getCurrentElement(): HTMLElement | null;
    dispose(): void;
}

const MoverMoveFocusEventName = "tabster:mover:movefocus";

const _moverEventKeyMap: Record<number, string> = {
    1: "ArrowUp",
    2: "ArrowDown",
    3: "ArrowLeft",
    4: "ArrowRight",
    5: "PageUp",
    6: "PageDown",
    7: "Home",
    8: "End",
};

// focusgroup attribute value mapping
function _focusgroupValue(
    direction: MoverDirection,
    cyclic: boolean
): string | null {
    if (direction === MoverDirections.Grid) {
        return null; // Grid always uses custom JS
    }
    const wrap = cyclic ? " wrap" : "";
    switch (direction) {
        case MoverDirections.Vertical:
            return `vertical${wrap}`;
        case MoverDirections.Horizontal:
            return `horizontal${wrap}`;
        case MoverDirections.Both:
            return cyclic ? "wrap" : null;
        default:
            return null;
    }
}

function _hasFocusgroupSupport(): boolean {
    return (
        "focusgroup" in document.createElement("div") ||
        !!(
            window as Window & {
                __focusGroupPolyfillActive?: boolean;
            }
        ).__focusGroupPolyfillActive
    );
}

// ---- Grid column detection ----

interface GridCache {
    columns: number;
    items: HTMLElement[];
}

function _detectColumns(items: HTMLElement[]): number {
    if (items.length === 0) {
        return 1;
    }

    const TOLERANCE = 4;
    const firstTop = items[0].getBoundingClientRect().top;
    let count = 0;

    for (const item of items) {
        const rect = item.getBoundingClientRect();
        if (Math.abs(rect.top - firstTop) <= TOLERANCE) {
            count++;
        } else {
            break;
        }
    }

    return count || 1;
}

function _gridNavigate(
    items: HTMLElement[],
    currentIdx: number,
    key: string,
    columns: number,
    cyclic: boolean,
    homeAndEnd: boolean,
    pageSize: number
): number {
    const total = items.length;
    if (total === 0) {
        return currentIdx;
    }

    // Geometry-based navigation: robust to non-uniform grids where some
    // "rows" may have different column counts (e.g. composite DataGrid
    // where the header row has cell items and data rows are full-width
    // groupper items). For ArrowUp/Down we pick the nearest item whose
    // vertical stripe is above/below the current item and whose horizontal
    // range overlaps the current item's center. For ArrowLeft/Right we
    // pick the nearest item on the same visual row.
    const TOLERANCE = 4;
    const currentRect = items[currentIdx].getBoundingClientRect();
    const currentCenterX = (currentRect.left + currentRect.right) / 2;
    const currentCenterY = (currentRect.top + currentRect.bottom) / 2;

    const sameRow = (r: DOMRect): boolean =>
        Math.abs(r.top - currentRect.top) <= TOLERANCE ||
        (currentCenterY >= r.top && currentCenterY <= r.bottom);

    let nextIdx = currentIdx;

    switch (key) {
        case "ArrowRight": {
            let bestIdx = -1;
            let bestDx = Infinity;
            for (let i = 0; i < total; i++) {
                if (i === currentIdx) {
                    continue;
                }
                const r = items[i].getBoundingClientRect();
                if (!sameRow(r)) {
                    continue;
                }
                const dx = r.left - currentRect.right;
                if (dx >= -TOLERANCE && dx < bestDx) {
                    bestDx = dx;
                    bestIdx = i;
                }
            }
            if (bestIdx !== -1) {
                nextIdx = bestIdx;
            } else if (cyclic) {
                // wrap: leftmost in row
                let leftmost = currentIdx;
                let leftmostX = currentRect.left;
                for (let i = 0; i < total; i++) {
                    const r = items[i].getBoundingClientRect();
                    if (!sameRow(r)) {
                        continue;
                    }
                    if (r.left < leftmostX) {
                        leftmostX = r.left;
                        leftmost = i;
                    }
                }
                nextIdx = leftmost;
            }
            break;
        }
        case "ArrowLeft": {
            let bestIdx = -1;
            let bestDx = Infinity;
            for (let i = 0; i < total; i++) {
                if (i === currentIdx) {
                    continue;
                }
                const r = items[i].getBoundingClientRect();
                if (!sameRow(r)) {
                    continue;
                }
                const dx = currentRect.left - r.right;
                if (dx >= -TOLERANCE && dx < bestDx) {
                    bestDx = dx;
                    bestIdx = i;
                }
            }
            if (bestIdx !== -1) {
                nextIdx = bestIdx;
            } else if (cyclic) {
                // wrap: rightmost in row
                let rightmost = currentIdx;
                let rightmostX = currentRect.right;
                for (let i = 0; i < total; i++) {
                    const r = items[i].getBoundingClientRect();
                    if (!sameRow(r)) {
                        continue;
                    }
                    if (r.right > rightmostX) {
                        rightmostX = r.right;
                        rightmost = i;
                    }
                }
                nextIdx = rightmost;
            }
            break;
        }
        case "ArrowDown":
        case "ArrowUp": {
            const isDown = key === "ArrowDown";
            let bestIdx = -1;
            let bestDy = Infinity;
            let bestDx = Infinity;
            for (let i = 0; i < total; i++) {
                if (i === currentIdx) {
                    continue;
                }
                const r = items[i].getBoundingClientRect();
                const dy = isDown
                    ? r.top - currentRect.bottom
                    : currentRect.top - r.bottom;
                if (dy < -TOLERANCE) {
                    continue;
                }
                // Horizontal overlap check: current center must fall within
                // candidate horizontal range OR candidate horizontally
                // contains/overlaps the current rect's horizontal center.
                const overlaps =
                    currentCenterX >= r.left - TOLERANCE &&
                    currentCenterX <= r.right + TOLERANCE;
                if (!overlaps) {
                    continue;
                }
                const clampedDy = Math.max(0, dy);
                const dx = Math.abs((r.left + r.right) / 2 - currentCenterX);
                if (
                    clampedDy < bestDy ||
                    (clampedDy === bestDy && dx < bestDx)
                ) {
                    bestDy = clampedDy;
                    bestDx = dx;
                    bestIdx = i;
                }
            }
            if (bestIdx !== -1) {
                nextIdx = bestIdx;
            } else if (cyclic) {
                // wrap: furthest in opposite direction with horizontal overlap
                let wrapIdx = -1;
                let wrapBest = isDown ? Infinity : -Infinity;
                for (let i = 0; i < total; i++) {
                    const r = items[i].getBoundingClientRect();
                    const overlaps =
                        currentCenterX >= r.left - TOLERANCE &&
                        currentCenterX <= r.right + TOLERANCE;
                    if (!overlaps) {
                        continue;
                    }
                    if (isDown && r.top < wrapBest) {
                        wrapBest = r.top;
                        wrapIdx = i;
                    } else if (!isDown && r.top > wrapBest) {
                        wrapBest = r.top;
                        wrapIdx = i;
                    }
                }
                if (wrapIdx !== -1) {
                    nextIdx = wrapIdx;
                }
            }
            break;
        }
        case "Home": {
            if (homeAndEnd) {
                // First item in the current visual row.
                let leftmost = currentIdx;
                let leftmostX = currentRect.left;
                for (let i = 0; i < total; i++) {
                    const r = items[i].getBoundingClientRect();
                    if (!sameRow(r)) {
                        continue;
                    }
                    if (r.left < leftmostX) {
                        leftmostX = r.left;
                        leftmost = i;
                    }
                }
                nextIdx = leftmost;
            }
            break;
        }
        case "End": {
            if (homeAndEnd) {
                // Last item in the current visual row.
                let rightmost = currentIdx;
                let rightmostX = currentRect.right;
                for (let i = 0; i < total; i++) {
                    const r = items[i].getBoundingClientRect();
                    if (!sameRow(r)) {
                        continue;
                    }
                    if (r.right > rightmostX) {
                        rightmostX = r.right;
                        rightmost = i;
                    }
                }
                nextIdx = rightmost;
            }
            break;
        }
        case "PageUp": {
            nextIdx = Math.max(0, currentIdx - pageSize * columns);
            break;
        }
        case "PageDown": {
            nextIdx = Math.min(total - 1, currentIdx + pageSize * columns);
            break;
        }
    }

    return nextIdx;
}

// ---- Linear navigation ----

function _linearNavigate(
    items: HTMLElement[],
    currentIdx: number,
    key: string,
    direction: MoverDirection,
    cyclic: boolean,
    homeAndEnd: boolean,
    pageSize: number,
    visibleItems?: Set<HTMLElement>
): number {
    const total = items.length;
    if (total === 0) {
        return currentIdx;
    }

    const isPrev = key === "ArrowUp" || key === "ArrowLeft";
    const isNext = key === "ArrowDown" || key === "ArrowRight";
    const isHome = key === "Home";
    const isEnd = key === "End";
    const isPageUp = key === "PageUp";
    const isPageDown = key === "PageDown";

    if (
        direction === MoverDirections.Vertical &&
        (key === "ArrowLeft" || key === "ArrowRight")
    ) {
        return currentIdx;
    }
    if (
        direction === MoverDirections.Horizontal &&
        (key === "ArrowUp" || key === "ArrowDown")
    ) {
        return currentIdx;
    }

    const _isVisible = (idx: number): boolean => {
        const item = items[idx];
        if (!item) {
            return false;
        }
        if (visibleItems) {
            return visibleItems.has(item);
        }
        return true;
    };

    const _findNext = (from: number): number => {
        for (let i = from + 1; i < total; i++) {
            if (_isVisible(i)) {
                return i;
            }
        }
        if (cyclic) {
            for (let i = 0; i < from; i++) {
                if (_isVisible(i)) {
                    return i;
                }
            }
        }
        return from;
    };

    const _findPrev = (from: number): number => {
        for (let i = from - 1; i >= 0; i--) {
            if (_isVisible(i)) {
                return i;
            }
        }
        if (cyclic) {
            for (let i = total - 1; i > from; i--) {
                if (_isVisible(i)) {
                    return i;
                }
            }
        }
        return from;
    };

    if (isNext) {
        return _findNext(currentIdx);
    } else if (isPrev) {
        return _findPrev(currentIdx);
    } else if (isHome && homeAndEnd) {
        for (let i = 0; i < total; i++) {
            if (_isVisible(i)) {
                return i;
            }
        }
    } else if (isEnd && homeAndEnd) {
        for (let i = total - 1; i >= 0; i--) {
            if (_isVisible(i)) {
                return i;
            }
        }
    } else if (isPageUp) {
        return Math.max(0, currentIdx - pageSize);
    } else if (isPageDown) {
        return Math.min(total - 1, currentIdx + pageSize);
    }

    return currentIdx;
}

export function createMover(
    element: HTMLElement,
    options?: MoverOptions
): MoverInstance {
    const direction = options?.direction ?? MoverDirections.Both;
    const cyclic = options?.cyclic ?? false;
    const memorizeCurrent = options?.memorizeCurrent ?? false;
    const hasDefault = options?.hasDefault ?? false;
    const tabbable = options?.tabbable ?? false;
    const ignoreKeydown = options?.ignoreKeydown;
    const visibilityAware = options?.visibilityAware ?? false;
    const visibilityTolerance = options?.visibilityTolerance ?? 0.8;
    const gridColumnsOpt = options?.gridColumns ?? 0;
    const homeAndEnd =
        options?.homeAndEnd ?? direction !== MoverDirections.Horizontal;
    const pageUpDown =
        options?.pageUpDown ?? direction !== MoverDirections.Horizontal;
    const pageSize = options?.pageSize ?? 5;
    const useFocusgroup = options?.useFocusgroup ?? true;

    let _current: HTMLElement | null = null;
    const _savedTabIndexes = new Map<HTMLElement, string | null>();
    // [row, col] grid position for virtualizer support — element may be replaced
    // but the logical position survives.
    let _currentGridPos: [number, number] | null = null;
    // Grid cache: columns + ordered items array
    let _gridCache: GridCache | null = null;
    // IntersectionObserver for visibilityAware
    let _io: IntersectionObserver | null = null;
    const _visibleSet = new Set<HTMLElement>();
    // ResizeObserver for grid cache invalidation
    let _ro: ResizeObserver | null = null;

    const _isGrid = direction === MoverDirections.Grid;
    const _isGridLinear = direction === MoverDirections.GridLinear;

    // ---- focusgroup progressive enhancement ----

    let _usingFocusgroup = false;

    function _collectMoverItems(): HTMLElement[] {
        const all = findAll({
            container: element,
            includeProgrammaticallyFocusable: true,
        });

        return all.filter((item) => {
            const ownerGroupper = item.closest(
                "[data-tabster*='\"groupper\":']"
            ) as HTMLElement | null;

            // If the candidate belongs to a nested groupper, only include
            // the groupper root itself in this mover's navigation set.
            if (ownerGroupper && ownerGroupper !== element) {
                return item === ownerGroupper;
            }

            return true;
        });
    }

    if (useFocusgroup && !_isGrid && _hasFocusgroupSupport()) {
        const fgVal = _focusgroupValue(direction, cyclic);
        if (fgVal !== null) {
            element.setAttribute("focusgroup", fgVal);
            _usingFocusgroup = true;
        }
    }

    function _restoreTabIndexes(): void {
        const savedEntries = Array.from(_savedTabIndexes.entries());

        savedEntries.forEach(([el, previousTabIndex]) => {
            if (!element.contains(el)) {
                return;
            }

            if (previousTabIndex === null) {
                el.removeAttribute("tabindex");
            } else {
                el.setAttribute("tabindex", previousTabIndex);
            }
        });

        _savedTabIndexes.clear();
    }

    function _syncTabbableItem(preferred?: HTMLElement | null): void {
        // When the mover shares its element with a groupper (e.g. a
        // DataGrid row in composite mode), the groupper manages inner
        // tabindexes (all descendants stay at -1 unless explicitly
        // entered). Setting one item to tabindex=0 here would fight the
        // groupper and expose an unintended tab stop inside the group.
        const _tabsterAttr = element.getAttribute("data-tabster");
        if (_tabsterAttr && _tabsterAttr.indexOf('"groupper":') !== -1) {
            return;
        }

        const items = _collectMoverItems();
        if (items.length === 0) {
            return;
        }

        let activeItem =
            preferred && items.includes(preferred) ? preferred : null;

        if (!activeItem && _current && items.includes(_current)) {
            activeItem = _current;
        }

        if (!activeItem && hasDefault) {
            const defaultItem = findDefault({ container: element });
            if (defaultItem && items.includes(defaultItem)) {
                activeItem = defaultItem;
            }
        }

        activeItem ??= items[0] ?? null;

        items.forEach((item) => {
            if (!_savedTabIndexes.has(item)) {
                _savedTabIndexes.set(item, item.getAttribute("tabindex"));
            }

            if (item === activeItem) {
                item.setAttribute("tabindex", "0");
            } else {
                item.setAttribute("tabindex", "-1");
            }
        });
    }

    _syncTabbableItem();

    // ---- Visibility tracking ----

    if (visibilityAware) {
        _io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    const el = entry.target as HTMLElement;
                    if (entry.intersectionRatio >= visibilityTolerance) {
                        _visibleSet.add(el);
                    } else {
                        _visibleSet.delete(el);
                    }
                }
            },
            { threshold: visibilityTolerance }
        );

        // Observe current children
        const _observeItems = (): void => {
            _io?.disconnect();
            _visibleSet.clear();
            const items = _collectMoverItems();
            for (const item of items) {
                _io?.observe(item);
            }
        };

        _observeItems();
    }

    // ---- Grid cache ----

    function _buildGridCache(): GridCache {
        const items = _collectMoverItems();
        const columns =
            gridColumnsOpt > 0 ? gridColumnsOpt : _detectColumns(items);
        return { columns, items };
    }

    function _getGridCache(): GridCache {
        if (!_gridCache) {
            _gridCache = _buildGridCache();
        }
        return _gridCache;
    }

    if (_isGrid) {
        if (typeof ResizeObserver !== "undefined") {
            _ro = new ResizeObserver(() => {
                _gridCache = null;
            });
            _ro.observe(element);
        }
    }

    // ---- Tab-in focus ----

    function _onFocusIn(e: FocusEvent): void {
        let target = e.target as HTMLElement | null;
        if (!target || target === element.ownerDocument.body) {
            target = element.ownerDocument.activeElement as HTMLElement | null;
        }

        if (!target) {
            return;
        }

        if (!element.contains(target) || target === element) {
            return;
        }

        const relatedTarget = e.relatedTarget as HTMLElement | null;
        const comingFromOutside =
            !relatedTarget || !element.contains(relatedTarget);

        if (comingFromOutside) {
            // Natural tab entry: browser Tab/Shift+Tab lands on the single
            // tabindex=0 item inside the mover. Explicit programmatic
            // focus (e.g. findLastFocusable().focus() from a sibling
            // component) lands on an arbitrary descendant. We should only
            // apply hasDefault/memorize/direction redirects for natural
            // entries — otherwise we would override intentional focus.
            const itemsForEntry = _collectMoverItems();
            const currentTabbable =
                itemsForEntry.find((i) => i.getAttribute("tabindex") === "0") ??
                null;
            const isNaturalEntry =
                currentTabbable !== null && target === currentTabbable;

            if (isNaturalEntry) {
                if (hasDefault) {
                    const def = findDefault({ container: element });
                    if (def && def !== target) {
                        def.focus();
                        return;
                    }
                }

                if (memorizeCurrent) {
                    if (_current && element.contains(_current)) {
                        // Element is still in the DOM — restore directly.
                        if (_current !== target) {
                            _current.focus();
                            return;
                        }
                    } else if (_isGrid && _currentGridPos) {
                        // Element was replaced (e.g. virtualizer) — restore by [row, col].
                        const cache = _getGridCache();
                        const [row, col] = _currentGridPos;
                        const idx = Math.min(
                            row * cache.columns + col,
                            cache.items.length - 1
                        );
                        const el = idx >= 0 ? cache.items[idx] : null;
                        if (el && el !== target) {
                            el.focus();
                            return;
                        }
                    } else if (relatedTarget) {
                        // No memorization yet — approximate full Tabster's
                        // dummy-input direction detection. If the user
                        // arrived via Shift+Tab (relatedTarget is AFTER
                        // this mover in DOM order), land on the last item.
                        // Forward Tab already lands on the natural first
                        // tabbable.
                        const isShiftTabEntry = !!(
                            element.compareDocumentPosition(relatedTarget) &
                            Node.DOCUMENT_POSITION_FOLLOWING
                        );
                        if (isShiftTabEntry) {
                            const last =
                                itemsForEntry[itemsForEntry.length - 1] ?? null;
                            if (last && last !== target) {
                                last.focus();
                                return;
                            }
                        }
                    }
                }
            }
        }

        if (memorizeCurrent) {
            // If the target is itself a mover item, memorize it directly.
            // Otherwise (e.g. focus landed on a cell inside a nested
            // groupper such as a DataGrid row in composite mode), memorize
            // the owning mover item (the nearest ancestor that is one of
            // our items) so Shift+Tab from outside restores focus to that
            // item rather than falling back to items[0].
            const items = _collectMoverItems();
            let memorizeTarget: HTMLElement | null = items.includes(target)
                ? target
                : null;
            if (!memorizeTarget) {
                for (
                    let cur: HTMLElement | null = target.parentElement;
                    cur && element.contains(cur) && cur !== element;
                    cur = cur.parentElement
                ) {
                    if (items.includes(cur)) {
                        memorizeTarget = cur;
                        break;
                    }
                }
            }

            if (memorizeTarget) {
                _current = memorizeTarget;

                if (_isGrid) {
                    const cache = _getGridCache();
                    const idx = cache.items.indexOf(memorizeTarget);
                    if (idx !== -1) {
                        _currentGridPos = [
                            Math.floor(idx / cache.columns),
                            idx % cache.columns,
                        ];
                    }
                }

                element.dispatchEvent(
                    new CustomEvent(MoverMemorizedElementEventName, {
                        bubbles: true,
                        composed: true,
                        detail: { memorizedElement: _current ?? undefined },
                    })
                );
            }
        }

        _syncTabbableItem(target);
    }

    // ---- Keydown handler (not used when focusgroup handles it) ----

    function _onKeyDown(e: KeyboardEvent): void {
        const key = e.key;

        // Let the component handle keys it has opted out of.
        if (ignoreKeydown?.[key]) {
            return;
        }

        const isArrow = [
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
        ].includes(key);
        const isHomeEnd = homeAndEnd && (key === "Home" || key === "End");
        const isPageUpDown =
            pageUpDown && (key === "PageUp" || key === "PageDown");
        const isTab = tabbable && key === "Tab";

        if (!isArrow && !isHomeEnd && !isPageUpDown && !isTab) {
            return;
        }

        // If focusgroup handles arrows, only intercept Home/End/PageUp/PageDown
        if (_usingFocusgroup && isArrow && !_isGrid) {
            return;
        }

        const target = e.target as HTMLElement;
        if (!element.contains(target) || target === element) {
            return;
        }

        // Tab navigation within the group
        if (isTab) {
            const items = findAll({ container: element });
            const currentIdx = items.indexOf(target);
            if (currentIdx === -1) {
                return;
            }
            const step = e.shiftKey ? -1 : 1;
            const nextIdx = cyclic
                ? (currentIdx + step + items.length) % items.length
                : currentIdx + step;
            if (nextIdx < 0 || nextIdx >= items.length) {
                return;
            }
            e.preventDefault();
            items[nextIdx]?.focus();
            if (memorizeCurrent) {
                _current = items[nextIdx] ?? null;
            }
            return;
        }

        let nextIdx: number;

        if (_isGrid) {
            const cache = _getGridCache();
            const items = cache.items;
            const currentIdx = items.indexOf(target);
            if (currentIdx === -1) {
                return;
            }

            const isCtrlHomeEnd =
                (key === "Home" || key === "End") && (e.ctrlKey || e.metaKey);

            nextIdx = isCtrlHomeEnd
                ? key === "Home"
                    ? 0
                    : items.length - 1
                : _gridNavigate(
                      items,
                      currentIdx,
                      key,
                      cache.columns,
                      cyclic,
                      homeAndEnd,
                      pageSize
                  );

            // Skip non-visible items in visibilityAware mode
            if (visibilityAware && _visibleSet.size > 0) {
                // Already handled directionally in grid — find nearest visible
                // For simplicity, advance in the same direction until visible
                let attempts = items.length;
                while (
                    nextIdx !== currentIdx &&
                    !_visibleSet.has(items[nextIdx]) &&
                    attempts-- > 0
                ) {
                    nextIdx = _gridNavigate(
                        items,
                        nextIdx,
                        key,
                        cache.columns,
                        cyclic,
                        homeAndEnd,
                        pageSize
                    );
                }
            }

            if (nextIdx !== currentIdx) {
                e.preventDefault();
                e.stopPropagation();
                _syncTabbableItem(items[nextIdx] ?? null);
                items[nextIdx]?.focus();
                if (memorizeCurrent) {
                    _current = items[nextIdx] ?? null;
                }
            }
        } else {
            const items = _collectMoverItems();
            const currentIdx = items.indexOf(target);
            if (currentIdx === -1) {
                return;
            }

            // GridLinear: ArrowUp/ArrowDown jump by columnCount in DOM order
            // (skipping non-tabbable items in between). ArrowLeft/ArrowRight
            // behave linearly (±1 in DOM order). This matches grid-like layouts
            // where rows are visually distinct but item order is purely linear.
            if (_isGridLinear && (key === "ArrowUp" || key === "ArrowDown")) {
                const columns =
                    gridColumnsOpt > 0 ? gridColumnsOpt : _detectColumns(items);
                const step = key === "ArrowDown" ? columns : -columns;
                let candidate = currentIdx + step;
                if (cyclic) {
                    candidate =
                        ((candidate % items.length) + items.length) %
                        items.length;
                } else if (candidate < 0 || candidate >= items.length) {
                    return;
                }
                nextIdx = candidate;
            } else {
                nextIdx = _linearNavigate(
                    items,
                    currentIdx,
                    key,
                    direction,
                    cyclic,
                    homeAndEnd,
                    pageSize,
                    visibilityAware && _visibleSet.size > 0
                        ? _visibleSet
                        : undefined
                );
            }

            if (nextIdx !== currentIdx) {
                e.preventDefault();
                e.stopPropagation();
                _syncTabbableItem(items[nextIdx] ?? null);
                items[nextIdx]?.focus();
                if (memorizeCurrent) {
                    _current = items[nextIdx] ?? null;
                }
            }
        }
    }

    function _onMoverMoveFocus(e: Event): void {
        const moveFocusEvent = e as CustomEvent<{ key?: string | number }>;
        const eventKey = moveFocusEvent.detail?.key;
        const origin = moveFocusEvent.target;

        const key =
            typeof eventKey === "number"
                ? _moverEventKeyMap[eventKey]
                : eventKey;

        if (!key) {
            return;
        }

        if (!(origin instanceof HTMLElement)) {
            return;
        }

        _onKeyDown({
            key,
            target: origin,
            shiftKey: false,
            preventDefault: () => {
                /* noop */
            },
            stopPropagation: () => {
                /* noop */
            },
        } as unknown as KeyboardEvent);
    }

    element.addEventListener("keydown", _onKeyDown);
    element.addEventListener(MoverMoveFocusEventName, _onMoverMoveFocus);
    element.addEventListener("focusin", _onFocusIn);

    function setCurrentElement(el: HTMLElement | null): void {
        _current = el;
        _currentGridPos = null; // caller sets element directly; grid pos is re-derived on next focusin
        _syncTabbableItem(el);
    }

    function getCurrentElement(): HTMLElement | null {
        return _current;
    }

    function dispose(): void {
        element.removeEventListener("keydown", _onKeyDown);
        element.removeEventListener(MoverMoveFocusEventName, _onMoverMoveFocus);
        element.removeEventListener("focusin", _onFocusIn);

        _restoreTabIndexes();

        if (_usingFocusgroup) {
            element.removeAttribute("focusgroup");
        }

        _io?.disconnect();
        _io = null;
        _ro?.disconnect();
        _ro = null;
        _gridCache = null;
        _visibleSet.clear();
    }

    return {
        get element() {
            return element;
        },
        setCurrentElement,
        getCurrentElement,
        dispose,
    };
}

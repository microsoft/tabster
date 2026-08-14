---
title: Core
---

# Core <img src="/img/catcore.png" className="image image_header" alt="" />

The core is the part of Tabster that is always present, regardless of which
optional features you enable. It's responsible for creating/disposing
instances, tracking the focused element and keyboard-navigation state,
finding focusable elements, and recognizing the `root` and `uncontrolled`
`data-tabster` keys. This page documents those always-available pieces; see
[Getting Started](intro.md) for the setup walkthrough and [API
Reference](api-reference.md) for the full export list.

## Lifecycle functions

```ts
import {
    createTabster,
    disposeTabster,
    getTabster,
    forceCleanup,
    makeNoOp,
    isNoOp,
    getInternal,
} from "tabster";
```

| Function                                 | Purpose                                                                                                                                                              |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createTabster(win, props?)`             | Creates (or attaches to) the Tabster instance for `win`. See [`TabsterCoreProps`](#tabstercoreprops).                                                                |
| `disposeTabster(tabster, allInstances?)` | Releases a handle returned by `createTabster()`; tears down the shared core once every handle is released, or immediately when `allInstances` is `true`.             |
| `getTabster(win)`                        | Returns the existing instance for `win`, or `null` if `createTabster()` was never called for it. Does not create one.                                                |
| `forceCleanup(tabster)`                  | Asynchronously forgets memorized focus history; use after removing the entire application DOM.                                                                       |
| `makeNoOp(tabster, noop)`                | Toggles a live instance in/out of no-op mode (for perf debugging) without touching application code.                                                                 |
| `isNoOp(tabster.core)`                   | Returns whether the instance is currently in no-op mode.                                                                                                             |
| `getInternal(tabster)`                   | Returns the low-level `stopObserver()`/`resumeObserver()` pair Tabster uses to pause/resume its DOM mutation observer. Advanced — most applications never need this. |

### `TabsterCoreProps`

Passed as the second argument to `createTabster()`:

| Prop                             | Type                                                     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autoRoot`                       | `RootProps`                                              | When set, Tabster creates a root for the whole document automatically, without requiring a `data-tabster="{\"root\":{}}"` attribute.                                                                                                                                                                                                                                                                                                                                                |
| `controlTab`                     | `boolean` (default `true`)                               | Selects the application's Tab-navigation model. `true` makes Tabster calculate and focus the next element programmatically; it is best suited to relatively simple applications that own their focusable DOM. `false` leaves ordinary Tab order to the browser and uses dummy inputs when Tabster must redirect focus, which better accommodates complex applications and third-party focus management at the cost of extra DOM nodes. See [How it works](concept.md#how-it-works). |
| `rootDummyInputs`                | `boolean`                                                | When `controlTab` is `false`, the root does not get dummy inputs by default; set this to `true` to add them. Feature containers can still create their own dummy inputs where redirection is required.                                                                                                                                                                                                                                                                              |
| `checkUncontrolledCompletely`    | `(element, completely: boolean) => boolean \| undefined` | Callback asked, for uncontrolled areas, whether the area currently wants complete control of Tab handling (for example because it's trapping focus itself). Returning `undefined` falls back to the element's own `uncontrolled.completely` prop.                                                                                                                                                                                                                                   |
| `checkUncontrolledTrappingFocus` | `(element) => boolean`                                   | **Deprecated**, use `checkUncontrolledCompletely`.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `getParent`                      | `(el: Node) => Node \| null`                             | Custom parent-traversal function, used wherever Tabster walks up the tree to compute context (roots, Movers, Grouppers, Modalizers). Useful for virtual/portal parents that aren't real DOM ancestors.                                                                                                                                                                                                                                                                              |
| `DOMAPI`                         | `Partial<DOMAPI>`                                        | Overrides the low-level DOM calls Tabster uses internally. This is how [Shadow DOM support](shadow-dom.md) is enabled.                                                                                                                                                                                                                                                                                                                                                              |

## Core instance

`createTabster()` returns a `Tabster` handle with these members:

```ts
interface Tabster {
    keyboardNavigation: KeyboardNavigationState;
    focusedElement: FocusedElementState;
    focusable: FocusableAPI;
    root: RootAPI;
    uncontrolled: UncontrolledAPI;
}
```

### `keyboardNavigation`

Tracks whether the user is currently navigating with the keyboard (as
opposed to the mouse or a programmatic focus call). Movement detection is
automatic — Tabster observes Tab presses, arrow keys, and other
navigation-relevant input.

```ts
interface KeyboardNavigationState {
    subscribe(callback: (isNavigatingWithKeyboard: boolean) => void): void;
    unsubscribe(callback: (isNavigatingWithKeyboard: boolean) => void): void;
    isNavigatingWithKeyboard(): boolean;
    setNavigatingWithKeyboard(isNavigatingWithKeyboard: boolean): void;
}
```

```ts
const tabster = createTabster(window);

console.log(tabster.keyboardNavigation.isNavigatingWithKeyboard());

tabster.keyboardNavigation.subscribe((isNavigatingWithKeyboard) => {
    console.log("Keyboard navigation:", isNavigatingWithKeyboard);
});
```

[Outline](outline.md) and [Restorer](restorer.md) both use this state to
decide when to act.

### `focusedElement`

Tracks the currently/last focused element and exposes focus helpers that add
an accessibility check on top of the native `element.focus()`.

```ts
interface FocusedElementState {
    subscribe(
        callback: (
            element: HTMLElement | undefined,
            detail: FocusedElementDetail
        ) => void
    ): void;
    unsubscribe(
        callback: (
            element: HTMLElement | undefined,
            detail: FocusedElementDetail
        ) => void
    ): void;
    getFocusedElement(): HTMLElement | undefined;
    getLastFocusedElement(): HTMLElement | undefined;
    focus(
        element: HTMLElement,
        noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean,
        focusOptions?: boolean | TabsterFocusOptions
    ): boolean;
    focusDefault(container: HTMLElement): boolean;
    focusFirst(props: FindFirstProps): boolean;
    focusLast(props: FindFirstProps): boolean;
    resetFocus(container: HTMLElement): boolean;
}
```

- `focus()` returns `true` when the element was actually focused (it will
  refuse to focus something that fails the accessibility check unless
  `noAccessibleCheck` is passed). The last argument accepts either a legacy
  boolean (mapped to `{ preventScroll: boolean }`) or a full
  `TabsterFocusOptions` object (standard `FocusOptions` plus `focusVisible`).
- `focusDefault()` focuses the element marked `focusable: { isDefault: true }`
  inside `container`, if any — see [Focusable element
  properties](#focusable-element-properties) and [Deloser](deloser.md).
- `focusFirst()`/`focusLast()` focus the first/last focusable element that
  matches a subset of the `findFocusable` options (see
  [`focusable`](#focusable) below).
- `resetFocus()` puts a container into the state where the next Tab press
  moves focus to its first focusable element.

```ts
tabster.focusedElement.subscribe((element, detail) => {
    console.log("Focused:", element, detail.isFocusedProgrammatically);
});
```

### `focusable`

Finds and classifies focusable elements. This is the same engine Mover,
Groupper, and Modalizer use internally to compute tabbing order, so it's
reliable to build custom navigation on top of.

```ts
interface FocusableAPI {
    getProps(element: HTMLElement): FocusableProps;
    isFocusable(
        element: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        noVisibleCheck?: boolean,
        noAccessibleCheck?: boolean
    ): boolean;
    isVisible(element: HTMLElement): boolean;
    isAccessible(element: HTMLElement): boolean;
    findFirst(options: FindFirstProps): HTMLElement | null | undefined;
    findLast(options: FindFirstProps): HTMLElement | null | undefined;
    findNext(options: FindNextProps): HTMLElement | null | undefined;
    findPrev(options: FindNextProps): HTMLElement | null | undefined;
    findDefault(options: FindDefaultProps): HTMLElement | null;
    findAll(options: FindAllProps): HTMLElement[];
    findElement(options: FindFocusableProps): HTMLElement | null | undefined;
}
```

`find*()` methods return `null` when there's nothing to find and `undefined`
when the search hit an uncontrolled area it can't see into. The most common
options (all keyed off `container`):

| Option                               | Applies to                      | Meaning                                                                         |
| ------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------- |
| `container`                          | all                             | The element to search within.                                                   |
| `currentElement`                     | `findNext`/`findPrev`/`findAll` | Where to start searching from.                                                  |
| `isBackward`                         | `findAll`                       | Search/report elements in reverse DOM order.                                    |
| `includeProgrammaticallyFocusable`   | all                             | Include elements that are only focusable via `.focus()` (e.g. `tabindex="-1"`). |
| `useActiveModalizer` / `modalizerId` | all                             | Restrict the search to (or exclude) the currently-active Modalizer.             |
| `acceptCondition`                    | `findAll`                       | Custom predicate an element must satisfy to be included.                        |
| `onElement`                          | `findAll`                       | Callback invoked per found element; returning `false` stops the search early.   |

```ts
const buttons = tabster.focusable.findAll({
    container: document.body,
    acceptCondition: (el) => el.tagName === "BUTTON",
});

const next = tabster.focusable.findNext({
    currentElement: document.activeElement as HTMLElement,
    container: document.body,
});
```

### `root`

`RootAPI` mostly exposes internal wiring; the practical surface for a root
is the `root` `data-tabster` key itself:

```ts
interface RootProps {
    restoreFocusOrder?: RestoreFocusOrder;
}
```

```tsx
<div {...getTabsterAttribute({ root: {} })}>{/* app */}</div>
```

`restoreFocusOrder` uses the same [`RestoreFocusOrders`](api-reference.md#constants)
enum as [Deloser](deloser.md#restorefocusorder), and controls what happens
when focus would otherwise be lost to the very edge of the application.

### `uncontrolled`

Marks a subtree whose native or third-party keyboard behavior should control
focus. The core API also exposes
`uncontrolled.isUncontrolledCompletely(element, completely)` to resolve the
configured complete-control policy. See the dedicated
[Uncontrolled guide](uncontrolled.md) for the attribute, core callback,
programmatic API, and feature interactions.

## Focusable element properties

Any focusable element can carry a `focusable` key with extra hints Tabster
uses when computing default/ignored elements, and — for
[Mover](mover.md)/[Groupper](groupper.md)/[Modalizer](modalizer.md) —
keyboard handling:

```ts
interface FocusableProps {
    isDefault?: boolean;
    isIgnored?: boolean;
    ignoreAriaDisabled?: boolean;
    excludeFromMover?: boolean;
    ignoreKeydown?: {
        Tab?: boolean;
        Escape?: boolean;
        Enter?: boolean;
        ArrowUp?: boolean;
        ArrowDown?: boolean;
        ArrowLeft?: boolean;
        ArrowRight?: boolean;
        PageUp?: boolean;
        PageDown?: boolean;
        Home?: boolean;
        End?: boolean;
    };
}
```

- `isDefault` — marks the element used by `focusedElement.focusDefault()` and
  by [Deloser's](deloser.md) `DeloserDefault`/`RootDefault` restore orders.
- `isIgnored` — completely excludes the element from Tabster's focusable
  search (it still gets native Tab behaviour from the browser, if any).
- `ignoreAriaDisabled` — keeps the element focusable even if `aria-disabled`
  is set (by default Tabster treats `aria-disabled` like `disabled`).
- `excludeFromMover` — removes the element (and its subtree) from a
  surrounding [Mover's](mover.md) arrow-key navigation, without removing it
  from the DOM or from Tab order.
- `ignoreKeydown` — tells Tabster's Mover/Groupper/Modalizer handlers to
  leave a specific key alone on this element, letting your own keydown
  handler (or the browser default) run instead.

```html
<button data-tabster='{"focusable": {"isDefault": true}}'>Press Me</button>
```

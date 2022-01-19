# Core

## Setup

In order to get Tabster working, we need to create an instance of Tabster core inside the
application code.

```ts
import { createTabster, disposeTabster } from "tabster";

// During the page startup.
let tabsterCore = createTabster(window);

// Don't forget to dispose on unload.
disposeTabster(tabsterCore);
```

Once the Tabster core is created for a window, Tabster should become fully functional
for the window and the Tabster attributes could be used on the DOM nodes.

Although Tabster doesn't manage focus by default. To make it manage focus, we need
to specify a container within which the focus is managed (usually, the root application
container).

Tabster API is mostly declarative. Set `data-tabster` attribute on a DOM node and it
starts behaving the required way.

`data-tabster` attribute is a serialized JSON with all Tabster components on the DOM
node, there is no need to build that value manually though. `getTabsterAttribute()`
function should be used instead. Below is an example of a small React application using
Tabster.

```tsx
import * as React from "react";
import * as ReactDOM from "react-dom";
import {
    createTabster,
    getGroupper,
    getMover,
    getTabsterAttribute,
    Types,
} from "tabster";

var tabster = createTabster(window);
getMover(tabster);
getGroupper(tabster);

ReactDOM.render(
    // Adding Tabster root, within that root Tabster manages focus.
    <div {...getTabsterAttribute({ root: {} })}>
        {/* Adding Mover, to be able to move between the list items using
            Up/Down keys. */}
        <ol
            {...getTabsterAttribute({
                mover: { direction: Types.MoverDirections.Vertical },
            })}
        >
            {/* Adding Grouppers to the list items so that Mover treats
            list items as singular entities (not looking at the inner
            focusable buttons) and to trap the focus inside the
            list item when we interact with it. */}
            <li
                tabIndex={0}
                {...getTabsterAttribute({
                    groupper: {
                        tabbability:
                            Types.GroupperTabbabilities.LimitedTrapFocus,
                    },
                })}
            >
                <button>Button1</button>
                <button>Button2</button>
            </li>
            <li
                tabIndex={0}
                {...getTabsterAttribute({
                    groupper: {
                        tabbability:
                            Types.GroupperTabbabilities.LimitedTrapFocus,
                    },
                })}
            >
                <button>Button3</button>
                <button>Button4</button>
            </li>
            <li
                tabIndex={0}
                {...getTabsterAttribute({
                    groupper: {
                        tabbability:
                            Types.GroupperTabbabilities.LimitedTrapFocus,
                    },
                })}
            >
                <button>Button5</button>
                <button>Button6</button>
            </li>
        </ol>
    </div>,
    document.getElementById("root")
);
```

The generated HTML will look like this:

```html
<div data-tabster='{"root":{}}'>
    ...
    <ol data-tabster='{"mover":{"direction":1}}'>
        <li tabindex="0" data-tabster='{"groupper":{"tabbability":2}}'>
            <button>Button1</button><button>Button2</button>
        </li>
        <li tabindex="0" data-tabster='{"groupper":{"tabbability":2}}'>
            <button>Button3</button><button>Button4</button>
        </li>
        <li tabindex="0" data-tabster='{"groupper":{"tabbability":2}}'>
            <button>Button5</button><button>Button6</button>
        </li>
    </ol>
    ...
</div>
```

In that example we have a list of items, we can move between the items using Up/Down
arrow keys ([Mover](mover.md) is used) and we can enter the item's inner buttons by
pressing Enter on a focused list item (and Esc to go back to the list item container,
[Groupper](groupper.md) is used).

## Types

All Tabster-related TypeScript type definitions are stored in the Types namespace:

```ts
import { Types } from "tabster";
```

## Methods

### createTabster()

Creates instance of Tabster core. This should be done during the application startup,
it starts handling `data-tabster` attribute of the DOM nodes.

```ts
import { createTabster } from "tabster";

let tabsterCore = createTabster(window);
```

### disposeTabster()

It is important to not forget to dispose Tabster instance during the application
unmount. Otherwise, it might lead to memory leaks in multi-window environments
(like Electron applications).

```ts
import { disposeTabster } from "tabster";

disposeTabster(tabsterCore);
```

### getTabsterAttribute()

Tabster attribute value should not be generated manually. `getTabsterAttribute()`
function provides a properly typed helper for building the value.

```ts
// Returns object like { 'data-tabster': '{...}' }.
getTabsterAttribute(props: Types.TabsterAttributeProps): Types.TabsterDOMAttribute;
// Only returns the attribute value as string.
getTabsterAttribute(props: Types.TabsterAttributeProps, plain: true): string;
```

### setTabsterAttribute()

Another helper function which helps to set or update Tabster attribute
on an HTMLElement instance programmaticaly.

```ts
setTabsterAttribute(
    element: HTMLElement,
    newProps: Types.TabsterAttributeProps,
    update?: boolean // When true, newProps will be added to the existing
                    // Tabster props on that element, otherwise, the existing
                    // props will be replaced by newProps.
): void;
```

### getCurrentTabster()

If a Tabster core instance has already been created for the window, returns that instance.

```ts
import { getCurrentTabster } from "tabster";

let tabsterCore = getCurrentTabster(window);

if (tabsterCore) {
    ...
}
```

## Core Instance

Tabster core instance provides a few APIs.

### keyboardNavigation

Keyboard navigation state is used to determine if the user is using keyboard
to navigate the application. You can subscribe to the keyboard navigation state
changes or determine the current state. Keyboard navigation state implementation
detects if the focus is moved not using the mouse or programmatically (i.e. Tab
is pressed or screen reader moves the focus).

```ts
interface KeyboardNavigationState {
    subscribe(callback: (value: boolean) => void): void;
    unsubscribe(callback: (value: boolean) => void): void;
    isNavigatingWithKeyboard(): boolean;
}
```

```ts
import { createTabster } from "tabster";

let tabsterCore = createTabster(window);

console.log(
    "Current keyboard navigation state:",
    tabsterCore.keyboardNavigation.isNavigatingWithKeyboard()
);

tabster.keyboardNavigation.subscribe((isNavigatingWithKeyboard: boolean) => {
    console.log("Keyboard navigation state changed:", isNavigatingWithKeyboard);
});
```

### focusedElement

Focused element state holds currently focused element and provides focusing
helper functions.

```ts
interface FocusedElementState {
    subscribe(
        callback: (HTMLElement | undefined, details: FocusedElementDetails): void
    ): void;
    unsubscribe(
        callback: (HTMLElement | undefined, details: FocusedElementDetails): void
    ): void;
    // Returns currently focused element.
    getFocusedElement(): HTMLElement | undefined;
    // Returns last focused element (even if the currently focused one is
    // undefined).
    getLastFocusedElement(): HTMLElement | undefined;
    // Focuses the element. By default the focus function provides the
    // accessibility check (to not focus something which is not accessible).
    // Also, whenever you focus something programmatically, FocusedElementDetails
    // in the focused element state callback receives a flag that the element
    // is focused programmatically, here we can override that flag.
    // Returns true when the element is successfully focused.
    focus(
        element: HTMLElement,
        noFocusedProgrammaticallyFlag?: boolean,
        noAccessibleCheck?: boolean
    ): boolean;
    // We can mark some DOM node default focusable using Tabster attribute.
    // This function will find such default focusable in the container (if any)
    // and focus it. Returns true if successful.
    focusDefault(container: HTMLElement): boolean;
    // focusFirst/focusLast find first/last focusable element within the
    // container and focus it, returning true if successful.
    focusFirst(props: FindFirstProps): boolean;
    focusLast(props: FindFirstProps): boolean;
    // Gets a container in a state when first Tab press will move the focus
    // to the first focusable element in the container.
    resetFocus(container: HTMLElement): boolean;
}
```

```ts
import { createTabster } from "tabster";

let tabsterCore = createTabster(window);

let element = tabsterCore.focusedElement.getLastFocusedElement();
```

### focusable

Focusable API provides a set of methods to check and find focusable elements.

```ts
export interface FocusableAPI {
    // Returns
    getProps(element: HTMLElement): FocusableProps;
    // Checks if the element is focusable.
    isFocusable(
        element: HTMLElement,
        includeProgrammaticallyFocusable?: boolean,
        noVisibleCheck?: boolean,
        noAccessibleCheck?: boolean
    ): boolean;
    // Checks if the element is visible.
    isVisible(element: HTMLElement): boolean;
    // Checks if the element is accessible (using screen readers).
    isAccessible(element: HTMLElement): boolean;
    // Methods to find focusables on the page.
    findFirst(options: FindFirstProps): HTMLElement | null | undefined;
    findLast(options: FindFirstProps): HTMLElement | null | undefined;
    findNext(options: FindNextProps): HTMLElement | null | undefined;
    findPrev(options: FindNextProps): HTMLElement | null | undefined;
    findDefault(options: FindDefaultProps): HTMLElement | null;
    findAll(options: FindAllProps): HTMLElement[];
    findElement(options: FindFocusableProps): HTMLElement | null | undefined;
}
```

## Components

Core instance runs the main Tabster engine, but what really makes it useful
are the rest of Tabster's components. We have [Mover](mover.md), [Groupper](groupper.md),
[Deloser](deloser.md), [Modalizer](modalizer.md), [Observed](observed.md) and
[Outline](outline.md).

To use these components, an additional function needs to be called right after
Tabster core creation in order to enable them. This is because Tabster is treeshakeable
and only the components which are actually used should reach the final application
bundle.

## Focusable Element Properties

We can use Tabster attribute to set some additional properties on the focusable element.

```ts
interface FocusableProps {
    // Mark element as default focusable which is used in
    // tabsterCore.focusedElement.focusDefault() and in Deloser.
    isDefault?: boolean;
    // Sometimes we might have some technical element on the page and we want
    // it to be ignored.
    isIgnored?: boolean;
    // Do not determine element's focusability based on aria-disabled. Sometimes
    // elements with aria-disabled must still be focusable.
    ignoreAriaDisabled?: boolean;
}
```

Example:

```html
<button data-tabster='{"focusable": {"isDefault": true}}'>Press Me</button>
```

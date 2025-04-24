# Deloser <img src="/img/catdeloser.png" className="image image_header" />

## About

Ideally when we use keyboard to navigate, the application should always have a focused element.
In the real world, we have scenarios like modal dialogs — when we close a modal dialog, the focus
goes nowhere (we call it _«focus goes to the \<body\>»_). The lost focus is especially confusing
for the screen reader users.

Things are getting even worse because we tend to build our applications from the independent
components which might be not aware of each other. The modal dialog shouldn't know which button
needs to be focused once it closes.

Deloser tracks focus history and restores focus to the most recent element from the history
which is still available in case the focus gets lost. From the modal dialog example perspective it
would likely be a button which opened it.

Delosers can be nested. When we apply the Deloser to the DOM element, it keeps the recent focus
history for that container, when a nested Deloser is present, its history is tracked as a single
history record from the parent Deloser point. Together with the main application Deloser (which
likely should be on the root element of the application), it makes sense to add Delosers to the
list containers so that the history inside the lists is tracked separately and doen't pollute the
main Deloser history.

## Setup

To get Deloser working, we need to call `getDeloser()` function:

```ts
import { createTabster, getDeloser } from "tabster";

let tabsterCore = createTabster(window);

getDeloser(tabsterCore);
```

Then we can apply `data-tabster` attribute:

```html
<div data-tabster='{"deloser": {...}}'></div>
```

## Properties

### restoreFocusOrder?: _RestoreFocusOrder_

`History | DeloserDefault | RootDefault | DeloserFirst | RootFirst`

We can vary how Deloser finds the element to focus once the focus is lost.

With `History`, Deloser will look through the history of previosly focused elements.

With `DeloserDefault`, the focus will be restored to an element marked as default focusable.

With `RootDefault`, the focus will go to the element marked as default focusable, but the
whole application is the target for finding that default element, not just the Deloser container.

With `DeloserFirst`, Deloser will focus first focusable element in the Deloser container.

With `RootFirst`, Deloser will focus first focusable element in the application.

### noSelectorCheck?: _boolean_

Deloser keeps weak references to the DOM nodes but it also keeps the exact selectors to the
elements. In a virtual DOM frameworks like React, a part of the page might
be rerendered, stay visually the same, but the DOM element in the history will be obsolete.

By default, locating the available element in the history, Tabster will try also locating it
by selector if the element instance is not available.

With `noSelectorCheck` we can disable checking the selectors.

## Examples

Here be dragons.

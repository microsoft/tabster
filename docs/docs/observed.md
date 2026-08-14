---
title: Observed Element
---

# Observed Element <img src="/img/catobserved.png" className="image image_header" alt="" />

## About

Observed Element lets you find and focus elements by name, including ones
that aren't mounted in the DOM yet — Tabster waits for them to appear.

Mark an element as observed by giving it one or more names:

```html
<button data-tabster='{"observed": {"names": ["myButton"]}}'>Observed</button>
```

## Setup

Call `getObservedElement()` once to enable the `observed` `data-tabster` key
and get the API:

```ts
import { createTabster, getObservedElement } from "tabster";

const tabster = createTabster(window);
const observedElement = getObservedElement(tabster);

observedElement.requestFocus("myButton", 3000);
```

## Properties

```ts
interface ObservedElementProps {
    names: string[];
    details?: unknown;
}
```

`names` is the list of names this element can be looked up by; `details` is
an arbitrary application-defined payload retrievable through
`getAllObservedElements()`/`onObservedElementChange` below.

## Methods

### `getElement()`

Returns the observed element currently in the DOM for a name, or `null`.

```ts
const element = observedElement.getElement("myButton");
```

### `waitElement()`

Waits (up to `timeout` ms) for an element with the given name to appear.

```ts
import { ObservedElementAccessibilities } from "tabster";

const wait = observedElement.waitElement(
    "myButton",
    3000,
    ObservedElementAccessibilities.Focusable // Only resolve once focusable.
);

wait.result.then((element) => {
    console.log("Observed element:", element);
});

// Cancel the wait if it's no longer needed.
wait.cancel();
```

### `requestFocus()`

Waits for the observed element to appear, then focuses it. A subsequent
`requestFocus()` call, or the user manually moving focus, cancels the
pending request automatically.

```ts
const focus = observedElement.requestFocus("myButton", 3000);

focus.result.then((focused: boolean) => {
    console.log("Focused:", focused);
});

focus.cancel();
```

`waitElement()`/`requestFocus()` both return an
`ObservedElementAsyncRequest`, whose `status` is one of the
[`ObservedElementRequestStatuses`](api-reference.md#constants)
(`Waiting`/`Succeeded`/`Canceled`/`TimedOut`), and whose `diagnostics` field
carries details useful for debugging a failed/timed-out request:

```ts
interface ObservedElementAsyncRequestDiagnostics {
    reason?: ObservedElementFailureReason; // set when Canceled or TimedOut
    waitForElementDuration?: number; // ms actually spent waiting
    targetState?: {
        inDOM: boolean;
        isAccessible?: boolean;
        isFocusable?: boolean;
    };
    getCancelTriggeringElement?: () => HTMLElement | null;
}
```

`reason` is one of the
[`ObservedElementFailureReasons`](api-reference.md#constants) —
`TimeoutElementNotInDOM`, `TimeoutElementNotAccessible`,
`TimeoutElementNotFocusable`, `TimeoutElementNotReady`,
`CanceledFocusChange`, `SupersededByNewRequest`, or `FocusCallFailed`.

### `getAllObservedElements()`

Returns every currently registered observed element, grouped by name:

```ts
const all = observedElement.getAllObservedElements();
// Map<string, Array<{ element: HTMLElement; names: string[] }>>
```

### `onObservedElementChange`

An optional callback you can assign to be notified whenever an observed
element is added, removed, or has its names updated:

```ts
observedElement.onObservedElementChange = (change) => {
    // change.type: "added" | "removed" | "updated"
    // change.element, change.names, change.addedNames?, change.removedNames?
    console.log(change.type, change.element, change.names);
};
```

## Cross-origin lookups

Observed Element names are also reachable across `<iframe>` boundaries once
[Cross-Origin](cross-origin.md) support is set up — see
`crossOrigin.observedElement.requestFocus()` on that page.

## Examples

[See Observed Element examples in Storybook](https://tabster.io/storybook/?path=/story/observed),
including a live demo of `getAllObservedElements()`/`onObservedElementChange`
and a cross-iframe focus request.

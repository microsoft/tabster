# Observed Element <img src="/img/catobserved.png" width="166" height="128" style={{"vertical-align": "-40px"}} />

## About

Observed Element allows finding and focusing elements which are not yet in the DOM.

All we do is mark an element as observed by giving it a name.

```html
<button data-tabster='{"observed": {"name": "observedButton"}}'>
    Observed
</button>
```

## Setup

To get Observed Element working, we need to call `getObservedElement()` function:

```ts
import { createTabster, getObservedElement } from "tabster";

let tabsterCore = createTabster(window);

let observedElement = getObservedElement(tabsterCore);

observedElement.requestFocus("observedButton", 100500);
```

## Methods

### getElement()

Returns observed element by the name if it's present in the application.

```ts
import { createTabster, getObservedElement } from "tabster";

let tabsterCore = createTabster(window);

let observedElement = getObservedElement(tabsterCore);

let element = observedElement.getElement("observedButton");
```

### waitElement()

Waits for an element for the specified time, returns an element if it appears.

```ts
import { createTabster, getObservedElement, Types } from "tabster";

let tabsterCore = createTabster(window);

let observedElement = getObservedElement(tabsterCore);

let wait = observed.waitElement(
    "observedButton", // Name set using Tabster attribute.
    100500, // Timeout.
    Types.ObservedElementAccesibilities.Focusable // Only return when the
    // element becomes focusable.
);

// The result promise will be resolved once the element is mounted.
wait.result.then((value) => {
    console.log("Observed element:", value);
});

// We can also cancel the wait request.
wait.cancel();
```

### requestFocus()

Waits for the observed element to appear in the DOM and focuses it.

A consecutive `requestFocus()` call or a manual focus movement inside the application
will cancel the focus request automatically.

```ts
import { createTabster, getObservedElement, Types } from "tabster";

let tabsterCore = createTabster(window);

let observedElement = getObservedElement(tabsterCore);

let focus = observed.requestFocus("observedButton", 100500);

// The result promise will be resolved once the element is focused (or timed out).
focus.result.then((value: boolean) => {
    console.log("Observed element is focused:", value);
});

// We can also cancel the focus request.
focus.cancel();
```

## Examples

Here be dragons.

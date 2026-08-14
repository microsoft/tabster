---
title: Cross-Origin
---

# Cross-Origin <img src="/img/catcrossorigin.png" className="image image_header" alt="" />

## About

Iframes are isolated from each other for eventing purposes: pressing Tab in
one iframe doesn't tell any other iframe (or the host page) anything. The
Cross-Origin module bridges a limited, specific set of Tabster concerns
across iframe boundaries — most notably keyboard-navigation state and the
[Observed Element](observed.md) API — using `postMessage` under the hood.

This is an advanced, comparatively rare feature: only set it up if your
application actually spans multiple frames/windows and needs focus
coordination between them.

## Setup

Call `getCrossOrigin()` in **every** window/frame that should participate,
then call `.setup()` on the returned API to actually start listening for
messages:

```ts
import { createTabster, getCrossOrigin } from "tabster";

const tabster = createTabster(window);
const crossOrigin = getCrossOrigin(tabster);
crossOrigin.setup();
```

`getCrossOrigin()` lazily initializes [Deloser](deloser.md),
[Modalizer](modalizer.md), [Mover](mover.md), [Groupper](groupper.md),
[Outline](outline.md), and [Observed Element](observed.md) for you — you
don't need to call their `get*()` functions yourself first.

By default, `setup()` wires a frame to automatically forward messages to its
`window.parent` via `postMessage`. On the outermost window (the one with no
further parent to forward to, or where you want to take over message routing
yourself), you can pass a custom sender, or `null` to disable the default
forwarding:

```ts
function setup(
    sendUp?: Types.CrossOriginTransactionSend | null
): (msg: Types.CrossOriginMessage) => void;
```

`setup()` returns a message handler; wire it up to whatever transport you're
forwarding cross-origin messages over if you're not relying on the default
`postMessage`-to-parent behaviour.

## API

```ts
interface CrossOriginAPI {
    focusedElement: CrossOriginFocusedElementState;
    observedElement: CrossOriginObservedElementState;
    setup(
        sendUp?: CrossOriginTransactionSend | null
    ): (msg: CrossOriginMessage) => void;
    isSetUp(): boolean;
    dispose(): void;
}
```

### `observedElement`

Mirrors [`getObservedElement()`](observed.md), but resolves across frames —
elements are located and focused by name no matter which participating
frame they live in:

```ts
// From any participating frame:
crossOrigin.observedElement.requestFocus("myButton", 5000).then((focused) => {
    console.log("Focused across frames:", focused);
});
```

`observedElement.getElement()` and `waitElement()` resolve asynchronously to
`CrossOriginElement`s instead of plain `HTMLElement`s. `requestFocus()` resolves
to a boolean indicating whether focus was moved.

### `focusedElement`

Lets you focus an element in another frame, either by direct
`CrossOriginElement` reference (obtained via `observedElement`) or by id:

```ts
crossOrigin.focusedElement.focusById("some-element-id", "root-id");
```

You can also `subscribe()` to `focusedElement` to track focus as it moves
among elements in the participating frames.

## Examples

[See the "Target in Iframe" Observed Element story in
Storybook](https://tabster.io/storybook/?path=/story/observed--target-in-iframe)
for a working cross-origin `requestFocus()` example, and the `CrossOrigin`
test suite in the repository for lower-level usage.

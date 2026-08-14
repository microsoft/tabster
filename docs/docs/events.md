---
title: Events
---

# Events <img src="/img/catcore.png" className="image image_header" alt="" />

Tabster communicates state changes and lets you hook into (or override) its
keyboard handling via standard DOM `CustomEvent`s. Every event bubbles,
is cancelable, and is composed (crosses Shadow DOM boundaries). Event names
and classes are exported from the package root:

```ts
import {
    TabsterFocusInEventName,
    TabsterFocusInEvent,
    // ...and so on for every event below
} from "tabster";
```

All event classes extend an internal `TabsterCustomEvent<D>` base
(itself extending `CustomEvent<D>`), so `event.detail` is typed per event —
listed as "Detail" below. (`event.details`, with a trailing `s`, also exists
for backwards compatibility — prefer `detail`.)

You can listen the same way you would for any other DOM event:

```ts
document.addEventListener(TabsterMoveFocusEventName, (e) => {
    console.log(e.detail);
});
```

## Core focus events

| Name (constant)                                   | Class                   | Detail                                                                                  | Fired when                                                                                                                                |
| ------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `tabster:focusin` (`TabsterFocusInEventName`)     | `TabsterFocusInEvent`   | `FocusedElementDetail` (`relatedTarget?`, `isFocusedProgrammatically?`, `modalizerId?`) | The focused element tracked by the Tabster core changes to an element.                                                                    |
| `tabster:focusout` (`TabsterFocusOutEventName`)   | `TabsterFocusOutEvent`  | `FocusedElementDetail`                                                                  | Focus leaves the element currently tracked by the Tabster core.                                                                           |
| `tabster:movefocus` (`TabsterMoveFocusEventName`) | `TabsterMoveFocusEvent` | `{ by, owner, next, relatedEvent? }`                                                    | Tabster is about to perform an interceptable focus move. Call `preventDefault()` to stop Tabster's proposed move and substitute your own. |

`TabsterMoveFocusEventDetail.by` is `"mover" | "groupper" | "modalizer" |
"root" | "deloser"`, `owner` is the element that initiated the move, and
`next` is the element Tabster intends to focus (`null` means "leave the
Tabster root entirely", e.g. to the browser's own UI).

This is the general interception point for Tabster-initiated focus movement
that exposes a proposed destination. Calling `preventDefault()` on the custom
event tells Tabster not to perform that move; the listener can then focus its
own destination. If a native keyboard action also needs to be suppressed,
prevent its `relatedEvent` as well.

```ts
document.addEventListener("tabster:movefocus", (e) => {
    if (e.detail?.relatedEvent?.key === "Enter") {
        e.preventDefault();
        e.detail.relatedEvent.preventDefault();
        customElement.focus();
    }
});
```

## Mover events

| Name (constant)                                                      | Class                        | Detail                                            | Fired when                                                                                                         |
| -------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `tabster:mover:state` (`MoverStateEventName`)                        | `MoverStateEvent`            | `MoverElementState` (`{ isCurrent, visibility }`) | A Mover item's tracked state changes (requires `trackState`/`visibilityAware` — see [Mover](mover.md#trackstate)). |
| `tabster:mover:movefocus` (`MoverMoveFocusEventName`)                | `MoverMoveFocusEvent`        | `{ key: MoverKey }`                               | Dispatch this **to** a Mover element yourself to programmatically move its focus, as if a key had been pressed.    |
| `tabster:mover:memorized-element` (`MoverMemorizedElementEventName`) | `MoverMemorizedElementEvent` | `{ memorizedElement: HTMLElement \| undefined }`  | Dispatch this **to** a Mover element to forget or override its `memorizeCurrent` element.                          |

```ts
document.addEventListener("tabster:mover:state", (e) => {
    const target = e.composedPath()[0] as HTMLElement;
    target.classList.toggle("current", !!e.detail?.isCurrent);
});
```

## Groupper events

| Name (constant)                                             | Class                    | Detail                                | Fired when                                                                                                                     |
| ----------------------------------------------------------- | ------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `tabster:groupper:movefocus` (`GroupperMoveFocusEventName`) | `GroupperMoveFocusEvent` | `{ action: GroupperMoveFocusAction }` | Dispatch this **to** a Groupper element to programmatically enter (`GroupperMoveFocusActions.Enter`) or escape (`.Escape`) it. |

## Modalizer events

| Name (constant)                                             | Class                    | Detail            | Fired when                                                                                                                           |
| ----------------------------------------------------------- | ------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `tabster:modalizer:active` (`ModalizerActiveEventName`)     | `ModalizerActiveEvent`   | `{ id, element }` | A Modalizer becomes active.                                                                                                          |
| `tabster:modalizer:inactive` (`ModalizerInactiveEventName`) | `ModalizerInactiveEvent` | `{ id, element }` | A Modalizer becomes inactive.                                                                                                        |
| `tabster:modalizer:focusin` (`ModalizerFocusInEventName`)   | —                        | —                 | Reserved: exported as a name constant, but Tabster does not currently dispatch this event and there is no corresponding event class. |
| `tabster:modalizer:focusout` (`ModalizerFocusOutEventName`) | —                        | —                 | Reserved: exported as a name constant, but Tabster does not currently dispatch this event and there is no corresponding event class. |

## Deloser events

| Name (constant)                                                  | Class                      | Detail                  | Fired when                                                                                                                                                                                                     |
| ---------------------------------------------------------------- | -------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tabster:deloser:focus-lost` (`DeloserFocusLostEventName`)       | `DeloserFocusLostEvent`    | `DeloserElementActions` | Focus was lost from a Deloser and Tabster couldn't automatically find where to restore it (or `strategy: Manual` was set — see [Deloser](deloser.md#strategy)). Handle this to implement custom restore logic. |
| `tabster:deloser:restore-focus` (`DeloserRestoreFocusEventName`) | `DeloserRestoreFocusEvent` | `undefined`             | Dispatch this **to** a `Manual`-strategy Deloser element to trigger its restore.                                                                                                                               |

## Restorer events

| Name (constant)                                                    | Class                       | Detail      | Fired when                                                                                                        |
| ------------------------------------------------------------------ | --------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `tabster:restorer:restore-focus` (`RestorerRestoreFocusEventName`) | `RestorerRestoreFocusEvent` | `undefined` | A [Restorer](restorer.md) `Source` lost focus to `<body>` and is asking to restore it to the last known `Target`. |

## Root events

| Name (constant)                             | Class            | Detail        | Fired when                   |
| ------------------------------------------- | ---------------- | ------------- | ---------------------------- |
| `tabster:root:focus` (`RootFocusEventName`) | `RootFocusEvent` | `{ element }` | Focus enters a Tabster root. |
| `tabster:root:blur` (`RootBlurEventName`)   | `RootBlurEvent`  | `{ element }` | Focus leaves a Tabster root. |

## Deprecated dispatch helpers

Three deprecated functions wrap `element.dispatchEvent(new ...Event(...))`
for the "dispatch to" events above — prefer dispatching the events directly:

| Deprecated function                              | Equivalent to                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `dispatchMoverMoveFocusEvent(target, key)`       | `target.dispatchEvent(new MoverMoveFocusEvent({ key }))`                         |
| `dispatchMoverMemorizedElementEvent(target, el)` | `target.dispatchEvent(new MoverMemorizedElementEvent({ memorizedElement: el }))` |
| `dispatchGroupperMoveFocusEvent(target, action)` | `target.dispatchEvent(new GroupperMoveFocusEvent({ action }))`                   |

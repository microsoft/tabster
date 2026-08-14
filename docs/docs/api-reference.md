---
title: API Reference
---

# API Reference <img src="/img/favicon.png" className="image image_header" alt="" />

Complete reference of everything exported from the `tabster` package root
(`import { ... } from "tabster"`), grouped by category. For guided
walkthroughs, prefer [Getting Started](intro.md) and the feature pages
linked throughout.

## Lifecycle functions

| Export            | Signature                                                        | Description                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createTabster`   | `(win: Window, props?: Types.TabsterCoreProps) => Types.Tabster` | Creates (or attaches an additional handle to) the Tabster instance for `win`. See [Core](core.md#tabstercoreprops).                                    |
| `disposeTabster`  | `(tabster: Types.Tabster, allInstances?: boolean) => void`       | Releases a handle from `createTabster()`.                                                                                                              |
| `getTabster`      | `(win: Window) => Types.Tabster \| null`                         | Returns the existing instance for `win`, without creating one.                                                                                         |
| `forceCleanup`    | `(tabster: Types.Tabster) => void`                               | Asynchronously forgets memorized focus history; use after tearing down the whole app DOM.                                                              |
| `makeNoOp`        | `(tabster: Types.Tabster, noop: boolean) => void`                | Switches a live instance in/out of no-op mode.                                                                                                         |
| `isNoOp`          | `(tabster: Types.TabsterCore) => boolean`                        | Reports whether an instance is currently in no-op mode. Takes `tabster.core`, not the `Tabster` handle.                                                |
| `getInternal`     | `(tabster: Types.Tabster) => Types.InternalAPI`                  | Advanced: returns `{ stopObserver(), resumeObserver(syncState) }` to pause/resume Tabster's DOM mutation observer.                                     |
| `getShadowDOMAPI` | `() => Types.DOMAPI`                                             | Returns the Shadow-DOM-aware `DOMAPI` implementation; pass it as `createTabster(win, { DOMAPI: getShadowDOMAPI() })`. See [Shadow DOM](shadow-dom.md). |

See [Core](core.md#lifecycle-functions) for narrative documentation and the
full `TabsterCoreProps` table.

## Feature accessors (`get*`)

Each of these lazily creates its feature's API the first time it's called
for a given Tabster instance, and enables the matching `data-tabster` key.

| Export               | Signature                                                                                                                                    | Enables                                      | Docs                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------- |
| `getMover`           | `(tabster: Types.Tabster) => Types.MoverAPI`                                                                                                 | `mover`                                      | [Mover](mover.md)               |
| `getGroupper`        | `(tabster: Types.Tabster) => Types.GroupperAPI`                                                                                              | `groupper`                                   | [Groupper](groupper.md)         |
| `getDeloser`         | `(tabster: Types.Tabster) => Types.DeloserAPI`                                                                                               | `deloser`                                    | [Deloser](deloser.md)           |
| `getModalizer`       | `(tabster: Types.Tabster, alwaysAccessibleSelector?: string, accessibleCheck?: Types.ModalizerElementAccessibleCheck) => Types.ModalizerAPI` | `modalizer`                                  | [Modalizer](modalizer.md)       |
| `getRestorer`        | `(tabster: Types.Tabster) => Types.RestorerAPI`                                                                                              | `restorer`                                   | [Restorer](restorer.md)         |
| `getOutline`         | `(tabster: Types.Tabster) => Types.OutlineAPI`                                                                                               | `outline` (call `.setup()` too)              | [Outline](outline.md)           |
| `getObservedElement` | `(tabster: Types.Tabster) => Types.ObservedElementAPI`                                                                                       | `observed`                                   | [Observed Element](observed.md) |
| `getCrossOrigin`     | `(tabster: Types.Tabster) => Types.CrossOriginAPI`                                                                                           | — (cross-iframe wiring, call `.setup()` too) | [Cross-Origin](cross-origin.md) |

`getModalizer`'s second parameter, `alwaysAccessibleSelector`, is
**deprecated** in favor of the third, `accessibleCheck`.
`getCrossOrigin()` transitively calls `getDeloser`, `getModalizer`,
`getMover`, `getGroupper`, `getOutline`, and `getObservedElement` for you.

## `getDummyInputContainer`

```ts
function getDummyInputContainer(
    element: HTMLElement | null | undefined
): HTMLElement | null;
```

Given a DOM node, returns the Mover/Groupper/Modalizer/Root container it
belongs to if the node is one of Tabster's invisible dummy inputs, or `null`
otherwise. Mostly useful for tests/tooling that need to recognize (and
usually ignore) these implementation-detail nodes — see [How it
works](concept.md#letting-the-browser-tab-and-redirecting-when-necessary).

## Attribute helpers

| Export                | Signature                                                                                   | Description                                              |
| --------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `getTabsterAttribute` | `(props: Types.TabsterAttributeProps, plain?: true) => Types.TabsterDOMAttribute \| string` | Builds the `data-tabster` attribute value.               |
| `setTabsterAttribute` | `(element: HTMLElement, newProps: Types.TabsterAttributeProps, update?: boolean) => void`   | Sets/updates `data-tabster` on an existing element.      |
| `mergeTabsterProps`   | `(props: Types.TabsterAttributeProps, newProps: Types.TabsterAttributeProps) => void`       | Merges one attribute-props object into another in place. |

See [Attribute Helpers](attribute-helpers.md) for full documentation and
examples.

## Constants

Every constant below is a plain `{ Name: number }` object (not a TypeScript
`enum`), exported both as the value and, in the `Types` namespace, as the
corresponding union type (e.g. the value `MoverDirections` and the type
`Types.MoverDirection`).

| Export                               | Members                                                                                                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TABSTER_ATTRIBUTE_NAME`             | `"data-tabster"` (string constant, not an object)                                                                                                                                   |
| `TABSTER_DUMMY_INPUT_ATTRIBUTE_NAME` | `"data-tabster-dummy"` (string constant)                                                                                                                                            |
| `FOCUSABLE_SELECTOR`                 | The CSS selector Tabster uses to find natively-focusable elements (string constant)                                                                                                 |
| `AsyncFocusSources`                  | `EscapeGroupper`, `Restorer`, `Deloser`                                                                                                                                             |
| `ObservedElementAccessibilities`     | `Any`, `Accessible`, `Focusable`                                                                                                                                                    |
| `ObservedElementRequestStatuses`     | `Waiting`, `Succeeded`, `Canceled`, `TimedOut`                                                                                                                                      |
| `ObservedElementFailureReasons`      | `CanceledFocusChange`, `TimeoutElementNotInDOM`, `TimeoutElementNotAccessible`, `TimeoutElementNotFocusable`, `TimeoutElementNotReady`, `SupersededByNewRequest`, `FocusCallFailed` |
| `RestoreFocusOrders`                 | `History`, `DeloserDefault`, `RootDefault`, `DeloserFirst`, `RootFirst`                                                                                                             |
| `DeloserStrategies`                  | `Auto`, `Manual`                                                                                                                                                                    |
| `Visibilities`                       | `Invisible`, `PartiallyVisible`, `Visible`                                                                                                                                          |
| `RestorerTypes`                      | `Source`, `Target`                                                                                                                                                                  |
| `MoverDirections`                    | `Both`, `Vertical`, `Horizontal`, `Grid`, `GridLinear`                                                                                                                              |
| `MoverKeys`                          | `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `PageUp`, `PageDown`, `Home`, `End`                                                                                              |
| `GroupperTabbabilities`              | `Unlimited`, `Limited`, `LimitedTrapFocus`                                                                                                                                          |
| `GroupperMoveFocusActions`           | `Enter`, `Escape`                                                                                                                                                                   |
| `SysDummyInputsPositions`            | `Auto`, `Inside`, `Outside`                                                                                                                                                         |

Related feature pages document what each member means in context:
[Observed Element](observed.md), [Deloser](deloser.md), [Restorer](restorer.md),
[Mover](mover.md), [Groupper](groupper.md).

## Events

All event name constants and event classes are exported from the package
root — see [Events](events.md) for the full table of names, classes, detail
shapes, and usage examples. Quick index:

- Core: `TabsterFocusInEventName`/`TabsterFocusInEvent`,
  `TabsterFocusOutEventName`/`TabsterFocusOutEvent`,
  `TabsterMoveFocusEventName`/`TabsterMoveFocusEvent`.
- Mover: `MoverStateEventName`/`MoverStateEvent`,
  `MoverMoveFocusEventName`/`MoverMoveFocusEvent`,
  `MoverMemorizedElementEventName`/`MoverMemorizedElementEvent`.
- Groupper: `GroupperMoveFocusEventName`/`GroupperMoveFocusEvent`.
- Modalizer: `ModalizerActiveEventName`/`ModalizerActiveEvent`,
  `ModalizerInactiveEventName`/`ModalizerInactiveEvent`,
  `ModalizerFocusInEventName`, `ModalizerFocusOutEventName` (reserved name
  constants only — not currently dispatched, no event class exists).
- Deloser: `DeloserFocusLostEventName`/`DeloserFocusLostEvent`,
  `DeloserRestoreFocusEventName`/`DeloserRestoreFocusEvent`.
- Restorer: `RestorerRestoreFocusEventName`/`RestorerRestoreFocusEvent`.
- Root: `RootFocusEventName`/`RootFocusEvent`,
  `RootBlurEventName`/`RootBlurEvent`.
- Base class: `TabsterCustomEvent<D>` (abstract, extended by all of the
  above).

## `Types` namespace

```ts
import type { Types } from "tabster";
```

A namespace holding every TypeScript type Tabster's API surface uses —
props interfaces (`MoverProps`, `GroupperProps`, `ModalizerProps`,
`DeloserProps`, `RestorerProps`, `OutlineProps`, `ObservedElementProps`,
`UncontrolledProps`, `FocusableProps`, `RootProps`, `SysProps`,
`TabsterAttributeProps`), API interfaces (`Tabster`, `TabsterCore`,
`MoverAPI`, `GroupperAPI`, `ModalizerAPI`, `DeloserAPI`, `RestorerAPI`,
`OutlineAPI`, `ObservedElementAPI`, `CrossOriginAPI`, `FocusableAPI`,
`UncontrolledAPI`, `FocusedElementState`, `KeyboardNavigationState`), the
`find*()` options types (`FindFirstProps`, `FindNextProps`, `FindAllProps`,
`FindFocusableOutputProps`, ...), and the
type aliases derived from each constant object above (e.g.
`Types.MoverDirection` for the `MoverDirections` values). These members are
TypeScript types and are erased from emitted application code; use the
package-root constants for runtime values.

The `Tabster` instance's `uncontrolled` member and its
`isUncontrolledCompletely()` method are documented in the
[Uncontrolled guide](uncontrolled.md#programmatic-api).

## `EventsTypes` namespace

```ts
import type { EventsTypes } from "tabster";
```

Compile-time-only detail-payload types for the events documented on the
[Events](events.md) page: `TabsterMoveFocusEventDetail`,
`MoverMoveFocusEventDetail`, `MoverMemorizedElementEventDetail`,
`GroupperMoveFocusEventDetail`, `ModalizerEventDetail`,
`RootFocusEventDetail`.

## Deprecated exports

| Export                                            | Use instead                                                                      |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `dispatchMoverMoveFocusEvent(target, key)`        | `target.dispatchEvent(new MoverMoveFocusEvent({ key }))`                         |
| `dispatchMoverMemorizedElementEvent(target, el)`  | `target.dispatchEvent(new MoverMemorizedElementEvent({ memorizedElement: el }))` |
| `dispatchGroupperMoveFocusEvent(target, action)`  | `target.dispatchEvent(new GroupperMoveFocusEvent({ action }))`                   |
| `TabsterCoreProps.checkUncontrolledTrappingFocus` | `TabsterCoreProps.checkUncontrolledCompletely`                                   |
| `getModalizer(tabster, alwaysAccessibleSelector)` | `getModalizer(tabster, undefined, accessibleCheck)`                              |
| `TabsterCustomEvent.details`                      | `event.detail` (standard `CustomEvent` property)                                 |

See [Events](events.md#deprecated-dispatch-helpers) for the dispatch-helper
equivalents in context.

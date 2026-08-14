---
title: Getting Started
---

# Getting Started <img src="/img/catgettingstarted.png" className="image image_header" alt="" />

**Tabster** is a small, dependency-free layer on top of the DOM that adds the
keyboard navigation behaviours browsers don't provide out of the box: moving
focus with arrow keys, grouping buttons so Tab doesn't have to visit every one
of them, trapping focus in dialogs, restoring focus when the focused element
disappears, and more. Everything is opt-in, tree-shakeable, and driven by a
single `data-tabster` attribute.

## Installation

```bash
npm install tabster
```

Tabster ships as ESM and CJS builds with bundled TypeScript types, so no
`@types` package is needed.

## The lifecycle: create, use, dispose

Call `createTabster()` once per `window` during application startup. It
returns a lightweight `Tabster` handle and starts watching `data-tabster`
attributes in that window's DOM.

```ts
import { createTabster, disposeTabster } from "tabster";

const tabster = createTabster(window);

// ...later, when the application unmounts (or the window/iframe goes away):
disposeTabster(tabster);
```

- `createTabster(window)` returns the **same underlying core** for repeated
  calls with the same `window`, so it's safe to call it again anywhere you
  need the instance (for example inside a component that needs `focusable`).
  Each call still returns its own handle that must be individually disposed.
- `disposeTabster(tabster)` releases that handle. The underlying core (event
  listeners, DOM observer, etc.) is only torn down once every handle for that
  window has been disposed — pass `disposeTabster(tabster, true)` to force a
  full teardown regardless of how many handles exist.
- Forgetting to dispose leaks listeners and observers, which matters most in
  multi-window apps (popups, Electron, iframes) where windows come and go.

## The root: where Tabster starts managing focus

Tabster's navigation features need to know which part of the DOM they manage.
You mark that boundary with a **root**, using the `root` key of the
`data-tabster` attribute on a container that wraps your application (or the
part of it you want Tabster to manage):

```tsx
import { getTabsterAttribute } from "tabster";

<div {...getTabsterAttribute({ root: {} })}>{/* your app */}</div>;
```

The Tabster core instance itself always exists after `createTabster()`, but
navigation features such as Mover, Groupper, and Modalizer need an authored or
automatic root to participate in the application focus model. Utilities that
do not depend on navigation context, such as Observed Element, can operate
without a root.
Alternatively, pass `autoRoot` to `createTabster()` to make Tabster create a
root for the whole document automatically, without adding the attribute by
hand:

```ts
const tabster = createTabster(window, { autoRoot: {} });
```

## Opting into features with `get*()` helpers

Tabster's core only understands the root and a couple of baseline concerns
(focus tracking, keyboard-navigation detection, focusable-element lookup).
Everything else — Mover, Groupper, Modalizer, Deloser, Restorer, Outline,
Observed Element, and Cross-Origin support — is a separate module that has to
be explicitly requested with a `get*()` function before its `data-tabster`
key does anything. This is what keeps Tabster tree-shakeable: a bundler can
drop any feature module you never call `get*()` for.

```ts
import { createTabster, getMover, getGroupper } from "tabster";

const tabster = createTabster(window);

// Enables the `mover` and `groupper` data-tabster keys for this window.
getMover(tabster);
getGroupper(tabster);
```

Call the relevant `get*()` function once, right after `createTabster()`. Each
one also returns an API object for programmatic use (see the feature pages
for details):

| Function                            | Enables `data-tabster` key | Also usable as an API               |
| ----------------------------------- | -------------------------- | ----------------------------------- |
| [`getMover`](mover.md)              | `mover`                    | Advanced/internal only              |
| [`getGroupper`](groupper.md)        | `groupper`                 | Advanced/internal only              |
| [`getModalizer`](modalizer.md)      | `modalizer`                | `.focus()`, `.activate()`           |
| [`getDeloser`](deloser.md)          | `deloser`                  | `.pause()`, `.resume()`             |
| [`getRestorer`](restorer.md)        | `restorer`                 | —                                   |
| [`getOutline`](outline.md)          | `outline`                  | `.setup(props)` (**required**)      |
| [`getObservedElement`](observed.md) | `observed`                 | `.requestFocus()`, `.waitElement()` |
| [`getCrossOrigin`](cross-origin.md) | — (cross-iframe wiring)    | `.setup()` (**required**)           |

[`uncontrolled`](uncontrolled.md) and `focusable` (the
`isDefault`/`isIgnored`/etc. props) are part of the core and never need a
`get*()` call.

## The `data-tabster` attribute

The `data-tabster` attribute is a JSON blob describing every feature enabled
on that element, keyed by feature name (`root`, `mover`, `groupper`,
`modalizer`, `deloser`, `restorer`, `outline`, `observed`, `uncontrolled`,
`focusable`, `sys`). You should never hand-write that JSON — use the
provided helpers instead:

- **`getTabsterAttribute(props)`** builds the `{ "data-tabster": "..." }`
  object you spread onto JSX/DOM elements.
- **`setTabsterAttribute(element, props, update?)`** imperatively sets or
  merges the attribute on an existing `HTMLElement`.
- **`mergeTabsterProps(props, newProps)`** merges two attribute-prop objects
  in place (used internally by `setTabsterAttribute`, also handy on its
  own).

See [Attribute Helpers](attribute-helpers.md) for the full reference.

## Cleanup and no-op behavior

- **`disposeTabster(tabster)`** — the normal per-window teardown described
  above.
- **`forceCleanup(tabster)`** — for the rare case where you've torn down the
  entire application DOM (for example between end-to-end test cases) and
  won't be mounting new DOM for a while. It asynchronously forgets memorized
  elements so Tabster doesn't hold references to detached nodes.
- **`makeNoOp(tabster, true)`** — switches a running Tabster instance into a
  no-op mode without touching your application code, useful for performance
  debugging. Call `makeNoOp(tabster, false)` to turn it back on. `isNoOp(tabster.core)`
  reports the current state.

## A minimal complete example

```tsx
import * as React from "react";
import { createRoot } from "react-dom/client";
import {
    createTabster,
    getGroupper,
    getMover,
    getTabsterAttribute,
    GroupperTabbabilities,
    MoverDirections,
} from "tabster";

// 1. Create the Tabster instance once, during startup.
const tabster = createTabster(window);

// 2. Opt into the features you use.
getMover(tabster);
getGroupper(tabster);

function App() {
    return (
        // 3. Mark the application root — Tabster only manages focus inside it.
        <div {...getTabsterAttribute({ root: {} })}>
            {/* Up/Down arrow keys move between the list items. */}
            <ul
                {...getTabsterAttribute({
                    mover: { direction: MoverDirections.Vertical },
                })}
            >
                {["First", "Second", "Third"].map((label) => (
                    <li
                        key={label}
                        tabIndex={0}
                        // Enter moves focus inside the item, Escape moves back out.
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                        })}
                    >
                        <button>{label} action A</button>
                        <button>{label} action B</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

const container = document.getElementById("root");
if (container) {
    createRoot(container).render(<App />);
}
```

The rendered markup looks like this:

```html
<div data-tabster='{"root":{}}'>
    <ul data-tabster='{"mover":{"direction":1}}'>
        <li tabindex="0" data-tabster='{"groupper":{"tabbability":2}}'>
            <button>First action A</button>
            <button>First action B</button>
        </li>
        <li tabindex="0" data-tabster='{"groupper":{"tabbability":2}}'>
            <button>Second action A</button>
            <button>Second action B</button>
        </li>
        <li tabindex="0" data-tabster='{"groupper":{"tabbability":2}}'>
            <button>Third action A</button>
            <button>Third action B</button>
        </li>
    </ul>
</div>
```

## Where to go next

- [Concepts](concept.md) — the mental model behind Tabster.
- [Core](core.md) — the always-available core APIs (`keyboardNavigation`,
  `focusedElement`, `focusable`, `root`, `uncontrolled`).
- Feature pages: [Mover](mover.md), [Groupper](groupper.md),
  [Deloser](deloser.md), [Modalizer](modalizer.md), [Observed
  Element](observed.md), [Restorer](restorer.md), [Outline](outline.md),
  [Cross-Origin](cross-origin.md).
- [API Reference](api-reference.md) — every export of the `tabster` package.

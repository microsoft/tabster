---
title: Uncontrolled
---

# Uncontrolled <img src="/img/catuncontrolled.png" className="image image_header" alt="" />

Uncontrolled regions let native browser behavior or a third-party component
manage focus within part of a Tabster root. They are useful when embedding a
widget that already implements keyboard behavior, such as roving `tabindex`,
a data grid, an editor, or a custom focus trap.

Uncontrolled support is part of the core. It does not require a `get*()`
initializer.

## Mark a region as uncontrolled

Use [`getTabsterAttribute`](attribute-helpers.md) like any other Tabster
attribute:

```tsx
import { getTabsterAttribute } from "tabster";

function ThirdPartyWidget() {
    return (
        <div {...getTabsterAttribute({ uncontrolled: {} })}>
            <button>First widget action</button>
            <button>Second widget action</button>
        </div>
    );
}
```

Tabster manages keyboard navigation up to the region's boundary. Inside the
region, native browser behavior and the component's own event handlers decide
where focus moves. When focus leaves the region, Tabster resumes normal
navigation.

`uncontrolled` and [`controlTab`](core.md#tabstercoreprops) are independent
settings and must not be treated as two names for the same behavior:

- `controlTab` selects the Tab-navigation model for the whole application:
  either Tabster calculates the next target programmatically, or the browser
  follows native tab order with dummy-input redirection where necessary.
- `uncontrolled: {}` marks one subtree whose internal focus behavior belongs
  to the browser or another component. It can be used whether `controlTab` is
  `true` or `false` and does not change the application-wide model.

## `UncontrolledProps`

```ts
interface UncontrolledProps {
    completely?: boolean;
}
```

| Property     | Default | Description                                                                                                                                                                                                  |
| ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `completely` | `false` | Gives the region full control of Tab handling. Without it, Tabster can still intervene at the boundary when required by surrounding features, such as skipping an inactive Modalizer. Use this with caution. |

The default is appropriate for components such as roving-`tabindex` widgets:
they own movement inside the region while remaining part of the surrounding
application's tab order.

Set `completely: true` only when the embedded component must own every Tab
press, typically because it implements a focus trap:

```tsx
<div
    {...getTabsterAttribute({
        uncontrolled: { completely: true },
    })}
>
    <ThirdPartyFocusTrap />
</div>
```

The component is then responsible for correct forward and backward navigation.
An incorrect trap can prevent keyboard users from leaving the region.

## Choose complete control dynamically

Use `checkUncontrolledCompletely` when complete control depends on application
state:

```ts
import { createTabster } from "tabster";

const tabster = createTabster(window, {
    checkUncontrolledCompletely: (element, completely) => {
        if (element.matches("[data-focus-trap-active]")) {
            return true;
        }

        // Use the value from uncontrolled.completely.
        return undefined;
    },
});
```

The callback receives the uncontrolled element and its current `completely`
attribute value:

- Return `true` to give the region complete control.
- Return `false` to let Tabster coordinate its boundary.
- Return `undefined` to use the element's `uncontrolled.completely` value.

`checkUncontrolledTrappingFocus` is the deprecated predecessor of this option.

## Programmatic API

Every Tabster instance exposes `tabster.uncontrolled`:

```ts
interface UncontrolledAPI {
    isUncontrolledCompletely(
        element: HTMLElement,
        completely: boolean
    ): boolean;
}
```

`isUncontrolledCompletely()` applies the configured
`checkUncontrolledCompletely` callback and falls back to the supplied
`completely` value when the callback returns `undefined`. Most applications
only need the attribute and core callback; this method is useful to integrations
that need to resolve the same policy as Tabster.

## Interactions and search behavior

- Uncontrolled regions can be nested or consecutive.
- Mover and Groupper can be used inside an uncontrolled region. Their own
  navigation behavior remains active once the corresponding `get*()` API has
  been initialized.
- Uncontrolled does not disable Modalizer accessibility behavior. Surrounding
  modal state can still affect whether the region is reachable unless it has
  complete control.
- `focusable.findFirst()`, `findLast()`, `findNext()`, `findPrev()`, and
  `findElement()` can return `undefined` when an uncontrolled boundary prevents
  Tabster from determining the next element. Pass a
  `Types.FindFocusableOutputProps` object to inspect its `uncontrolled`
  container.

```ts
import { type Types } from "tabster";

const output: Types.FindFocusableOutputProps = {};
const next = tabster.focusable.findNext(
    {
        container: document.body,
        currentElement: document.activeElement as HTMLElement,
    },
    output
);

if (next === undefined && output.uncontrolled) {
    // Native or component-owned focus handling decides what happens next.
}
```

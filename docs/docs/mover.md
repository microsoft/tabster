---
title: Mover
---

# Mover <img src="/img/catmover.png" className="image image_header" alt="" />

## About

Mover lets focus move within a container using the arrow keys (plus
Home/End/PageUp/PageDown), instead of requiring a Tab press per item.

```html
<div data-tabster='{"mover": {}}'>
    <button>Button1</button>
    <button>Button2</button>
    <button>Button3</button>
</div>
```

Normally reaching `Button3` from `Button1` takes two Tab presses. With Mover
enabled, arrow keys move between the buttons, and a single Tab press moves
focus out of the whole container (unless `tabbable` is set — see below).

Mover plays well with [Groupper](groupper.md): a common pattern is a Mover
list whose items are each a Groupper, so arrow keys move between items and
Enter/Escape moves into/out of an item's own focusable content.

## Setup

Call `getMover()` once to enable the `mover` `data-tabster` key:

```ts
import { createTabster, getMover } from "tabster";

const tabster = createTabster(window);
getMover(tabster);
```

## Properties

```ts
interface MoverProps {
    direction?: MoverDirection;
    memorizeCurrent?: boolean;
    tabbable?: boolean;
    cyclic?: boolean;
    trackState?: boolean;
    visibilityAware?: Visibility;
    hasDefault?: boolean;
    visibilityTolerance?: number;
}
```

### `direction`

`Both | Vertical | Horizontal | Grid | GridLinear`

The default, `Both`, moves focus to the previous/next focusable element for
either Up/Left or Down/Right presses. `Vertical` only responds to Up/Down,
`Horizontal` only to Left/Right.

`Grid` moves focus to the visually adjacent item based on layout (useful for
a grid of cards or table cells) — arrow keys don't wrap between rows.
`GridLinear` behaves like `Grid` but additionally allows linear movement:
pressing Right past the last item of a row continues onto the first item of
the next row (and Left/wrap the other way).

```tsx
import {
    createTabster,
    getMover,
    getTabsterAttribute,
    MoverDirections,
} from "tabster";

const tabster = createTabster(window);
getMover(tabster);

<div
    {...getTabsterAttribute({
        mover: { direction: MoverDirections.Grid },
    })}
>
    {/* grid items */}
</div>;
```

### `memorizeCurrent`

When Tabbing into the Mover from outside, focus normally lands on the first
element (or last, if Tabbing backwards). With `memorizeCurrent: true`,
Tabster remembers the last element you interacted with inside the Mover and
returns focus there instead, if it's still available.

### `tabbable`

By default, pressing Tab while inside a Mover moves focus _out_ of the Mover
entirely (so you can Tab past a long or infinite list in one press). Set
`tabbable: true` to let both Tab and the arrow keys move within the Mover.

### `cyclic`

By default, pressing an arrow key on the last item does nothing further.
With `cyclic: true`, it wraps around to the first item (and vice versa).

### `trackState`

When set, Mover tracks each item's visibility and dispatches a
[`tabster:mover:state`](events.md#mover-events) custom event with that state
(`{ isCurrent, visibility }`) whenever it changes. Only enable this when you
actually consume the event — tracking visibility for every item has a real
performance cost, especially for long lists.

### `visibilityAware`

`Invisible | PartiallyVisible | Visible`

By default, Tabbing into a Mover from outside focuses the first _rendered_
focusable element, which can force a virtualized list to scroll and load
more items just to reach it. `visibilityAware` changes that to focus the
first element that is actually visible (at or above the given visibility
level) instead. Implicitly enables `trackState`.

### `hasDefault`

Defaults to `true`. When enabled, Mover prioritizes an element marked
`focusable: { isDefault: true }` (see [Focusable element
properties](core.md#focusable-element-properties)) as the element to focus
when entering from outside.

### `visibilityTolerance`

A number between `0` and `1` (default `0.8`) controlling how much of an
element must remain vertically visible when Page Up or Page Down searches for
its destination. For example, an element that's 10% clipped by its scroll
container still qualifies at the default tolerance.

## Custom navigation

Mover's key handling is replaceable one key at a time. Set
[`focusable.ignoreKeydown`](core.md#focusable-element-properties) on an element
or ancestor to stop Tabster from handling selected keys there, then use your
own input or application state to dispatch:

- `MoverMoveFocusEvent` to ask the containing Mover to perform a movement
  command using its normal direction, visibility, and boundary rules.
- `MoverMemorizedElementEvent` to replace or clear the item used by
  `memorizeCurrent`.

`MoverStateEvent` also exposes current-item and visibility changes when
`trackState` is enabled. Together, these
[Mover events](events.md#mover-events) support custom key maps, command
surfaces, and controlled selection models without reimplementing Mover's
focus traversal.

For Mover's built-in keyboard handling, Tabster also dispatches
[`tabster:movefocus`](events.md#core-focus-events) before applying the proposed
focus change. Preventing that event cancels the move, allowing a listener to
substitute a different destination while leaving Mover's behavior unchanged
for all other cases.

## Examples

[See Mover examples in Storybook](https://tabster.io/storybook/?path=/story/mover).

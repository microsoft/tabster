---
title: Groupper
---

# Groupper <img src="/img/catgroupper.png" className="image image_header" alt="" />

## About

Groupper controls whether a set of focusable elements participates normally in
Tab order or behaves as a single entry point with an explicit interaction
mode.

Consider a chat message that contains a few inner buttons (reactions,
reply, ...). Without Groupper, reaching the message input below a long
conversation means Tabbing through every inner button of every message.
With a `Limited` Groupper on each message, a single Tab reaches (or leaves) the
whole message, and pressing Enter on the message moves focus inside it, to its
own buttons; Escape moves back out.

An element with `groupper` should itself be focusable (typically
`tabindex={0}`):

```html
<div
    data-tabster='{"groupper":{"tabbability":1}}'
    tabindex="0"
    title="Message actions"
>
    <button>Like</button>
    <button>Reply</button>
</div>
```

Groupper plays well with [Mover](mover.md) — a common pattern is a Mover list
whose items are each a Groupper.

## Setup

Call `getGroupper()` once to enable the `groupper` `data-tabster` key:

```ts
import { createTabster, getGroupper } from "tabster";

const tabster = createTabster(window);
getGroupper(tabster);
```

## Properties

```ts
interface GroupperProps {
    tabbability?: GroupperTabbability;
    delegated?: boolean;
}
```

### `tabbability`

`Unlimited | Limited | LimitedTrapFocus`

With `Unlimited` (the default when omitted), the Groupper's inner elements
are reachable by Tab like normal — [Mover](mover.md) still treats the whole
Groupper as one entity for arrow-key navigation, but no extra Enter press is
required to get inside it.

With `Limited`, an Enter press is required to move focus from the Groupper
container to its first inner focusable element (and Escape moves back out
to the container). Once inside, Tab moves between the Groupper's own
focusables; Tabbing past the last one moves focus outside the Groupper
entirely.

`LimitedTrapFocus` behaves like `Limited`, except Tab is trapped inside the
Groupper once activated — reaching the last inner focusable and pressing Tab
again wraps back to the first one instead of leaving the Groupper.

```tsx
import { getTabsterAttribute, GroupperTabbabilities } from "tabster";

<div
    tabIndex={0}
    {...getTabsterAttribute({
        groupper: { tabbability: GroupperTabbabilities.LimitedTrapFocus },
    })}
>
    <button>Button1</button>
    <button>Button2</button>
</div>;
```

### `delegated`

Fine-tunes when a `Limited`/`LimitedTrapFocus` Groupper "activates" (moves
into its inner content) for the case where the Groupper container itself
isn't focusable. By default, the Groupper activates automatically as soon as
Tab lands on the first inner focusable element. With `delegated: true`, it
only activates after Enter is explicitly pressed on that first inner
element — useful when the container can't carry `tabindex={0}` itself (for
example, a `<tr>` in some browsers) but should still require an explicit
"enter" gesture.

## Custom navigation

Groupper's Enter and Escape handling can be replaced independently. Use
[`focusable.ignoreKeydown`](core.md#focusable-element-properties) to leave
either key to your application, then dispatch a
`GroupperMoveFocusEvent` with `GroupperMoveFocusActions.Enter` or
`GroupperMoveFocusActions.Escape` when your own command, input method, or
application state should enter or leave the Groupper.

This [programmatic event](events.md#groupper-events) follows the same nested
Groupper context as the built-in keyboard behavior, allowing custom
interaction models without duplicating its focus traversal.

For built-in Enter/Escape handling, Tabster also dispatches
[`tabster:movefocus`](events.md#core-focus-events) before changing focus.
Preventing that event cancels the proposed move, so an application can choose
another destination without replacing Groupper behavior globally.

## Examples

[See Groupper examples in Storybook](https://tabster.io/storybook/?path=/story/groupper).

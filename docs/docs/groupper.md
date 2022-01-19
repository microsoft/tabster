# Groupper

## About

Groupper allows groupping multiple focusable elements as if they were one.

For example, let's consider a chat application. There is a flow of messages and a
send new message input after. Every message might contain inner buttons (like the
reaction buttons) and links. It would be inconvenient to Tab through every inner button
and link when we simply need to reach the new message input. We can apply Groupper to
the chat message. When the Groupper element gets focus, it will require additional Enter
press to go to the focusable elements inside the Groupper, otherwise next Tab press will
move focus outside of the Groupper.

Groupper plays well with [Mover](mover.md).

In general an element with the Groupper should be focusable (i.e. should have `tabindex=0`):

```html
<div data-tabster='{"groupper": {...}}"' tabindex="0" title="Group of buttons">
    <button>Button1</button>
    <button>Button2</button>
    <button>Button3</button>
</div>
```

## Setup

To get the Groupper working, we need to call the `getGroupper()` function:

```ts
import { createTabster, getGroupper } from "tabster";

let tabsterCore = createTabster(window);

getGroupper(tabsterCore);
```

## Properties

### tabbability?: _GroupperTabbability_

`Unlimited | Limited | LimitedTrapFocus`

With `Unlimited` tabbability the Groupper is tabbable automatically without any
additional Enter press to activate the Groupper. Though the Mover will still treat it
as a singular entiry.

With `Limited` tabbability an Enter press is needed to go to the Groupper's inner
focusable elements (and Esc to go back outside). Once we've entered the Groupper, we
can keep tabbing it's inner focusables, once the last focusable is reached, the focus
will move outside of the Groupper.

With `LimitedTrapFocus` we have the same behaviour as with `Limited` but the focus
will be trapped inside the groupper.

## Examples

[See a few Groupper examples in the Storybook](/storybook/?path=/story/groupper).

# Mover

## About

Mover allows to move focus within the container using arrow keys.

Mover plays well with [Groupper](groupper.md).

Consider the example:

```html
<div data-tabster='{"mover": {...}"'>
    <button>Button1</button>
    <button>Button2</button>
    <button>Button3</button>
</div>
```

Normally, it would take a Tab press to move between the buttons. With Mover, the focus will be moved when the arrow keys are pressed.

## Setup

To get Mover working, we need to call `getMover()` function:

```ts
import { createTabster, getMover } from "tabster";

let tabsterCore = createTabster(window);

getMover(tabsterCore);
```

## Properties

To tune the Mover's behaviour, several properties are available.

### direction?: _MoverDirection_

`Both | Vertical | Horizontal | Grid`

The default value is `Both` meaning both Up/Down and Left/Right button
presses will move focus to the previous/next focusable element inside the Mover.

With `Vertical` only Up/Down buttons will move the focus.

With `Horizontal` onlt Left/Right buttons will do.

With `Grid` the focus will be moving to visually adjacent item when the arrow
keys are used.

Of course PageUp/PageDown, Home and End keys work for Mover too.

```tsx
import { createTabster, getMover, getTabsterAttribute, Types } from "tabster";

const tabsterCore = createTabster(window);
getMover(tabsterCore);

...

<div {...getTabsterAttribute({ mover: { direction: Types.MoverDirections.Grid } })}>
    ...
</div>
```

### memorizeCurrent?: _boolean_

When you Tab to Mover from outside, the focus will land on the first element of the Mover
(or on the last one if you Tab backwards). With `memorizeCurrent` set to true, Tabster
will remember last focusable element you have been interacting with in the Mover and once
you Tab to the Mover from outside, the focus will go not to the first/last focusable in
the Mover container, but to the last item you've interacted with previously (if available).

### tabbable?: _boolean_

By default when you press Tab inside the Mover, the focus will go outside of the Mover to
the next focusable element. That allows us to, for example, Tab past the infinite lists.
Though sometime we might want both Tab and Arrow keys to work inside the Mover, so we can
make it tabbable.

### cyclic?: _boolean_

When we press an arrow key to go to the next item while the last item is focused already,
nothing happens by default. With `cyclic` it will move the focus to the first item.

### trackState?: _boolean_

Mover can track the state of visibility of its focusable elements. It triggers custom DOM
event `tabster:mover` providing this state. The triggered event will also have `isCurrent`
flag for the currently focused Mover item.

This should only be used when really needed, because it might have a performance impact
caused by observing the Mover's children visibility.

### visibilityAware?: _Visibility_

`Invisible | PartiallyVisible | Visible`

By default, when we Tab to a Mover from outside, the focus will go to the first rendered
focusable element inside the Mover. Which might make the list to scroll and might be
very inconvenient for the virtualized lists when the scrolling causes more items to load.

With `visibilityAware` we can alter that behaviour to be able to Tab to the first visible
element instead of the first rendered one. Enables `trackState` internally.

### disableHomeEndKeys?: _boolean_

As the name says, we can disable Home/End keys if needed.

## Examples

[See a few Mover examples in the Storybook](/storybook/?path=/story/mover).

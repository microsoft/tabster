---
title: Restorer
---

# Restorer <img src="/img/catdeloser.png" className="image image_header" alt="" />

## About

Restorer moves focus back to a known place when it's lost to `<body>` —
for example when the currently focused element (or an ancestor of it) is
removed from the DOM. It's a lighter-weight, more explicit alternative to
[Deloser](deloser.md) for the common "remember where to go back to" case:
instead of tracking a full history tree per container, you mark one element
as the **source** (the thing whose removal should trigger a restore) and one
or more elements as the **target** (where focus should go back to).

## Setup

Call `getRestorer()` once to enable the `restorer` `data-tabster` key:

```ts
import { createTabster, getRestorer } from "tabster";

const tabster = createTabster(window);
getRestorer(tabster);
```

## Properties

```ts
interface RestorerProps {
    type: RestorerType; // RestorerTypes.Source | RestorerTypes.Target
    id?: string;
}
```

- **`type: RestorerTypes.Source`** — put this on the element (or a container
  around the elements) whose removal-while-focused should trigger a
  restore.
- **`type: RestorerTypes.Target`** — put this on the element focus should
  return to. Restorer keeps a small history (last 10) of focused
  `Target` elements, and picks the most recent one that's still in the DOM.
- **`id?: string`** — when set on both a `Source` and one or more `Target`
  elements, restricts the restore to only consider `Target`s sharing that
  `id`, instead of the global target history.

```tsx
import { getTabsterAttribute, RestorerTypes } from "tabster";

<button {...getTabsterAttribute({ restorer: { type: RestorerTypes.Target } })}>
    Open dialog
</button>;

<div {...getTabsterAttribute({ restorer: { type: RestorerTypes.Source } })}>
    <button id="unmount">Close</button>
    {/* dialog contents */}
</div>;
```

In this shape, focusing the "Open dialog" button records it as a target;
opening the dialog and then removing the `Source` container (for example by
un-rendering it) moves focus back to "Open dialog" automatically.

## Caveats

- Restorer only acts when focus is **actually lost** — i.e. the active
  element becomes `<body>`. If focus already moved somewhere sensible (for
  example your own code focused something else before removing the
  `Source`), Restorer does nothing.
- It also skips restoring when focus lands on `<body>` because of a mouse
  click on empty space rather than because the focused element disappeared
  — Restorer checks `keyboardNavigation.isNavigatingWithKeyboard()`
  internally to distinguish the two, _unless_ the `Source` element is no
  longer in the DOM at all, in which case it always restores.
- A `Source` element, when disposed (e.g. removed from the tree) while it
  still has focus within it, dispatches a `RestorerRestoreFocusEvent`.
  Restorer and Deloser use separate event types and restoration policies;
  Deloser's [`Manual` strategy](deloser.md#strategy) is triggered with
  `DeloserRestoreFocusEvent`.

## Examples

[See Restorer examples in Storybook](https://tabster.io/storybook/?path=/story/restorer),
including a variant that restores from a second, more recently used
`Target` in history.

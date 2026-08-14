---
title: Modalizer
---

# Modalizer <img src="/img/catmodalizer.png" className="image image_header" alt="" />

## About

Modalizer marks a part of the application (a modal dialog, a popup, ...) as
the only focusable/accessible area while it's active — everything else gets
`aria-hidden` and is removed from Tab order, and is restored once the
Modalizer is deactivated.

## Setup

Call `getModalizer()` once to enable the `modalizer` `data-tabster` key:

```ts
import { createTabster, getModalizer } from "tabster";

const tabster = createTabster(window);
getModalizer(tabster);
```

`getModalizer()` also accepts two optional, advanced arguments:

```ts
function getModalizer(
    tabster: Types.Tabster,
    // @deprecated use accessibleCheck instead.
    alwaysAccessibleSelector?: string,
    accessibleCheck?: Types.ModalizerElementAccessibleCheck
): Types.ModalizerAPI;
```

`accessibleCheck` is called for elements outside the active Modalizer before
Tabster applies `aria-hidden`, letting you keep specific elements (for
example a toast/live region) accessible even while a Modalizer is active.
The first parameter, `alwaysAccessibleSelector`, is deprecated in favor of
`accessibleCheck`.

## Properties

```ts
interface ModalizerProps {
    id: string;
    isOthersAccessible?: boolean;
    isAlwaysAccessible?: boolean;
    isNoFocusFirst?: boolean;
    isNoFocusDefault?: boolean;
    isTrapped?: boolean;
}
```

- **`id: string`** — required. Identifies the Modalizer; multiple elements
  can share the same `id` to be treated as parts of the same modal (all
  become active/inactive together).
- **`isOthersAccessible?: boolean`** — when this Modalizer becomes active,
  don't apply `aria-hidden` to the rest of the application (still restricts
  Tab order, but screen readers can still see the rest of the app).
- **`isAlwaysAccessible?: boolean`** — this specific Modalizer instance stays
  accessible (no `aria-hidden`) even while a _different_ Modalizer is active.
- **`isNoFocusFirst?: boolean`** — when `ModalizerAPI.focus()` is called,
  don't choose the first focusable element as its keyboard-navigation
  destination.
- **`isNoFocusDefault?: boolean`** — when `ModalizerAPI.focus()` is called,
  don't choose the element marked `focusable: { isDefault: true }`.
- **`isTrapped?: boolean`** — focus trap variant: Tab/Shift+Tab cycle within
  the Modalizer instead of allowing focus to leave it.

```tsx
<div
    {...getTabsterAttribute({
        modalizer: { id: "my-dialog", isTrapped: true },
    })}
    role="dialog"
    aria-label="My dialog"
>
    <button>Focusable item</button>
    <button>Close</button>
</div>
```

## Programmatic API

`getModalizer()` returns a `ModalizerAPI` with two application-facing methods:

```ts
interface ModalizerAPI {
    focus(
        elementFromModalizer: HTMLElement,
        noFocusFirst?: boolean,
        noFocusDefault?: boolean
    ): boolean;
    activate(modalizerElementOrContainer: HTMLElement | undefined): boolean;
}
```

- `focus()` activates the Modalizer containing the supplied element and applies
  its configured initial-focus policy. It returns whether an element was
  focused immediately.
- `activate()` changes the active Modalizer without moving focus. Pass an
  element inside the Modalizer to activate it, or `undefined` to deactivate
  the current Modalizer.

## Interactions and caveats

- Activating a Modalizer and focusing into it are separate operations.
  `ModalizerAPI.focus()` performs both; `activate()` changes only the active
  region. The lower-level [`focusable`](core.md#focusable) API remains
  available when the application needs a custom destination.
- Applying `aria-hidden` to everything outside the active Modalizer happens
  in two passes: the element that currently has focus is cleared
  synchronously (so screen readers never announce a hidden, focused
  element), but the rest of the `aria-hidden` updates across the DOM happen
  **asynchronously**, a tick later. Tests or code that assert on
  `aria-hidden` state right after activating/moving focus should account
  for this.
- Modalizer only controls focusability/accessibility of the region; it does
  not add a backdrop, `Escape`-to-close handling, or focus restoration on
  its own. Pair it with [Deloser](deloser.md) or [Restorer](restorer.md) if
  you want focus automatically returned to whatever opened the dialog when
  it closes.
- `getModalizer(tabster)` also lazily powers Modalizer support inside
  [Cross-Origin](cross-origin.md) apps; you don't need to call it yourself
  before `getCrossOrigin()` in that scenario, as `getCrossOrigin()` already
  initializes it.

## Examples

[See a basic Modalizer example in Storybook](https://tabster.io/storybook/?path=/story/modalizer).

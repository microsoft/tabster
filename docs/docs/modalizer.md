---
title: Modalizer
---

# Modalizer <img src="/img/catmodalizer.png" className="image image_header" />

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
- **`isNoFocusFirst?: boolean`** — don't automatically focus the first
  focusable element when the Modalizer activates.
- **`isNoFocusDefault?: boolean`** — don't automatically focus the element
  marked `focusable: { isDefault: true }` when the Modalizer activates.
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

## Interactions and caveats

- Activating a Modalizer and focusing into it are two different concerns.
  Use `tabster.focusable.findFirst({ container: dialogElement })` (see
  [`focusable`](core.md#focusable)) to focus the first element inside the
  dialog once you show it, and
  `tabster.focusable.findFirst({ container: document.body, modalizerId: null })`
  to focus something _outside_ any Modalizer (e.g. the button that opened
  the dialog) once you hide it — this is exactly the pattern used in the
  [Storybook example](https://tabster.io/storybook/?path=/story/modalizer).
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

---
title: Outline
---

# Outline <img src="/img/catoutline.png" className="image image_header" alt="" />

## About

Outline draws a custom border around the focused element to make it clear
where keyboard focus currently is. The native CSS `outline` has a
long-standing problem: it gets visually cropped (or hidden entirely) by any
ancestor with `overflow: hidden`. Outline works around that by drawing the
indicator in a body-level, absolutely positioned overlay instead of inside
the focused element's clipping ancestors.

Outline visibility is tied to Tabster's [keyboard-navigation
state](core.md#keyboardnavigation) — it only shows up while the user is
navigating with the keyboard, not after a mouse click.

## Setup

Call `getOutline()` and then, unlike other features, also call `.setup()` to
actually start it — `getOutline()` alone only registers the `outline`
`data-tabster` key, it doesn't start rendering anything:

```ts
import { createTabster, getOutline } from "tabster";

const tabster = createTabster(window);
const outline = getOutline(tabster);

// Required: actually starts the outline.
outline.setup();
```

`setup()` accepts a partial override of the default visual props:

```ts
interface OutlineProps {
    areaClass: string; // default: "tabster-focus-outline-area"
    outlineClass: string; // default: "tabster-focus-outline"
    outlineColor: string; // default: "#ff4500"
    outlineWidth: number; // default: 2
    zIndex: number; // default: 2147483647
}

outline.setup({ outlineColor: "#0078d4", outlineWidth: 3 });
```

## Properties

Individual elements can opt out of the outline with the `outline`
`data-tabster` key:

```ts
interface OutlinedElementProps {
    isIgnored?: boolean;
}
```

```html
<button data-tabster='{"outline": {"isIgnored": true}}'>No outline here</button>
```

## Examples

```tsx
import { createTabster, getOutline } from "tabster";

const tabster = createTabster(window);
getOutline(tabster).setup();
```

With this in place, Tabbing through the page shows a colored border around
the focused element; clicking with the mouse does not.

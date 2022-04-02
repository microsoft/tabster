# Outline <img src="/img/catoutline.png" className="image image_header" />

## About

Outline is a border around focused element which helps the user to identify where the focus is.
HTML has native outline but its fundamental problem is that any parent element with `overflow: hidden`
might crop the outline to a funny shape or make it completely invisible.

This is a custom implementation which tries to work the `overflow: hidden` problem around.

The custom outline visibility depends on the Tabster's keyboard navigation state.

## Setup

To get Outline working, we need to call `getOutline()` function:

```ts
import { createTabster, getOutline } from "tabster";

let tabsterCore = createTabster(window);

let outline = getOutline(tabsterCore);

// To actually start the outline.
outline.setup();
```

## Examples

Here be dragons.

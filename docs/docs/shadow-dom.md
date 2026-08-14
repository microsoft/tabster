---
title: Shadow DOM
---

# Shadow DOM <img src="/img/catcore.png" className="image image_header" alt="" />

By default Tabster's internals (`querySelector`, `TreeWalker`,
`MutationObserver`, `document.activeElement`, and friends) use the regular,
light-DOM versions of these DOM APIs. Applications that render into Shadow
DOM trees need Tabster to pierce through shadow boundaries when walking the
tree or looking up the active element — that's what the Shadow DOM API
provides.

## Setup

Pass `getShadowDOMAPI()` as the `DOMAPI` prop when creating the Tabster
instance for a window that uses Shadow DOM:

```ts
import { createTabster, getShadowDOMAPI } from "tabster";

const tabster = createTabster(window, {
    DOMAPI: getShadowDOMAPI(),
});
```

This swaps in shadow-aware implementations for things like
`querySelector`/`querySelectorAll`, `getActiveElement` (which walks into
nested `shadowRoot.activeElement` chains), `createTreeWalker` (which
transparently steps into shadow roots while walking), and `nodeContains`
(which understands slotted elements). Everything else about Tabster's API
— `data-tabster` attributes, `get*()` feature helpers, events — works exactly
the same whether or not Shadow DOM support is enabled.

You can also provide only a subset of the `DOMAPI` (it's `Partial<DOMAPI>`)
if you need a custom implementation for just one or two of the calls, while
using the defaults (from `tabster`) or the shadow DOM versions (from
`getShadowDOMAPI()`) for the rest.

## Caveats

- `<slot>` elements are supported for `nodeContains()`/assigned-element
  checks, but slot-based re-projection isn't exhaustively handled everywhere
  yet — file an issue if you hit a gap.
- Enabling Shadow DOM support has a small performance cost (extra work per
  DOM traversal), so only pass `DOMAPI` when your application actually
  renders into shadow trees.

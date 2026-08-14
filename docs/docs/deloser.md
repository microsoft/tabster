---
title: Deloser
---

# Deloser <img src="/img/catdeloser.png" className="image image_header" alt="" />

## About

Ideally, the application should always have a focused element while
navigating with the keyboard. In practice, closing a modal dialog or removing
a focused item from a list often leaves focus nowhere — "focus goes to
`<body>`" — which is especially confusing for screen reader users.

This gets harder because applications are usually built from independent
components that don't know about each other: the component that closes a
dialog shouldn't need to know which button opened it in order to restore
focus there.

Deloser tracks focus history and, when focus is lost, restores it to the
most recent element from that history that's still available (from the
dialog example, likely the button that opened it).

Delosers can be nested. A Deloser on a list container keeps its own focus
history for that list, without polluting the application-level Deloser
(typically on the root element) — nested Delosers are recorded as a single
entry from their parent's point of view.

## Setup

Call `getDeloser()` once to enable the `deloser` `data-tabster` key:

```ts
import { createTabster, getDeloser } from "tabster";

const tabster = createTabster(window);
getDeloser(tabster);
```

```html
<div data-tabster='{"deloser": {}}'>
    <button>Button1</button>
    <button>Button2</button>
    <button>Button3</button>
</div>
```

If `Button2` above is focused and then removed from the DOM, Deloser
restores focus to `Button3` (or `Button1`, depending on history) instead of
leaving focus on `<body>`.

## Properties

```ts
interface DeloserProps {
    restoreFocusOrder?: RestoreFocusOrder;
    noSelectorCheck?: boolean;
    strategy?: DeloserStrategy;
}
```

### `restoreFocusOrder`

`History | DeloserDefault | RootDefault | DeloserFirst | RootFirst`

- `History` (default) — walk backwards through previously-focused elements.
- `DeloserDefault` — focus the element marked `focusable: { isDefault: true }`
  (see [Focusable element properties](core.md#focusable-element-properties))
  within this Deloser's own container.
- `RootDefault` — same, but search the whole application root instead of
  just this Deloser's container.
- `DeloserFirst` — focus the first focusable element in this Deloser's
  container.
- `RootFirst` — focus the first focusable element in the whole application.

### `noSelectorCheck`

Deloser keeps weak references to DOM elements, plus the CSS selector that
located them. In apps using a virtual DOM (React, etc.), part of the tree
can be re-rendered — visually unchanged, but with new element instances —
which would make the stored element reference stale. By default, Deloser
falls back to re-locating the element via its stored selector when the
direct reference is gone; set `noSelectorCheck: true` to disable that
fallback.

### `strategy`

`Auto | Manual`

`Auto` (default) restores focus automatically using the available history,
as described above. With `Manual`, focus is **not** restored automatically
when lost from this Deloser instance — the application must call it itself
by dispatching a `DeloserRestoreFocusEvent` (see
[Events](events.md#deloser-events)) at the point it wants the restore to
happen:

```ts
import { DeloserRestoreFocusEvent } from "tabster";

deloserElement.dispatchEvent(new DeloserRestoreFocusEvent());
```

Note that even with `Manual` strategy on this Deloser, its history can still
be used to find an element to focus when the _focus is lost from a
different_ Deloser instance.

## Examples

```tsx
import { createTabster, getDeloser, getTabsterAttribute } from "tabster";

const tabster = createTabster(window);
getDeloser(tabster);

<div {...getTabsterAttribute({ root: {}, deloser: {} })}>
    <button>Button1</button>
    <button>Button2</button>
    <button>Button3</button>
    <button>Button4</button>
</div>;
```

Focus `Button2`, remove it from the DOM, and focus automatically moves to
`Button3`.

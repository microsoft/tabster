---
title: Attribute Helpers
---

# Attribute Helpers <img src="/img/catcore.png" className="image image_header" alt="" />

Tabster's declarative API is a single `data-tabster` attribute holding a
JSON-serialized object, keyed by feature name (`root`, `mover`, `groupper`,
`modalizer`, `deloser`, `restorer`, `outline`, `observed`, `uncontrolled`,
`focusable`, `sys`). You should never build or parse that JSON by hand — use
these helpers instead.

```ts
import {
    getTabsterAttribute,
    setTabsterAttribute,
    mergeTabsterProps,
    TABSTER_ATTRIBUTE_NAME,
} from "tabster";
```

## `getTabsterAttribute()`

Builds the attribute value from a typed `Types.TabsterAttributeProps` object.

```ts
function getTabsterAttribute(
    props: Types.TabsterAttributeProps
): Types.TabsterDOMAttribute; // { "data-tabster": string }
function getTabsterAttribute(
    props: Types.TabsterAttributeProps,
    plain: true
): string; // just the JSON string
```

```tsx
// Spread directly onto a JSX element:
<div {...getTabsterAttribute({ root: {} })} />;
// -> <div data-tabster='{"root":{}}'>

// Or get the plain string, e.g. to set it on a plain DOM node:
const value = getTabsterAttribute({ mover: {} }, true);
element.setAttribute(TABSTER_ATTRIBUTE_NAME, value);
```

## `setTabsterAttribute()`

Sets or updates the attribute on an existing `HTMLElement` imperatively.

```ts
function setTabsterAttribute(
    element: HTMLElement,
    newProps: Types.TabsterAttributeProps,
    update?: boolean
): void;
```

- With `update` falsy (default), `newProps` **replaces** the element's
  current Tabster props entirely.
- With `update: true`, `newProps` is merged into the existing props: keys
  present with a value are added/overwritten, keys present with value
  `undefined` are removed, and keys not mentioned at all are left untouched.
- If the resulting props object ends up empty, the `data-tabster` attribute
  is removed from the element rather than left as `"{}"`.

```ts
// Replace entirely:
setTabsterAttribute(element, { groupper: {}, modalizer: { id: "ololo" } });

// Merge: drop `modalizer`, keep everything else, add nothing new otherwise.
setTabsterAttribute(element, { modalizer: undefined }, true);
```

## `mergeTabsterProps()`

The merging logic `setTabsterAttribute()` uses internally, exposed for cases
where you're building up a `TabsterAttributeProps` object yourself (for
example before the element even exists yet):

```ts
function mergeTabsterProps(
    props: Types.TabsterAttributeProps,
    newProps: Types.TabsterAttributeProps
): void;
```

```ts
const props: Types.TabsterAttributeProps = {
    deloser: {},
    modalizer: { id: "a" },
};
mergeTabsterProps(props, { deloser: undefined, groupper: {} });
// props is now { groupper: {}, modalizer: { id: "a" } }
```

## `TabsterAttributeProps` shape

```ts
type TabsterAttributeProps = Partial<{
    root: RootProps;
    mover: MoverProps;
    groupper: GroupperProps;
    modalizer: ModalizerProps;
    deloser: DeloserProps;
    restorer: RestorerProps;
    outline: OutlinedElementProps;
    observed: ObservedElementProps;
    uncontrolled: UncontrolledProps;
    focusable: FocusableProps;
    sys: SysProps;
}>;
```

Each key's shape is documented on its feature page: [`root`](core.md#root),
[`mover`](mover.md#properties), [`groupper`](groupper.md#properties),
[`modalizer`](modalizer.md#properties), [`deloser`](deloser.md#properties),
[`restorer`](restorer.md#properties), [`outline`](outline.md#properties),
[`observed`](observed.md#properties), [`uncontrolled`](uncontrolled.md),
[`focusable`](core.md#focusable-element-properties).

### `sys` — advanced/rare

`sys` lets you override an internal implementation detail: where Tabster
places the invisible dummy inputs relative to a Root/Mover/Groupper/Modalizer
container.

```ts
interface SysProps {
    dummyInputsPosition?: SysDummyInputsPosition; // Auto | Inside | Outside
}
```

By default (`Auto`) Tabster picks a sensible position depending on the tag
name (for example inside a `<li>`, outside a `<table>`). Only override this
if you've observed a concrete DOM/layout problem caused by the default
placement — see [`SysDummyInputsPositions`](api-reference.md#constants) for
the enum values.

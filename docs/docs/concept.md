---
title: Concepts
---

# Concepts <img src="/img/catconcept.png" className="image image_header" alt="" />

## Why Tabster exists

Web applications contain many actionable elements in various combinations.
From the accessibility perspective, the application should be usable with the
keyboard alone.

Some HTML elements like `<button>` are focusable by default (reachable with
the Tab key); for other elements the `tabindex` attribute can make them
focusable. Making an element focusable is not the same as making it _reachable
in a sensible order_. Consider an infinite news feed: it would be impossible
to Tab past it to reach whatever comes after, because new focusable items keep
appearing as you tab through it.

Browsers also provide higher-level focus-management primitives, but real
applications often exceed their models. The native `<dialog>` element has
evolved for more than a decade, yet it still cannot represent a modal region
composed of multiple DOM containers. The emerging `focusgroup` API handles
roving focus, arrow-key navigation, and focus memory, but not hierarchical
Enter/Escape navigation, custom Tab behavior or trapping, or application
selection and activation state.

**Tabster** was created as a practical focus-navigation core for a large,
complex application. It provides a small set of relatively low-level concepts,
but because they are aware of one another and compose as a single system, they
remain powerful in deeply nested and dynamic application structures. Tabster
handles these keyboard-navigation scenarios declaratively, mostly by adding a
`data-tabster` attribute to DOM elements.
It lets you group focusable elements so they behave as a single entity
([Groupper](groupper.md)), move focus with arrow keys instead of just Tab
([Mover](mover.md)), restore focus when the focused element disappears from
the DOM ([Deloser](deloser.md), [Restorer](restorer.md)), manage focus and
accessibility boundaries for modal regions and popups
([Modalizer](modalizer.md)), find and wait for elements that aren't mounted yet
([Observed Element](observed.md)), draw a robust focus outline
([Outline](outline.md)), and traverse focusable elements programmatically
([Focusable](core.md#focusable)).

Browsers continue to add native alternatives for some of these capabilities,
but application-level composition remains necessary. See
[Browser APIs and Tabster](browser-support.md) for a detailed comparison.

## How it works

Tabster supports two application-level models for Tab navigation. Choose the
model that fits the application when calling `createTabster()`; Tabster does
not switch between them for different areas of the DOM. Neither model is
universally better—the right choice depends on how much of the focusable DOM
the application owns and how it integrates third-party components.

`controlTab` is independent of the
[`uncontrolled`](uncontrolled.md) attribute. `controlTab` chooses how Tab is
handled application-wide. `uncontrolled` marks a particular subtree whose
internal focus behavior Tabster should leave to native browser behavior or
another component; it can be used with either `controlTab` value.

### Controlling Tab programmatically

When `controlTab` is `true` (the default), Tabster intercepts Tab presses
under the root, calculates the next focus target, prevents the browser's
default Tab behavior, and focuses that target programmatically. This model is
best suited to relatively simple applications that own their focusable DOM
and do not need to coordinate with third-party components that manage focus
independently.

### Letting the browser Tab and redirecting when necessary

When `controlTab` is `false`, Tabster does not choose the next element for
ordinary Tab presses. The browser follows its native tab order instead.
Whenever Tabster must alter that result—for example at a
[Mover](mover.md), [Groupper](groupper.md), or
[Modalizer](modalizer.md) boundary—it uses invisible "dummy" `<input>`
elements to receive the browser's focus and redirect it.

This model is generally a better fit for complex applications and
applications that integrate focus-managing third-party components, because
the browser remains responsible for finding the next element. The tradeoff is
that dummy inputs are real DOM nodes. Although invisible, they can affect DOM
assumptions, selectors, mutation observers, and tests, so applications should
account for and test them. Some features also use dummy inputs when
`controlTab` is `true`; with `controlTab: false`, they are fundamental to how
Tabster changes native navigation without taking over every Tab press. Use
[`getDummyInputContainer()`](api-reference.md#getdummyinputcontainer) if you
ever need to detect one.

## IFrames

Applications that use `<iframe>` (especially cross-origin ones) add extra
complexity: iframes are isolated from each other for eventing purposes — a
Tab press in one iframe is invisible to the others. Tabster's
[Cross-Origin](cross-origin.md) module forwards a limited set of concerns
between iframes, most notably keyboard-navigation state and the [Observed
Element](observed.md) API (so you can focus, by name, an element that lives
in a different frame). Cross-origin scenarios are advanced and comparatively
rare; see the [Cross-Origin](cross-origin.md) page for setup and caveats.

## Summary

Tabster aims to make keyboard navigation work the way the browser would, if
the browser supported these scenarios natively. Everything is opt-in and
declarative — set a `data-tabster` attribute (similar to setting `tabindex`)
and enable the corresponding feature once via its `get*()` function. See
[Getting Started](intro.md) for the practical walkthrough.

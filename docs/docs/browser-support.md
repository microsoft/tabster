---
title: Browser APIs and Tabster
---

# Browser APIs and Tabster

Browsers provide the foundation for keyboard navigation: focusable native
controls, `tabindex`, sequential Tab order, `focus()`, `autofocus`,
`:focus-visible`, `<dialog>`, `inert`, popovers, and increasingly higher-level
features such as `focusgroup`. Use these native features when their model fits
the experience.

Tabster addresses a different layer. Large applications need multiple focus
behaviors to remain consistent while content mounts and unmounts, independent
components are nested, logical UI regions do not match the DOM tree, and some
parts of the application use their own focus management. Browser APIs generally
do not try to provide this application-wide orchestration.

## Gaps between browser primitives and real applications

### A sensible Tab order is more than focusability

Native controls and `tabindex` decide whether an element participates in
sequential focus navigation. They do not express that a long or infinite list
should be one Tab stop, while arrow keys move between its items and reverse Tab
enters it at the opposite end.

[Mover](mover.md) supplies that policy, including linear and grid navigation,
first/last entry, current-item memory, cyclic movement, and visibility-aware
movement. It can make a large collection navigable without forcing the user to
Tab through every item.

### Composite items often need an explicit interaction mode

An item in a feed, tree, grid, or menu can contain its own links, buttons, and
even nested composites. Applications often need focus to stop on the item as a
whole, Enter to move into its contents, Escape to return to the item, and
optionally Tab to remain trapped inside while that level is active.

The new, still-evolving
[`focusgroup`](https://open-ui.org/components/scoped-focusgroup.explainer/)
API standardizes roving focus, arrow-key navigation, a guaranteed Tab stop,
and focus memory. Its proposed
[`itemcontrols`](https://open-ui.org/components/focusgroup-v2.explainer/#itemcontrols)
modifier can filter controls belonging to inactive items. It intentionally
does not define hierarchical Enter/Escape navigation, an activated interaction
mode, arbitrary Tab trapping, or application selection and activation state.

[Groupper](groupper.md) provides these explicit enter/escape levels and can be
nested or combined with Mover. This supports structures such as a list of
messages, where arrows move between messages, Enter opens one message, arrows
move between sections inside it, and another Enter opens the actions within a
section.

### Independent focus behaviors need to compose

A page can contain a modal region, a Mover, several nested Grouppers, an
embedded third-party widget, and a component whose focused element disappears
during an update. Implementing each behavior independently can produce
conflicting key handlers, incorrect Tab boundaries, and lost focus.

Tabster's features share the same understanding of roots, focusability,
keyboard-navigation state, Modalizers, Movers, Grouppers, and uncontrolled
regions. They are relatively low-level concepts, but their awareness of one
another lets them behave as one system in a deeply nested application.

### A logical UI region may span multiple DOM containers

Native `<dialog>` provides an important semantic and behavioral primitive for
a modal dialog, but its modal content is one DOM subtree. Real applications
can render one logical modal region into multiple containers because of
portals, layering, shared surfaces, or independently owned components.

[Modalizer](modalizer.md) allows multiple elements to share an ID and behave as
parts of the same modal region. It can restrict Tab navigation across those
containers and control whether the rest of the application remains exposed to
assistive technology. Tabster does not replace dialog semantics: authors must
still use the appropriate HTML and ARIA roles.

### Focus traps are only one part of modal behavior

`<dialog>`, `inert`, and popovers cover many common modal and layered-interface
cases. Applications may additionally need multiple cooperating containers,
conditional exceptions such as live regions, a distinction between focus
restriction and accessibility-tree visibility, or integration with a larger
focus-restoration policy.

Modalizer provides those controls and composes with [Deloser](deloser.md) and
[Restorer](restorer.md). It deliberately does not render a backdrop, close a
dialog on Escape, or provide dialog semantics; those remain application and
markup responsibilities.

### Dynamic DOM updates can destroy the focused element

When a focused element or one of its ancestors is removed, native focus usually
falls back to the document body. The browser cannot know whether the best
replacement is the control that opened a surface, a nearby item in the same
list, a component default, or an application-level default.

[Deloser](deloser.md) maintains nested focus histories and applies a configured
restoration strategy. [Restorer](restorer.md) provides a lighter source/target
model for returning focus to a known place. These policies continue to work
when components are independently mounted, unmounted, or replaced.

### The next focus target may not exist yet

Applications frequently request focus as part of navigation, data loading, or
rendering before the target has mounted. `element.focus()` only works on an
element that already exists and is focusable; the browser does not queue an
application-level focus request or cancel it when the user moves elsewhere.

[Observed Element](observed.md) names targets, waits for them to appear and
become usable, focuses them within a timeout, and cancels stale requests when a
new request or user action takes precedence.

### DOM ancestry is not always application ancestry

Portals and layered rendering can place a component outside the DOM subtree of
its logical parent. Native focus navigation operates on the actual document
tree and cannot infer application ownership from framework component trees.

Tabster can use a custom `getParent` implementation when calculating context,
allowing roots, Movers, Grouppers, and Modalizers to follow an application's
logical parent relationships where necessary.

### Focus coordination stops at document boundaries

Documents and cross-origin iframes are intentionally isolated. A Tab press,
focus history, or request to focus a not-yet-mounted element in one frame is
not automatically coordinated with another frame.

[Cross-Origin](cross-origin.md) provides an explicit `postMessage`-based bridge
for a limited set of Tabster state and operations, including keyboard
navigation state and observed-element focus requests. Applications control
which windows participate and how messages are transported.

### Applications need one definition of "focusable here"

The platform exposes the underlying rules for focusability, rendering,
disabled state, `inert`, Tab order, and shadow trees, but complex applications
often need reusable queries that also account for their own active modal,
ignored elements, default targets, and navigation context.

Tabster's [Focusable](core.md#focusable) API provides consistent traversal and
search using the same rules as the rest of Tabster. Its declarative focusable
properties can mark application defaults, exclude elements from Tabster
navigation, or alter how an element participates without changing its semantic
role.

### Applications cannot ask the browser to follow their navigation policy

`HTMLElement.focus()` can focus a target the application has already chosen,
but the platform has no general API that means "move to the next item according
to this application's nested Mover, Groupper, Modalizer, uncontrolled-region,
visibility, and logical-ancestry rules." Reimplementing that calculation in
each component can make programmatic movement disagree with keyboard movement.

Tabster exposes both its shared [Focusable traversal API](core.md#focusable)
and application-dispatched [Mover and Groupper events](events.md#mover-events).
An application can find a destination directly, ask a Mover to process a
specific movement command, enter or escape a Groupper, update a Mover's
memorized item, and observe Mover item state. Combined with
[`ignoreKeydown`](core.md#focusable-element-properties), this lets an
application replace selected built-in key bindings or connect other input and
state models while preserving Tabster's navigation context.

Tabster also exposes the movement it is about to perform. Before an
interceptable built-in focus move, it dispatches a bubbling
[`tabster:movefocus`](events.md#core-focus-events) event containing the
initiating feature, owning element, proposed destination, and original keyboard
event when applicable. A listener can call `preventDefault()` to cancel
Tabster's move and focus a different destination instead. This provides a
single override point without requiring components to replace all of Tabster's
normal behavior.

### Native and third-party behavior must remain usable

An application-wide focus system cannot assume it owns every subtree. Editors,
data grids, browser controls, and third-party widgets may already implement
their own arrow navigation or focus trapping.

[Uncontrolled](uncontrolled.md) regions let those components retain their
native or custom behavior while still participating in the surrounding
application's navigation. Tabster resumes management at the region boundary
instead of requiring every component to adopt the same implementation.

### Focus indication can be clipped by application layout

`:focus-visible` lets CSS distinguish keyboard focus, but an ordinary outline
can be clipped by an ancestor with `overflow: hidden` or obscured by complex
layering. The browser cannot choose an application-specific overlay strategy.

[Outline](outline.md) uses Tabster's shared keyboard-navigation state and draws
the indicator in a body-level overlay, outside the focused element's clipping
ancestors, so that it remains visible across common clipping layouts.

### Shadow DOM requires consistent traversal across every feature

The browser supports focus inside shadow trees, but application code using
`querySelector`, `TreeWalker`, `MutationObserver`, and
`document.activeElement` does not automatically traverse nested shadow roots
as one logical tree.

Tabster's [Shadow DOM](shadow-dom.md) adapter replaces those low-level
operations consistently for all enabled Tabster features, including active
element lookup, traversal, containment, and slotted content.

## What Tabster does not replace

Tabster manages focus navigation; it does not supply component semantics or
application behavior. Authors remain responsible for:

- Choosing semantic HTML and correct ARIA roles, states, names, and
  relationships.
- Managing selection, activation, expansion, loading, and application state.
- Using native controls, `<dialog>`, popovers, and `inert` when they fit.
- Providing commands such as closing a dialog on Escape.
- Testing with browsers, keyboards, screen readers, zoom, high contrast, and
  other assistive technologies.

Native platform features and Tabster are complementary. Platform APIs provide
interoperable primitives; Tabster provides a composable policy layer for
navigation models whose boundaries and lifecycle are defined by the
application.

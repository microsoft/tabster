# Concept

Web applications contain many actionable elements in various combinations.

From the acccessibility perspective the application should be usable with keyboard only.

Some HTML elements like `<button>` are focusable by default (we can reach them pressing
Tab key), for other HTML elements we can use `tabindex` attribute to make them focusable.

But that is practically all we have from the web browser perspective. Unfortunately,
making actionable element focusable is not enough. Consider, for example, an infinite
news feed. It would be impossible to reach something after the infinite news feed using
Tab key presses, because the news feed is infinite and as you Tab through it, new actionable
elements appear.

**Tabster** is a set of tools to handle complex keyboard navigation scenarios as they would
be natively supported by the browser. In a declarative way, by simply adding an attribute
to the DOM elements, Tabster allows to group focusable elements so that they can
behave as a single logical entity, it allows to define areas where focus is moved not just
using Tab key, but using arrow keys, it can help restore focus when something currently focused
has been removed from the DOM, it can help building modal dialogs and popups, it provides
a bunch of other functions, like the keyboard navigation state and functions to traverse
the focusable elements in the DOM, and many more.

The browsers should eventually have native alternatives for the things Tabster provide,
but for now it's what we can offer to make keyboard navigation implementation easier.

See the [Core](core.md) documentation for more.

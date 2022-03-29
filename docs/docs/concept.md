# Concept <img src="/img/catconcept.png" width="166" height="128" style={{"vertical-align": "-40px"}} />

## About

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

## How it works

Tabster offers two approaches to managing focus. Both have advantages and disadvantages and the choice of which one to use depends on your particular scenario.

### Controlling Tab programmatically

First approach is good when you have the entire application under your control. If you don't have third party components you cannot easily change, which implement custom keyboard navigation inside, controlling Tab is a nice option. Tabster intercepts all Tab presses and programmatically decides which element should be focused next.

### Using invisible dummy inputs to redirect focus

Second approach is to add invisible dummy inputs around particular areas in the DOM. We don't need to interfere with the default browser behaviour for Tab press in general. Only things like [Mover](mover.md) and [Groupper](groupper.md) are affecting the tabbing order, so for the rest of the application, we can avoid controlling Tab presses programmatically and rely on the default browser action for Tab. The rest of the scenarios which need custom Tab handling (like Mover and Groupper just mentioned above) add special invisible dummy inputs around the particular area. The default action will move focus to that dummy input and once the dummy input is focused, Tabster decides what actual element needs to be focused and redirects the focus. It all happens transparently, you don't have to think about those dummy inputs, but internally it is a DOM change to add those inputs. Depending on the application implementation, that DOM change might have side effects.

## IFrames

One special case which adds complexity is when your application uses `<iframe>` (especially the cross origin ones). IFrames are isolated from each other from the eventing perspective. Meaning that if you hit Tab in one `<iframe>` the other one will never receive that event. Tabster has the cross origin part which allows forwarding some particular events between the IFrames. For example, Tabster has a thing called Keyboard Navigation State — a boolean flag (and event to observe) telling if the user is using keyboard to navigate instead of mouse. With the cross origin module this state will be automatically synchronized between iframes, so when you start tabbing in one iframe, the other one automatically knows you're navigating with keyboard. There are also other cool possibilities like cross origin [Observed Element API](observed.md) when you can give an element a name in one `<iframe>` and focus that element from another `<iframe>` by name (or get events when that element appears in the DOM). Though the cross origin scenarios are pretty rare and specific, and not docummented yet.

## Summary

Tabster aims to solve things in a way the browser would do. Everything is defined using data attributes on the DOM elements (like setting the `tabindex` attribute). There are a lot of corner cases and limitations, but we hope to eventually bring similar functionality to the browsers to make building accessible applications less painful.

# Tabster

_Tabindex on steroids._

A set of tools and concepts for making a dynamic web application properly accessible and keyboard-navigable.

[https://tabster.io](https://tabster.io).

## About

The way a browser and the screen readers handle a web application is evolved from the static web era. A process of making a modern dynamic web application accessible presents a number of challenges like, for example, the proper focus management between modal dialogs, popups, lists and other parts of the dynamically changing application. This project is an attempt to solve some of those challenges.

## Dependencies

This project is framework-agnostic. It operates on the DOM level and has no external runtime dependencies. Though it is possible that your framework or application might have own logic to achieve similar result, in that case runtime conflicts and behavioural inconsistencies are definitely possible. At the same time, it does not do things automatically and parts of it should be explicitly enabled.

## Parts

### Focusable

An API for traversing focusable elements.

### Deloser

When you remove, for example, a button which has focus from the DOM, the focus gets lost which is confusing for the screen reader and keyboard navigation users. Deloser is a concept which helps to automatically restore the focus when it gets lost without manually calling `.focus()` method from the application code.

### FocusedElementState

An event and a couple of methods to track and change currently focused element.

### KeyboardNavigationState

An event and a method to determine if the user is using keyboard to navigate through the application.

### Groupper

Keyboard navigation for the lists should allow to avoid going through every list item when the users use Tab key (only one item of the list should be tabbable), also the arrow keys and Home/End/PageUp/PageDown keys should be handled to move between the list items. This is an API to easily make properly behaving lists.

### Modalizer

When you show, for example, a modal dialog, the rest of the application might need to be excluded from the keyboard and screen reader navigation flow. Modalizer is a concept to conveniently make that possible.

### Outline

When people navigate with the keyboard, the currently focused element should be properly highlighted. There is a CSS property called `outline`, which is unfortunately insufficient: the outline of an element gets cropped when a parent element has `overflow: hidden`, there is no way to limit the outline visibility to only the cases when the user is navigating with keyboard. So, we have a custom outline component which is supposed to solve both of the problems.

## Contributing

Contributions are welcome (see the [CONTRIBUTING](./CONTRIBUTING.md) file), though please keep in mind the work-in-progress proof-of-concept state. Might make sense to just observe/discuss until the thing gets stable and well-documented.

The repo now has an examples project powered by Storybook. Just run `npm start`

## License

This project is licensed under the MIT License, see the [LICENSE](LICENSE) file for details.

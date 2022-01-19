# Modalizer

## About

Modalizer allows to make some part of the application focusable, while keeping the rest of it
not focusable. Like the modal dialog and everything under it.

## Setup

To get Modalizer working, we need to call `getModalizer()` function:

```ts
import { createTabster, getModalizer } from "tabster";

let tabsterCore = createTabster(window);

getModalizer(tabsterCore);
```

## Properties

### id: _string_

### isOthersAccessible?: _boolean_

### isAlwaysAccessible?: _boolean_

### isNoFocusFirst?: _boolean_

### isNoFocusDefault?: _boolean_

## Examples

[See a basic Modalizer example in the Storybook](/storybook/?path=/story/modalizer).

# Tabster

_Tabindex on steroids._

Tabster is a small, framework-agnostic library for composing keyboard
navigation and focus-management policies in complex applications: moving
focus with arrow keys, grouping controls so Tab doesn't have to visit every
one of them, restricting focus within modal regions, restoring focus when the
focused element disappears, and more. It operates directly on the DOM through
a single `data-tabster` attribute, so it works with any UI framework (or none
at all).

- 📖 **Documentation:** [https://tabster.io](https://tabster.io)
- 🧪 **Live examples:** [Storybook](https://tabster.io/storybook/)
- 📦 **Package:** [`tabster` on npm](https://www.npmjs.com/package/tabster)

## Why Tabster

Browser APIs provide the primitives for focus and sequential navigation.
Modern, dynamic web applications also need those primitives to compose:
focus has to move predictably inside composite widgets, remain restricted
within modal regions, and be restored when the element that had it is removed
from the DOM. Tabster provides a consistent, well-tested way to coordinate
those policies without requiring a specific framework.

See [Browser APIs and Tabster](https://tabster.io/docs/browser-support) for a
detailed comparison of the platform primitives and the application-level gaps
Tabster covers.

## Installation

```bash
npm install tabster
```

Tabster ships as ESM and CJS builds with bundled TypeScript types — no
separate `@types` package is needed.

## Quick start

```tsx
import * as React from "react";
import { createRoot } from "react-dom/client";
import {
    createTabster,
    getGroupper,
    getMover,
    getTabsterAttribute,
    GroupperTabbabilities,
    MoverDirections,
} from "tabster";

// Create the Tabster instance once, during app startup.
const tabster = createTabster(window);

// Opt into the features you use (tree-shakeable, so unused ones cost nothing).
getMover(tabster);
getGroupper(tabster);

function App() {
    return (
        // Tabster only manages focus inside a marked root.
        <div {...getTabsterAttribute({ root: {} })}>
            {/* Up/Down arrow keys move between the list items. */}
            <ul
                {...getTabsterAttribute({
                    mover: { direction: MoverDirections.Vertical },
                })}
            >
                {["First", "Second"].map((label) => (
                    <li
                        key={label}
                        tabIndex={0}
                        // Enter moves focus inside the item, Escape moves back out.
                        {...getTabsterAttribute({
                            groupper: {
                                tabbability:
                                    GroupperTabbabilities.LimitedTrapFocus,
                            },
                        })}
                    >
                        <button>{label} action A</button>
                        <button>{label} action B</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

const container = document.getElementById("root");
if (container) {
    createRoot(container).render(<App />);
}
```

See [Getting Started](https://tabster.io/docs/intro) for the full walkthrough
(installation, lifecycle, Root setup for navigation features, and every
`get*()` opt-in), and the
[API Reference](https://tabster.io/docs/api-reference) for the complete list
of exports.

## What's included

| Feature                                              | What it does                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [Core](https://tabster.io/docs/core)                 | Focused-element tracking, keyboard-navigation detection, focusable-element lookup — always available. |
| [Mover](https://tabster.io/docs/mover)               | Arrow-key/Home/End/PageUp/PageDown navigation between sibling elements (lists, toolbars, grids).      |
| [Groupper](https://tabster.io/docs/groupper)         | Supports single-entry groups with Enter/Escape navigation and optional focus trapping.                |
| [Modalizer](https://tabster.io/docs/modalizer)       | Manages focus and accessibility boundaries while a modal region or popup is active.                   |
| [Deloser](https://tabster.io/docs/deloser)           | Automatically restores focus when the focused element is removed from the DOM.                        |
| [Restorer](https://tabster.io/docs/restorer)         | A lighter-weight, single-element alternative to Deloser for restoring focus.                          |
| [Observed Element](https://tabster.io/docs/observed) | Waits for an element to appear (or become focusable/accessible) and optionally focuses it.            |
| [Outline](https://tabster.io/docs/outline)           | A custom, keyboard-only focus outline that isn't cropped by `overflow: hidden`.                       |
| [Cross-Origin](https://tabster.io/docs/cross-origin) | Coordinates selected focus state and operations across participating frames or windows.               |
| [Shadow DOM](https://tabster.io/docs/shadow-dom)     | Provides opt-in, Shadow-DOM-aware traversal for Tabster features.                                     |

## Local development

This repository includes a Storybook-based examples project used both as a
manual test bed and as the source for [tabster.io/storybook](https://tabster.io/storybook/):

```bash
npm install
npm start   # starts Storybook at http://localhost:8080
```

The documentation site itself lives in [`docs/`](./docs) and is built with
[Docusaurus](https://docusaurus.io/); run `npm run build-docs` from the repo
root to build it.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

This project is licensed under the MIT License — see [LICENSE](./LICENSE)
for details.

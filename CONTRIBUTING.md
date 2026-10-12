# Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Setup

- Use Node.js 24, matching `.nvmrc` and CI.
- npm install

Dependency upgrades should use stable releases rather than alpha or beta
dist-tags. TypeScript stays on 6.0.3 in the library and docs because the current
typescript-eslint release requires TypeScript below 6.1. Babel stays on the
latest compatible 7.x releases because Jest's syntax preset still depends on
Babel 7-only plugins.

Docusaurus now resolves the official `image-size` 2.0.4 release, which includes
the fixes for GHSA-w3rx-r6r6-pgpr and GHSA-5p2g-fcmc-qvqq. The temporary
PNG-only replacement has been removed; the docs tests retain Docusaurus
integration coverage and bounded malformed-image regression checks. The
`qs` and `webpack` overrides have also been removed because their consumers
now accept the fixed releases.

Dependency ranges still require overrides for `basic-ftp` in the root and
`postcss-selector-parser` and `tinypool` in the docs to resolve fixed
official releases. Recheck these overrides at each dependency bump.
The root also overrides `@istanbuljs/load-nyc-config` to use `js-yaml` 4.3.2,
matching the YAML version used by the other tooling and removing the
vulnerable `sprintf-js` dependency. The loader uses the supported `load` API.
The local `brace-expansion` adapters remain necessary for older
minimatch consumers that expect a callable CommonJS export.

The docs still transitively require `braces` 3.0.3, affected by
GHSA-vfj7-8cjw-p6xm (Dependabot alert 499). No patched official release is
currently available, and current stable Docusaurus and micromatch releases
still depend on it. This dependency bump does not resolve that alert;
recheck upstream releases at each bump.

## Available commands

### build

`npm run build` - builds codebase.

### start

`npm start` - runs storybook.

`npm start:storybook` - to run storybook in the uncontrolled codepath of tabster.

### test

`npm run test` - to run all tests

`npm run test:uncontrolled` - to run all tests in the uncontrolled codepath of tabster.

Tests need to be run in browser, so make sure storybook is running before running tests.

`npm test --prefix docs` - checks Docusaurus image-size integration and
malformed-image regressions without a browser.

### format

`npm run format` - to use prettier to format the codebase.

### lint

`npm run lint` - runs eslint on the codebase.

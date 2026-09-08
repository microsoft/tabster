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
typescript-eslint release requires TypeScript below 6.1. Babel stays on 7.29.7
because Jest's syntax preset still depends on Babel 7-only plugins.

The docs override `qs` to 6.16.0 because Express and body-parser's dependency
ranges exclude that security fix. Docusaurus still depends on `image-size`
2.0.2, so the docs temporarily replace it with the local, PNG-only reader in
`docs/compat/image-size`, without a third-party fork. Its README documents
the supported API and removal steps. Recheck GHSA-w3rx-r6r6-pgpr and
GHSA-5p2g-fcmc-qvqq at every dependency bump and remove the replacement once
a trusted official release fixes both.

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

`npm test --prefix docs` - checks the local image-size replacement and its
Docusaurus integration without a browser.

### format

`npm run format` - to use prettier to format the codebase.

### lint

`npm run lint` - runs eslint on the codebase.

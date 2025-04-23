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

- npm install

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

### format

`npm run format` - to use prettier to format the codebase.

### lint

`npm run lint` - runs eslint on the codebase.

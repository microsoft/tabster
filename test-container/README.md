# Tabster test container

Since tabster is built to handle browser focus scenarios, even the lowest level of unit tests will require the the brower. This project contains a simple static HTML website that uses `webpack-dev-server` to serve `tabster` and watches code changes locally.

This project does not care about how the tests are actually run, and what DOM/JS needs to be added to this test container for specific tests.

### Usage

`npm run start` will build and serve the test container

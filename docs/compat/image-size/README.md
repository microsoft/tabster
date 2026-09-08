# Temporary docs image-size replacement

This private, local package replaces Docusaurus's `image-size` dependency
while trusted upstream releases remain affected by GHSA-w3rx-r6r6-pgpr and
GHSA-5p2g-fcmc-qvqq. It is independently implemented, with no upstream parser
code, third-party fork, or external dependencies.

It implements only the API Docusaurus uses:
`image-size/fromFile.imageSizeFromFile(path)`, returning a promise of
`{ width, height, type: "png" }`. All current docs images are PNGs.

The implementation reads at most 33 bytes and validates the PNG signature,
IHDR structure, checksum, and dimensions. It does not decode pixels or fully
validate the image. Other formats and malformed headers are rejected
explicitly; do not add non-PNG docs images while this replacement is active.

## Removal at a future dependency bump

Recheck both advisories at **each dependency bump**. Remove this replacement
as soon as a trusted official release fixes both issues and supports
Docusaurus's `imageSizeFromFile` API:

1. Update Docusaurus or override its dependency to the verified fixed official
   release. Remove the local `image-size` devDependency and `$image-size`
   override from `docs/package.json`, then regenerate its lockfile.
2. Delete `docs/compat/image-size`. Remove the PNG-only implementation tests
   from `docs/tests/image-size.test.cjs`, retaining the Docusaurus integration
   and bounded malformed-image regression tests.
3. Run `npm test --prefix docs`, `npm run typecheck --prefix docs`, and
   `npm run build --prefix docs`. Recheck every affected lockfile version
   against GitHub's advisory ranges and confirm the alerts clear after merge.

A new version number alone is not sufficient evidence that the issues are
fixed.

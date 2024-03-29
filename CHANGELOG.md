# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.2]

### Fixed

- Change permanente redirection to temporary redirection
- Remove namespace in XML received from the CAS ([Issue#1])
- Handle response that are not an XML from the CAS ([Issue#1])

### Added

- Add a new parameter to handle trailing slash in URL ([Issue#1])

## [2.0.1]

### Fixed

- Fix import failure with CommonJS ([Issue#1])

## [2.0.0]

### Changed

- Add compatibility to all SvelteKit version `1.0.0-next.492` and later
- Use [@macfja/sveltekit-session](https://www.npmjs.com/package/@macfja/sveltekit-session) to data persistence

## [1.0.1]

### Fixed

- Import of `njwt` not compatible
- Session cookie not HTTP only and not Secure

## [1.0.0]

First version

[unreleased]: https://github.com/MacFJA/sveltekit-cas/compare/2.0.2...HEAD
[2.0.2]: https://github.com/MacFJA/sveltekit-cas/releases/tag/2.0.2
[2.0.1]: https://github.com/MacFJA/sveltekit-cas/releases/tag/2.0.1
[2.0.0]: https://github.com/MacFJA/sveltekit-cas/releases/tag/2.0.0
[1.0.1]: https://github.com/MacFJA/sveltekit-cas/releases/tag/1.0.1
[1.0.0]: https://github.com/MacFJA/sveltekit-cas/releases/tag/1.0.0
[issue#1]: https://github.com/MacFJA/sveltekit-cas/issues/1

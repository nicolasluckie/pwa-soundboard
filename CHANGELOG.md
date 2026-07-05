# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.5] - 2026-07-05

### Added

- Add platform-specific icons for iOS, macOS, and Android ([`b984e10`](https://github.com/nicolasluckie/pwa-soundboard/commit/b984e1067408080d05fd47a183641de9eeec5095))

## [1.0.4] - 2026-07-05

### Added

- Move add sound button to title row and make stop button sticky ([`b19b2b4`](https://github.com/nicolasluckie/pwa-soundboard/commit/b19b2b4fc72bd4dbb6d95806444cf13664fd5607))

### Fixed

- Standardize source key to "demo" and rename user data file ([`767ac8b`](https://github.com/nicolasluckie/pwa-soundboard/commit/767ac8bd163df18e91c923f2d1d433218047973c))

## [1.0.3] - 2026-07-04

### Fixed

- Improve version-bump robustness, rename demo icon, update app logo ([#4](https://github.com/nicolasluckie/pwa-soundboard/issues/4)) ([`69b5d8f`](https://github.com/nicolasluckie/pwa-soundboard/commit/69b5d8ff533d66c71b4c507bd6c993405cd410fa))

## [1.0.2] - 2026-07-04

### Added

- ⚠ **BREAKING CHANGE:** V1.0.2 — icon uploads, sound source separation, CI consolidation ([#3](https://github.com/nicolasluckie/pwa-soundboard/issues/3)) ([`8e8577e`](https://github.com/nicolasluckie/pwa-soundboard/commit/8e8577e6e8a597078fd40768f6806807980daae2))

### Changed

- Streamline badge display and reorder ([`fd69308`](https://github.com/nicolasluckie/pwa-soundboard/commit/fd69308f8231efb242e324d807c49b04011a1579))

## [1.0.1] - 2026-07-02

### Fixed

- Copy server/index.js into Docker runtime stage ([`91e01d7`](https://github.com/nicolasluckie/pwa-soundboard/commit/91e01d78e389e36f2cc5cf4edfd4da71eb514c05))

## [1.0.0] - 2026-07-02

### Added

- Initial release with CI/CD, testing, and Docker ([`4a56561`](https://github.com/nicolasluckie/pwa-soundboard/commit/4a565614cf61fce3a178b22fac639a2ef533e3f7))
- Add sound upload with ffmpeg normalization ([`fb822ba`](https://github.com/nicolasluckie/pwa-soundboard/commit/fb822ba369c0dc1e81573b346d8e0df171172d23))

### Changed

- Add SECURITY.md and update README.md ([`780c9c5`](https://github.com/nicolasluckie/pwa-soundboard/commit/780c9c5c7a76d152ca6f137b113bb711eed1488d))

### Fixed

- Regenerate lock files for Node 22 npm and slim Docker runtime ([`edc4a5d`](https://github.com/nicolasluckie/pwa-soundboard/commit/edc4a5d3b754dcd33ab53dd97fb10978a70e3bb0))
- Regenerate client lock file for esbuild consistency ([`73af89b`](https://github.com/nicolasluckie/pwa-soundboard/commit/73af89b1acf9b480ba89ecff21737f2dbcdfa45b))
- Upgrade npm in CI to fix EBADPLATFORM on esbuild optional deps ([`f48280a`](https://github.com/nicolasluckie/pwa-soundboard/commit/f48280af2921e857b0c0526a4c5a228a219a2904))
- Use pip for genbadge and ignore npm sigstore CVE in Trivy ([`db426cb`](https://github.com/nicolasluckie/pwa-soundboard/commit/db426cb0b04744689f59fa2a3acf7a06dd48e640))
- Use pip for genbadge and ignore npm sigstore CVE in Trivy ([`d67bd57`](https://github.com/nicolasluckie/pwa-soundboard/commit/d67bd57d3ab956bd7f6f854241a37a9431b8a097))

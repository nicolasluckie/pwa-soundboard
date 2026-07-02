# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

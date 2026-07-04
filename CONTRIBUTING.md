# Contributing to PWA Soundboard

Thanks for your interest in contributing! PWA Soundboard is a React + Vite PWA soundboard with a dark launchpad grid, instant search, overlapping playback, and offline audio caching. This guide covers everything you need to get set up and contribute effectively.

---

## Prerequisites

- [Node.js](https://nodejs.org) >= 22
- npm
- Docker (optional, for containerized deployment)
- [gitleaks](https://github.com/gitleaks/gitleaks) — for pre-commit secret scanning (`brew install gitleaks` on macOS)
- [git-cliff](https://github.com/orhun/git-cliff) — for CHANGELOG generation during releases (release maintainers only)

---

## Getting Started

1. **Clone the repo:**

   ```bash
   git clone https://github.com/nicolasluckie/pwa-soundboard.git
   cd pwa-soundboard
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

   This installs root dependencies, client dependencies, server dependencies, and sets up Husky git hooks automatically via the `prepare` script.

3. **Install Playwright browsers (for e2e tests):**

   ```bash
   npx playwright install chromium
   ```

4. **Start the development server:**

   ```bash
   npm run dev
   ```

   This starts both the Vite dev server (port 5173) and the Express server (port 3000) concurrently.

---

## Development Workflow

### Branching

Create a branch from `main` for your work:

```bash
git checkout -b feat/your-feature
```

### Git Hooks

This project uses [Husky](https://github.com/typicode/husky) for git hooks:

- **pre-commit**: Runs `lint-staged` (Prettier + ESLint on staged files) and `gitleaks` (secret detection on staged files)
- **commit-msg**: Enforces [Conventional Commits](https://www.conventionalcommits.org/) via commitlint

If gitleaks is not installed, the pre-commit hook will print a warning and skip secret detection. It's strongly recommended to install it.

### Making Commits

Use the interactive Conventional Commits prompt:

```bash
npm run commit
```

Or write commits manually following the format described below.

---

## Commit Message Convention

All commit messages **must** follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This is required for automated CHANGELOG generation via [git-cliff](https://github.com/orhun/git-cliff).

### Format

```
<type>[optional scope]: <short description>

[optional body — wrap at 72 chars]

[optional footer(s)]
```

- **Subject line**: imperative mood, lowercase after the colon, no trailing period, ≤72 chars
- **Body**: explain _what_ and _why_, not _how_; separate from subject with a blank line
- **Breaking changes**: add `BREAKING CHANGE: <description>` in the footer, or append `!` after the type: `feat(ui)!: redesign launchpad grid`

### Types

| Type       | Use for                                 | Appears in CHANGELOG? |
| ---------- | --------------------------------------- | --------------------- |
| `feat`     | New user-facing features                | Yes — Added           |
| `fix`      | Bug fixes                               | Yes — Fixed           |
| `refactor` | Code restructuring, no behaviour change | Yes — Changed         |
| `perf`     | Performance improvements                | Yes — Changed         |
| `docs`     | Documentation only                      | Yes — Changed         |
| `test`     | Adding or updating tests                | No                    |
| `chore`    | Maintenance, deps, tooling              | No                    |
| `ci`       | CI/CD pipeline changes                  | No                    |
| `style`    | Formatting, whitespace                  | No                    |
| `build`    | Build system changes                    | No                    |

### Scopes (optional but encouraged)

| Scope    | Covers                                     |
| -------- | ------------------------------------------ |
| `ui`     | React components, layout, styling          |
| `audio`  | Sample files, samples.json, playback logic |
| `pwa`    | Service worker, manifest, offline caching  |
| `server` | Express server, static serving             |
| `config` | Vite config, environment                   |
| `ci`     | GitHub Actions workflows                   |
| `deps`   | Dependency updates                         |

### Examples

**Good:**

```
feat(ui): add global stop button to launchpad
fix(audio): handle missing audio files gracefully
refactor(server): move static file serving to dedicated middleware
chore(deps): bump vite-plugin-pwa to 0.21.0
docs: add audio file organization section to README
test(pwa): add service worker cache hit tests
```

**Bad:**

```
Updated stuff                   # no type, vague
fix: Fixed the bug              # capitalised after colon, past tense
feat: add new feature.          # trailing period
CHORE: bump deps                # uppercase type
```

> The canonical reference for commit rules is [AGENTS.md](./AGENTS.md).

---

## Code Style

Code formatting and linting are enforced automatically via `lint-staged` on every commit. You can also run them manually:

```bash
npm run lint     # check formatting and lint client code
npm run format   # auto-format client code with Prettier
```

- **Prettier** handles formatting (indentation, quotes, trailing commas, etc.)
- **ESLint** catches code quality issues
- Both run on staged files via lint-staged — only changed files are checked

---

## Testing

### Unit tests (Vitest)

```bash
npm run test:unit
```

Tests live in `client/src/test/` and run in a jsdom environment.

### Coverage gate

Unit tests enforce a **70% minimum coverage** threshold across statements, branches, functions, and lines. The build fails if any metric drops below 70%.

```bash
npm run test:unit:coverage
```

### End-to-end tests (Playwright)

```bash
npm run test:e2e
```

Tests live in `client/src/e2e/`. Playwright auto-starts both the Express server (port 3000) and the Vite dev server (port 5173) — no need to run them separately. Only Chromium is configured.

In CI, e2e tests run against the production build served by the Express server using the `PW_SKIP_BUILD` env var.

### Run all tests

```bash
npm test
```

---

## Pull Request Process

1. **Ensure all checks pass locally:**

   ```bash
   npm run lint && npm test
   ```

2. **Push your branch** and open a pull request targeting `main`.

3. **Fill out the PR template.** The template includes a checklist for:
   - Linked issue (`Closes #___`)
   - Type of change (feat, fix, refactor, etc.)
   - Testing performed (unit, e2e, manual, PWA offline)
   - Conventional Commits compliance
   - Linting and formatting
   - Secret scanning (gitleaks)
   - Self-review

4. **CI checks run automatically on every PR:**
   - **Lint** — Prettier + ESLint
   - **Unit tests** — with coverage enforcement (70% minimum)
   - **Build** — Vite production build
   - **Docker smoke test** — builds the image and verifies the container responds
   - **E2E tests** — Playwright against the production build

   All jobs must pass before merge.

5. **Address review feedback** promptly. Push fixes as new commits — do not force-push during review unless asked.

---

## Project Structure

```
pwa-soundboard/
├── .github/
│   └── workflows/         # CI & Release GitHub Actions
├── .husky/                # Git hooks (pre-commit, commit-msg)
├── client/                # React + Vite frontend
│   └── src/
│       ├── components/    # React components
│       ├── e2e/           # Playwright e2e tests
│       ├── hooks/         # Custom React hooks (useAudio)
│       └── test/          # Vitest unit tests
├── data/                  # Sound data (partially gitignored)
│   ├── audio/
│   │   ├── demos/         # Committed demo sounds (repo)
│   │   └── user/          # Your personal sounds (gitignored)
│   ├── demos.json         # Demo sound metadata (committed)
│   └── user-samples.json  # User sound metadata (gitignored)
├── docker/                # Docker build + compose overrides
│   ├── Dockerfile         # Multi-stage Docker build
│   ├── compose.dev.yaml   # Dev override (build from source)
│   └── compose.prod.yaml  # Prod override (pull prebuilt image)
├── server/                # Node.js + Express static server
├── scripts/               # Utility scripts (version-bump)
├── commitlint.config.cjs  # Conventional Commits rules
├── cliff.toml             # git-cliff CHANGELOG config
├── compose.yaml           # Base Docker Compose config
└── README.md
```

See the [README](./README.md) for more detail on each directory.

---

## Adding Sounds

There are two ways to add sounds to the soundboard:

1. **Via the UI** — click the "Add Sound" button, select an audio or video file, fill in the metadata (name, emoji, color, tags), and submit. The server normalizes the file to MP3 via ffmpeg, saves it to `data/audio/user/`, and updates `data/user-samples.json` automatically. (Requires `user` in the `SOURCES` env var.)

2. **Manually** — drop an `.mp3` file into `data/audio/user/`, then add an entry to `data/user-samples.json` with `id`, `name`, `file`, and `color`.

Demo sounds in `data/audio/demos/` are committed to the repo and work out of the box. See the [README](./README#audio-files) for full details on the `SOURCES` env var.

---

## Release Process

Releases are managed via `scripts/version-bump.sh` and [git-cliff](https://github.com/orhun/git-cliff). Only maintainers should create releases.

### Steps

```bash
scripts/version-bump.sh 1.0.0
git push --follow-tags
```

This script:

1. Validates the version format (semver `X.Y.Z`)
2. Runs lint to ensure code quality
3. Bumps `package.json` version
4. Generates `CHANGELOG.md` from commit history (via git-cliff)
5. Commits `package.json`, `package-lock.json`, and `CHANGELOG.md`
6. Creates an annotated git tag (`v1.0.0`)

Pushing the tag triggers the release workflow in CI, which promotes the Docker image to versioned tags on GHCR.

### Versioning

This project uses [Semantic Versioning](https://semver.org/):

- `fix` → patch bump (`1.0.0` → `1.0.1`)
- `feat` → minor bump (`1.0.0` → `1.1.0`)
- `BREAKING CHANGE` footer or `!` suffix → major bump (`1.0.0` → `2.0.0`)

Tags must be prefixed with `v` (e.g. `v1.0.0`) for git-cliff to pick them up.

### CHANGELOG

`CHANGELOG.md` is auto-generated by git-cliff. **Do not edit it manually** — changes will be overwritten by the version-bump script.

---

## Docker

The project uses a multi-stage Docker build (Node build stage → nginx-free Express runtime stage).

### Development (build from source)

```bash
docker compose -f compose.yaml -f docker/compose.dev.yaml build
docker compose -f compose.yaml -f docker/compose.dev.yaml up -d
```

### Production (pull prebuilt image from GHCR)

```bash
docker compose -f compose.yaml -f docker/compose.prod.yaml up -d
```

Docker images are published to `ghcr.io/nicolasluckie/pwa-soundboard`. See the [README](./README#deployment) for all configuration options.

---

## Security

- **Never commit secrets** (API keys, passwords, tokens) to the repository
- **gitleaks** runs automatically in the pre-commit hook to detect secrets in staged files
- If you suspect a vulnerability, report it privately via [GitHub Security Advisories](https://github.com/nicolasluckie/pwa-soundboard/security/advisories/new) — do not open a public issue
- See [SECURITY.md](./SECURITY.md) for the full security policy

---

## License

This project is licensed under the [MIT License](./LICENSE). By contributing, you agree that your contributions will be licensed under the same license.

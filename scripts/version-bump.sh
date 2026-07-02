#!/usr/bin/env bash
# Bump package.json version, generate CHANGELOG, and create release tag.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION=""
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: scripts/version-bump.sh <version> [options]

Bump package.json version, generate CHANGELOG, and create git tag.

  <version>       Semantic version (e.g. 1.0.0, 1.1.0, 2.0.0)
  --dry-run       Show what would be done without making changes
  -h, --help     Show this help

Example:
  scripts/version-bump.sh 1.0.0
  scripts/version-bump.sh 1.0.0 --dry-run
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage; exit 1 ;;
    *) VERSION="$1"; shift ;;
  esac
done

if [[ -z "$VERSION" ]]; then
  echo "Error: Version is required" >&2
  usage
  exit 1
fi

# Validate version format (semantic versioning)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: Invalid version format. Expected X.Y.Z (e.g. 1.0.0)" >&2
  exit 1
fi

TAG="v${VERSION}"

cd "$ROOT"

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: Tag $TAG already exists" >&2
  exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: Working directory has uncommitted changes" >&2
  exit 1
fi

# Run lint on all files
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[DRY RUN] Would run: npm run lint"
else
  echo "Running lint..."
  npm run lint || {
    echo "Error: Linting failed" >&2
    exit 1
  }
fi

# Bump package.json version
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[DRY RUN] Would bump package.json version to $VERSION"
else
  echo "Bumping package.json version to $VERSION..."
  npm version "$VERSION" --no-git-tag-version
fi

# Generate CHANGELOG
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[DRY RUN] Would run: git-cliff -o CHANGELOG.md"
else
  if command -v git-cliff >/dev/null 2>&1; then
    echo "Generating CHANGELOG..."
    git-cliff --tag "${TAG}" -o "${ROOT}/CHANGELOG.md"
  else
    echo "Warning: git-cliff not found, skipping CHANGELOG generation"
  fi
fi

# Commit package.json and CHANGELOG
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[DRY RUN] Would commit package.json, package-lock.json, and CHANGELOG.md"
else
  git add package.json package-lock.json CHANGELOG.md
  git commit -m "chore(release): prepare ${TAG}"
fi

# Create git tag
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[DRY RUN] Would create tag: $TAG"
else
  echo "Creating tag $TAG..."
  git tag -a "$TAG" -m "Release ${TAG}"
fi

echo ""
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[DRY RUN] Release ${TAG} would be prepared successfully!"
else
  echo "Release ${TAG} prepared successfully!"
fi
echo ""
echo "Next steps:"
echo "  git push --follow-tags"

# Security policy

## Supported versions

PWA Soundboard is a self-hosted application with a single supported release line: the latest tagged version on `main`. Older versions do not receive backported fixes.

## Reporting a vulnerability

Please report suspected vulnerabilities privately via GitHub's "Report a vulnerability" form on the repository's Security tab (<https://github.com/nicolasluckie/pwa-soundboard/security/advisories/new>).

Please include:

- A description of the issue and its impact
- Steps to reproduce, or a proof-of-concept
- The affected version (commit SHA or release tag)
- Any suggested remediation, if you have one

You can expect an initial acknowledgement within 7 days. Please do not file public issues, pull requests, or discussions for unpatched vulnerabilities.

## Scope

In scope:

- Server-side request handling, file upload, and ffmpeg audio processing
- CSRF origin checks and input validation on API endpoints
- Path traversal or arbitrary file write via the upload endpoint
- Supply-chain integrity of published container images and dependencies

Out of scope:

- Vulnerabilities in self-hosted deployments caused by misconfiguration of the surrounding environment (reverse proxy, TLS, OS, container runtime)
- Denial of service that depends on uncapped resource limits the operator is expected to set (upload size, request rate-limiting at the reverse proxy)
- Issues in third-party dependencies that should be reported upstream to the respective maintainers

## Verifying releases

Published container images at `ghcr.io/nicolasluckie/pwa-soundboard` carry both an SLSA build provenance attestation (signed via Sigstore) and an SPDX SBOM, generated automatically by the release workflow.

### Verify the attestation

Using the [GitHub CLI](https://cli.github.com/) (`gh` 2.49 or later):

```bash
gh attestation verify oci://ghcr.io/nicolasluckie/pwa-soundboard:vX.Y.Z \
    --repo nicolasluckie/pwa-soundboard
```

The `gh attestation verify` command accepts a tag (`:vX.Y.Z`, `:latest`) or a digest reference (`@sha256:...`).

### Inspect the SBOM

```bash
docker buildx imagetools inspect \
    ghcr.io/nicolasluckie/pwa-soundboard:vX.Y.Z \
    --format '{{ json .SBOM }}'
```

### Pin by digest

To pin a deployment to the exact bytes you verified, capture the **image index** digest:

```bash
docker buildx imagetools inspect ghcr.io/nicolasluckie/pwa-soundboard:vX.Y.Z
```

The `Name:` line at the top contains the image index digest (the multi-arch manifest list). Use that value, with `@sha256:`, in your compose file:

```yaml
image: ghcr.io/nicolasluckie/pwa-soundboard@sha256:<digest>
```

> **Note:** the registry's tag list will show tags of the form `sha256-<digest>` alongside the images. Those are Sigstore attestation artifacts, not images. Pulling one as if it were the application will fail with `unsupported media type application/vnd.oci.empty.v1+json` or similar. Always pin by `@sha256:<digest>` taken from `imagetools inspect`, never by the visually-similar `:sha256-<digest>` tag.

# Security Policy

AutomatosX values the security of our users and their development workflows. This policy
describes how to report potential vulnerabilities and outlines our current security
posture.

## Supported Versions

The latest tagged release (v3.1.x) receives security fixes on a best-effort basis. Older
versions should be upgraded to the latest release to receive patches.

## Reporting a Vulnerability

Please email security@defai.digital with the following details:
- A concise description of the issue and potential impact.
- Steps to reproduce, including any scripts or configurations used.
- Suggested mitigations or workarounds (if available).

You can encrypt sensitive reports with our PGP key (available on request). We aim to
acknowledge reports within 3 business days and provide status updates at least once every
10 business days until resolved.

## Handling Sensitive Artifacts

- Chat history and workspace outputs are stored locally under `.defai/` and `.claude/`. They
  may contain sensitive prompts or user data; do not share these directories publicly.
- Provider credentials remain controlled by their respective CLIs; no API keys are stored
  in the repository. Ensure your local CLI cache is secured per provider guidelines.

## Responsible Disclosure

If you discover a vulnerability, please give us reasonable time to investigate and release
a fix before public disclosure. We will credit security researchers who responsibly report
issues, unless otherwise requested.

Thank you for helping keep AutomatosX secure.

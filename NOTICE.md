# Notice and attribution

This repository is a **derivative work** of:

> **ai-job-search** - https://github.com/MadsLorentzen/ai-job-search
> Copyright (c) 2026 Mads Lorentzen
> Licensed under the MIT License

Derived from the upstream snapshot at commit `d621ebe` (release line 1.7.3).

The MIT License requires that the original copyright notice and permission notice be included in all copies or substantial portions of the software. They are reproduced in [LICENSE](LICENSE) alongside the copyright line for the modifications made in this repository.

## Modifications in this repository

- Added portal skills: `getonbrd-search`, `remoteok-search`.
- Removed portal skills: `jobindex-search`, `jobnet-search`, `jobbank-search`, `jobdanmark-search`.
- Removed upstream-specific funding/donation links and issue-template links.
- Rewrote `README.md` and `CHANGELOG.md`; adapted a few tests and docs to the changed portal set.
- Profile files are shipped as blank placeholders.

## Not affiliated

This repository is not affiliated with, endorsed by, or maintained by the original author or by Anthropic.

## Third-party services

Portal skills read public data from LinkedIn, freehire.me, Get on Board and Remote OK. Each service has its own terms of use (see each portal's `SKILL.md`); Remote OK requires attribution when its data is shown.

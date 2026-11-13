# remoteok-cli

Zero-dependency CLI for Remote OK (remoteok.com) remote jobs, through its public JSON feed. See `../SKILL.md` for the command reference, the attribution requirement and the limits of the feed, and `../url-reference.md` for the endpoint notes.

```bash
bun install            # dev types only (typescript, @types/bun)
bun run typecheck
bun run test           # offline unit tests + a live smoke test against remoteok.com
bun run src/cli.ts search -q ".net" --format table
```

Runtime dependencies: none (plain `bun` + `fetch`).

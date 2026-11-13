# getonbrd-cli

Zero-dependency CLI for Get on Board (getonbrd.com) tech jobs, through its public JSON API. See `../SKILL.md` for the full command reference and `../url-reference.md` for the endpoint notes.

```bash
bun install            # dev types only (typescript, @types/bun)
bun run typecheck
bun run test           # offline unit tests + a live smoke test against getonbrd.com
bun run src/cli.ts search -q ".NET" -c CO --strict --format table
```

Runtime dependencies: none (plain `bun` + `fetch`).

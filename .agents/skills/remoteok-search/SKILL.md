---
name: remoteok-search
version: 1.0.0
description: >
  Use this skill to search live remote job listings on Remote OK (remoteok.com), a
  global remote-work job board, through its public JSON feed, or to look up one posting.
  Covers remote roles worldwide, mostly in English, with an occasional "LATAM" or
  "Worldwide" location. Trigger phrases: Remote OK, remoteok, remote jobs, remote developer
  jobs, work from home jobs, digital nomad jobs, trabajo remoto internacional, empleos
  remotos en inglés, remote .NET jobs, remote software engineer roles.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/remoteok-search/cli/src/cli.ts *)
---

# Remote OK Search Skill

Search live remote job listings from **[Remote OK](https://remoteok.com)** through its
public JSON feed (`https://remoteok.com/api`). No authentication, no API key and **zero
runtime dependencies**: it only needs `bun`.

## Terms of use

Remote OK's API terms ask that anyone who shows its data **links back to the posting on
remoteok.com (follow link) and names Remote OK as the source**. Every result carries its
remoteok.com `url`, and the table/plain output ends with a `Source:` line. Keep that
attribution if you copy postings anywhere else, do not use the Remote OK logo without
permission, and keep volume low (the CLI makes one request per call).

## Limits you should know about

- The feed is **one page of the ~100 most recent postings** and accepts **no filters**. Every filter here (keywords, location, age) runs client-side over those postings, so a narrow query often returns 0-3 results and `--page 2` is always empty.
- Many postings leave `location` empty ("worldwide" is not stated). Using `--location` drops them.
- It does not say which countries may apply. **Read the posting to confirm it accepts candidates based in your country.**
- `detail` finds a posting only while it is still in the feed.

For breadth in LATAM, run this next to `getonbrd-search`, `linkedin-search` and `freehire-search`.

## Commands

### Search

```bash
bun run .agents/skills/remoteok-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

- `--query` / `-q <text>` - every term must appear in the title, company, tags, location or description.
- `--location` / `-l <text>` - substring of the posting's location (`latam`, `worldwide`, `brazil`...).
- `--jobage <days>` - posted within N days.
- `--page <n>` - accepted for contract parity; only page 1 has results.
- `--limit` / `-n <n>` - cap the results emitted.
- `--format json|table|plain` - default `json`.

### Detail

```bash
bun run .agents/skills/remoteok-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

## Examples

```bash
# .NET roles in the current feed
bun run .agents/skills/remoteok-search/cli/src/cli.ts search -q ".net" --format table

# Full-stack roles open to LATAM, posted in the last two weeks
bun run .agents/skills/remoteok-search/cli/src/cli.ts search -q "full stack" -l latam --jobage 14 --format table

# Everything from the last 3 days
bun run .agents/skills/remoteok-search/cli/src/cli.ts search --jobage 3 --format table

# Full text of one posting
bun run .agents/skills/remoteok-search/cli/src/cli.ts detail 1137411 --format plain
```

## Output

JSON: `{ "meta": { "count", "page", "feed_size", "source" }, "results": [...] }`. Each result has `id`, `title`, `company`, `location`, `date` (YYYY-MM-DD), `url`, plus `tags`, `salary_min`, `salary_max`. Missing values are `null` (a salary of 0 becomes `null`). Errors go to stderr as `{ "error", "code" }` with exit code 1.

## Notes

- The feed's text is UTF-8 that was encoded twice (`Sotheby’s` arrives as `Sothebyâ€™s`); the CLI repairs it before searching or printing.
- Salaries, when present, are in USD per year as Remote OK publishes them; confirm on the posting.
- Endpoint notes live in `url-reference.md`.

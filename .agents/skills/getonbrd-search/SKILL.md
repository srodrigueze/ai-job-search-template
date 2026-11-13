---
name: getonbrd-search
version: 1.0.0
description: >
  Use this skill to search live tech job listings on Get on Board (getonbrd.com), a
  Latin-American tech job board (Chile, Colombia, Mexico, Argentina, Peru and remote
  roles open to LATAM), through its public JSON API, or to look up one posting.
  Postings are mostly in Spanish and English. Trigger phrases: Get on Board, getonbrd,
  trabajo remoto LATAM, ofertas de desarrollador en Colombia, empleos de tecnología
  en Latinoamérica, vacantes .NET, buscar empleo de programador, find a developer job
  in Latin America, remote tech jobs for Colombia.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/getonbrd-search/cli/src/cli.ts *)
---

# Get on Board Search Skill

Search live tech job listings from **[Get on Board](https://www.getonbrd.com)**, a
LATAM-focused tech job board, through its public JSON API
(`https://www.getonbrd.com/api/v0`). No authentication, no API key and **zero runtime
dependencies**: it only needs `bun`.

Get on Board publishes no terms against reading its public API and its `robots.txt`
places no restriction on it (checked 2026-10-19). Keep volume low and use it for your
own job search.

## When to use this skill

- Look for tech jobs in Colombia, Chile, Mexico, Argentina, Peru or remote LATAM roles
- Filter by country, work modality (remote / hybrid / on-site) and posting age
- Read one posting's full text by its slug or URL

## Commands

### Search

```bash
bun run .agents/skills/getonbrd-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

Flags:
- `--query` / `-q <text>` - keywords. **The server match is fuzzy** (a search for `.NET` also returns unrelated roles). Add `--strict` to keep only postings whose title or description contain every term.
- `--country` / `-c <code>` - ISO 3166-1 alpha-2 code (`CO`, `MX`, `CL`, `AR`, `PE`...). Narrows results a lot; without it a query can span many pages and the best matches may not be on page 1.
- `--remote <mode>` - `remote` (fully remote + remote within a country) | `hybrid` | `onsite`. Filtered client-side on each posting's `remote_modality`.
- `--jobage <days>` - posted within N days (client-side filter; the API has no recency parameter).
- `--strict` - boolean flag, no value.
- `--page <n>` - 1-indexed page, 50 results per page. Default 1.
- `--limit` / `-n <n>` - cap the results emitted (client-side).
- `--format json|table|plain` - default `json`.

Filters other than `--query` and `--country` run **after** the page is fetched, so a page can come back with fewer results than 50; use `--page` to continue.

### Detail

```bash
bun run .agents/skills/getonbrd-search/cli/src/cli.ts detail <slug|url> [--format json|plain]
```

`<slug>` is the `id` field from a search result, or a `getonbrd.com/jobs/...` URL.

## Examples

```bash
# .NET jobs open to Colombia, only real .NET matches
bun run .agents/skills/getonbrd-search/cli/src/cli.ts search -q ".NET" -c CO --strict --format table

# C# remote roles posted in the last two weeks
bun run .agents/skills/getonbrd-search/cli/src/cli.ts search -q "C#" -c CO --remote remote --jobage 14 --strict --format table

# Angular, hybrid, Colombia
bun run .agents/skills/getonbrd-search/cli/src/cli.ts search -q "Angular" -c CO --remote hybrid --format table

# Full text of one posting
bun run .agents/skills/getonbrd-search/cli/src/cli.ts detail senior-full-stack-engineer-net-y-react-maxxa-remote --format plain
```

## Output

JSON: `{ "meta": { "count", "page", "total_pages" }, "results": [...] }`. Each result has `id` (the posting slug), `title`, `company`, `location`, `date` (YYYY-MM-DD), `url`, plus `remote_modality`, `remote_zone`, `countries`, `salary_min`, `salary_max`, `language`, `category`. Missing values are `null`. Errors go to stderr as `{ "error", "code" }` with exit code 1.

## Notes

- **`remote_modality`** is one of `fully_remote`, `remote_local` (remote, but the hire must live in the listed country), `hybrid`, `no_remote`. A posting listing `countries: ["Remote"]` is open to remote hires; **read the posting to confirm it accepts candidates based in Colombia** (the API does not say which countries are eligible).
- **Salary** is returned as published; the API does not state a currency, so confirm it on the posting before comparing with your minimum.
- `detail` has no API endpoint of its own (`/api/v0/jobs/<id>` answers 401), so it finds the posting through the search endpoint by the slug's words. A posting that has closed returns `NOT_FOUND`.
- Endpoint and parameter notes live in `url-reference.md`.

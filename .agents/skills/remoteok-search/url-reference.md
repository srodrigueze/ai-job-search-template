# Remote OK - endpoint reference

Verified live on 2026-10-19. `GET https://remoteok.com/api` returns a JSON array. No authentication.

## robots.txt

`User-agent: *` allows `/` with `Crawl-delay: 1`. It disallows the AJAX endpoints `/*?action=get_jobs`, `/*?url=`, `/?tags` and `/?&action`, none of which this CLI uses. The CLI makes a single request to `/api` per invocation.

## Response

- Element `[0]` is a legal notice object (`{"legal": "API Terms of Service: Please link back ... mention Remote OK as a source ..."}`), not a job. `parseFeed` drops it.
- Elements `[1..]` are postings (about 99 on 2026-10-19), newest first.
- Query parameters such as `?tag=dotnet` or `?tags=dotnet` returned no postings, so the feed cannot be filtered server-side.

## Posting fields

| Field | Notes |
|-------|-------|
| `id` | numeric id as a string |
| `slug`, `url`, `apply_url` | `url` and `apply_url` point to `https://remoteOK.com/remote-jobs/<slug>`; they must be kept when showing postings (link-back requirement) |
| `date` (ISO 8601), `epoch` | publication time |
| `position`, `company` | title and employer |
| `tags` | array of strings (`dotnet`, `senior`, ...) - tag spelling is not normalized (`c sharp` appears) |
| `location` | free text, often empty; sometimes `LATAM`, `Worldwide`, a country or a city |
| `salary_min`, `salary_max` | strings or numbers, `0` when absent |
| `description` | HTML or plain text |
| `company_logo`, `logo` | image URLs (the logo may not be used without permission) |

## Encoding quirk

About 3 in 4 postings contain text that was UTF-8 decoded as Latin-1 and encoded again (`Sothebyâ\u0080\u0099s`). Re-encoding the string as Latin-1 bytes and decoding as UTF-8 repairs it (`fixMojibake` in `helpers.ts`); the repair is skipped if it would produce a replacement character.

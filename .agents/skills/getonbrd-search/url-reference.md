# Get on Board - endpoint reference

Verified live on 2026-10-19. Base URL: `https://www.getonbrd.com/api/v0`. No authentication. `robots.txt` has no rules. Responses are JSON:API style (`data[]`, each with `id`, `type`, `attributes`, `links`, `meta`).

## Search

`GET /search/jobs`

| Parameter | Meaning | Notes |
|-----------|---------|-------|
| `query` | keywords | Every word must occur in the posting's text, but the matching is loose (stemming / semantic): `.NET` also returns unrelated roles. The CLI's `--strict` filters this client-side. |
| `country_code` | ISO alpha-2 country | Filters server-side. Postings open to remote hires list `countries: ["Remote"]` and appear under many country codes. |
| `per_page` | page size | 100 is accepted; the CLI uses 50. |
| `page` | 1-indexed page | `meta.total_pages` gives the page count. |
| `expand` | `["company"]` (URL-encoded) | Inlines the company object so `attributes.company.data.attributes.name` is available. |
| `remote=true` | only `fully_remote` postings | Not used by the CLI: it would drop `remote_local` postings, which matter for Colombia. |

Not available: a recency parameter (the CLI filters `published_at` client-side).

### Result fields used

- `id` - the posting slug, also the last path segment of the public URL
- `attributes.title`, `attributes.lang`, `attributes.category_name`
- `attributes.remote_modality` - `fully_remote` | `remote_local` | `hybrid` | `no_remote`; `attributes.remote_zone`
- `attributes.countries` - array of country names, or `["Remote"]`
- `attributes.min_salary`, `attributes.max_salary` - numbers, often null, currency not stated
- `attributes.published_at` - Unix seconds
- `attributes.description` (requirements) with `description_headline`, plus `functions`, `desirable`, `benefits` (each with a `*_headline`) - HTML fragments
- `attributes.company.data.attributes.name` (needs `expand`)
- `links.public_url` - e.g. `https://www.getonbrd.com/jobs/<category>/<slug>`
- Relationship objects (`tags`, `seniority`, `modality`, `location_cities`) carry only ids; names are not resolved by the CLI.

## Detail

`GET /jobs/<slug>` answers **401**; `GET /companies/<company>/jobs/<slug>` answers 404. The CLI therefore calls the search endpoint with the slug's words, dropping trailing words until the exact `id` appears (the slug's company and "remote" suffix often are not in the posting text), up to 6 attempts.

## Other endpoints seen

- `GET /categories` - list of categories
- `GET /companies/<company-id>/jobs` - jobs of one company
- `GET /categories/<category>/jobs` - jobs of one category
- The public page `https://www.getonbrd.com/jobs/<slug>` redirects (301) to `/jobs/<category>/<slug>`; it has no JSON-LD block, so the API is the better source.

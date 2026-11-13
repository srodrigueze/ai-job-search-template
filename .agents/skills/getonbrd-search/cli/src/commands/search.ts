import {
  API_BASE,
  jsonFetch,
  toCard,
  matchesAllTerms,
  modalityMatches,
  withinDays,
  writeError,
  type JobCard,
  type RawJob,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  country?: string
  remote?: string // "remote" | "hybrid" | "onsite"
  jobage: number
  strict: boolean
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

interface SearchResponse {
  data: RawJob[]
  meta?: { page?: number; per_page?: number; total_pages?: number }
}

export function buildUrl(opts: SearchOpts): string {
  const params = new URLSearchParams()
  if (opts.query) params.set("query", opts.query)
  if (opts.country) params.set("country_code", opts.country.toUpperCase())
  params.set("per_page", "50")
  params.set("page", String(opts.page))
  params.set("expand", '["company"]')
  return `${API_BASE}/search/jobs?${params.toString()}`
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const header =
    "TITLE".padEnd(42) + " " + "COMPANY".padEnd(24) + " " + "MODALITY".padEnd(13) + " " + "DATE".padEnd(10) + " ID"
  const rows = cards.map(
    (c) =>
      `${c.title.slice(0, 42).padEnd(42)} ${(c.company || "-").slice(0, 24).padEnd(24)} ${(c.remote_modality || "-").padEnd(13)} ${(c.date || "-").padEnd(10)} ${c.id}`,
  )
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const body = await jsonFetch<SearchResponse>(buildUrl(opts))
    const raw = body?.data ?? []

    const kept = raw.filter((job) => {
      const card = toCard(job)
      if (opts.remote && !modalityMatches(opts.remote, card.remote_modality)) return false
      if (!withinDays(card.date, opts.jobage)) return false
      if (opts.strict && opts.query && !matchesAllTerms(job, opts.query)) return false
      return true
    })

    let cards = kept.map(toCard)
    if (opts.limit !== undefined && opts.limit >= 0) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.company || "-"} · ${c.location || "-"} · ${c.remote_modality || "-"} · ${c.date || "-"}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          {
            meta: { count: cards.length, page: opts.page, total_pages: body?.meta?.total_pages ?? null },
            results: cards,
          },
          null,
          2,
        ) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}

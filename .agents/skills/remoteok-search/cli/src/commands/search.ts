import {
  SOURCE,
  fetchFeed,
  toCard,
  matchesAllTerms,
  locationMatches,
  withinDays,
  writeError,
  type JobCard,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  jobage: number
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const header = "TITLE".padEnd(42) + " " + "COMPANY".padEnd(24) + " " + "LOCATION".padEnd(20) + " " + "DATE".padEnd(10) + " ID"
  const rows = cards.map(
    (c) =>
      `${c.title.slice(0, 42).padEnd(42)} ${(c.company || "-").slice(0, 24).padEnd(24)} ${(c.location || "-").slice(0, 20).padEnd(20)} ${(c.date || "-").padEnd(10)} ${c.id}`,
  )
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const feed = await fetchFeed()

    // The feed is a single page of the latest postings, so page 2+ is always empty.
    const matched =
      opts.page > 1
        ? []
        : feed.filter((job) => {
            const card = toCard(job)
            if (!withinDays(card.date, opts.jobage)) return false
            if (opts.location && !locationMatches(card.location, opts.location)) return false
            if (opts.query && !matchesAllTerms(job, opts.query)) return false
            return true
          })

    let cards = matched.map(toCard)
    if (opts.limit !== undefined && opts.limit >= 0) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + `\nSource: ${SOURCE}\n`)
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.company || "-"} · ${c.location || "-"} · ${c.date || "-"}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + `\n\nSource: ${SOURCE}\n`,
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          { meta: { count: cards.length, page: opts.page, feed_size: feed.length, source: SOURCE }, results: cards },
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

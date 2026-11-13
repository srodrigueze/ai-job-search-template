// Data source: Remote OK's public JSON feed, https://remoteok.com/api. No authentication.
// The feed is the ~100 most recent postings and accepts no filters, so every filter
// here (keywords, location, age) runs client-side. The first array element is a
// legal notice, not a job.
//
// Remote OK's terms: link back to the posting on remoteok.com (follow, no nofollow)
// and name Remote OK as the source. Every result carries its remoteok.com `url`, and
// the CLI prints the source line.

export const FEED_URL = "https://remoteok.com/api"
export const SITE_HOST = /(^|\.)remoteok\.com$/i
export const SOURCE = "Remote OK (https://remoteok.com)"

const UA = "Mozilla/5.0 (compatible; remoteok-search-cli/1.0)"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

/** Fetch the feed with exponential backoff on 429/5xx. */
export async function fetchFeed(): Promise<RawJob[]> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(FEED_URL, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return parseFeed(await response.json())
  }
  throw new Error("Request failed after max retries")
}

/** Drop the legal-notice element (and anything else that is not a posting). */
export function parseFeed(body: unknown): RawJob[] {
  if (!Array.isArray(body)) throw new Error("Unexpected response: the feed is not a JSON array")
  return body.filter((j): j is RawJob => !!j && typeof j === "object" && "id" in j && "position" in j)
}

export interface RawJob {
  id: string | number
  slug?: string
  date?: string
  company?: string
  position?: string
  tags?: string[]
  description?: string
  location?: string
  salary_min?: number | string
  salary_max?: number | string
  url?: string
  apply_url?: string
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  tags: string[]
  salary_min: number | null
  salary_max: number | null
}

export interface JobDetail extends JobCard {
  description: string | null
  apply_url: string | null
}

/**
 * The feed's text is UTF-8 that was decoded as Latin-1 and encoded again
 * ("Sothebyâ\u0080\u0099s" for "Sotheby’s"). Undo it when the text looks that way and
 * the round trip is clean; leave it alone otherwise.
 */
export function fixMojibake(text: string | null | undefined): string {
  if (!text) return ""
  if (!/[ÂÃâ][\u0080-¿]/.test(text)) return text
  const fixed = Buffer.from(text, "latin1").toString("utf8")
  return fixed.includes("�") ? text : fixed
}

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
}

/** Description (HTML or plain text) to readable text: tags stripped, entities decoded, line breaks kept. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return ""
  return html
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
    .split("\n")
    .map((line) => decodeHtmlEntities(line.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function salary(v: number | string | undefined): number | null {
  const n = typeof v === "string" ? Number(v) : v
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null
}

export function toCard(raw: RawJob): JobCard {
  const id = String(raw.id)
  return {
    id,
    title: fixMojibake(raw.position) || "(untitled)",
    company: fixMojibake(raw.company) || null,
    location: fixMojibake(raw.location) || null,
    date: raw.date ? raw.date.slice(0, 10) : null,
    url: raw.url ?? `https://remoteok.com/remote-jobs/${id}`,
    tags: Array.isArray(raw.tags) ? raw.tags.map(fixMojibake) : [],
    salary_min: salary(raw.salary_min),
    salary_max: salary(raw.salary_max),
  }
}

export function toDetail(raw: RawJob): JobDetail {
  return {
    ...toCard(raw),
    description: htmlToText(fixMojibake(raw.description)) || null,
    apply_url: raw.apply_url ?? null,
  }
}

/** Every whitespace-separated term must appear in the title, company, tags, location or description. */
export function matchesAllTerms(raw: RawJob, query: string): boolean {
  const haystack = [
    fixMojibake(raw.position),
    fixMojibake(raw.company),
    (raw.tags ?? []).join(" "),
    fixMojibake(raw.location),
    htmlToText(fixMojibake(raw.description)),
  ]
    .join(" ")
    .toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}

/** Case-insensitive substring match on the posting's location. A posting with no location never matches. */
export function locationMatches(location: string | null, wanted: string): boolean {
  return !!location && location.toLowerCase().includes(wanted.toLowerCase())
}

/** True if the posting date is within `days` of `now` (a posting with no date is kept). */
export function withinDays(date: string | null, days: number, now: Date = new Date()): boolean {
  if (!date || days >= 9999) return true
  const posted = new Date(date).getTime()
  return Number.isNaN(posted) ? true : now.getTime() - posted <= days * 86400_000
}

/** Accept a numeric id, or a remoteok.com job URL ending in the numeric id. Other hosts are rejected. */
export function normalizeId(input: string): string | null {
  const trimmed = input.trim()
  if (/^\d{4,}$/.test(trimmed)) return trimmed
  const hasScheme = /^https?:\/\//i.test(trimmed)
  if (hasScheme || /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) {
    let parsed: URL
    try {
      parsed = new URL(hasScheme ? trimmed : `https://${trimmed}`)
    } catch {
      return null
    }
    if (!SITE_HOST.test(parsed.hostname)) return null
    const m = parsed.pathname.match(/-(\d{4,})\/?$/) || parsed.pathname.match(/\/(\d{4,})\/?$/)
    return m ? m[1] : null
  }
  return null
}

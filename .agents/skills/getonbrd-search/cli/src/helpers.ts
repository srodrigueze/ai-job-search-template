// Data source: Get on Board's public JSON API (JSON:API style). No authentication.
// Search: GET /api/v0/search/jobs. The per-job endpoint (/api/v0/jobs/<id>) answers
// 401, so `detail` resolves a posting through the search endpoint instead.

export const API_BASE = "https://www.getonbrd.com/api/v0"
export const SITE_HOST = /(^|\.)getonbrd\.com$/i

const UA = "Mozilla/5.0 (compatible; getonbrd-search-cli/1.0)"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

/** Fetch JSON with exponential backoff on 429/5xx. Returns null on a 404. */
export async function jsonFetch<T = unknown>(url: string): Promise<T | null> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
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
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return (await response.json()) as T
  }
  throw new Error("Request failed after max retries")
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  remote_modality: string | null
  remote_zone: string | null
  countries: string[]
  salary_min: number | null
  salary_max: number | null
  language: string | null
  category: string | null
}

export interface JobDetail extends JobCard {
  description: string | null
}

// Raw JSON:API job object, only the fields we read.
export interface RawJob {
  id: string
  attributes: {
    title?: string
    description?: string
    description_headline?: string
    functions?: string
    functions_headline?: string
    desirable?: string
    desirable_headline?: string
    benefits?: string
    benefits_headline?: string
    remote_modality?: string | null
    remote_zone?: string | null
    countries?: string[]
    lang?: string | null
    category_name?: string | null
    min_salary?: number | null
    max_salary?: number | null
    published_at?: number | null
    company?: { data?: { attributes?: { name?: string } } }
  }
  links?: { public_url?: string }
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

/** HTML fragment to readable text: tags stripped, entities decoded, line breaks kept. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return ""
  return html
    .replace(/\s+/g, " ")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
    .split("\n")
    .map((line) => decodeHtmlEntities(line.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function toCard(raw: RawJob): JobCard {
  const a = raw.attributes ?? {}
  const countries = Array.isArray(a.countries) ? a.countries : []
  const locationParts = [countries.join(", "), a.remote_zone].filter((p): p is string => !!p)
  return {
    id: raw.id,
    title: a.title ?? "(untitled)",
    company: a.company?.data?.attributes?.name ?? null,
    location: locationParts.length ? locationParts.join(" - ") : null,
    date: typeof a.published_at === "number" ? new Date(a.published_at * 1000).toISOString().slice(0, 10) : null,
    url: raw.links?.public_url ?? `https://www.getonbrd.com/jobs/${raw.id}`,
    remote_modality: a.remote_modality ?? null,
    remote_zone: a.remote_zone ?? null,
    countries,
    salary_min: a.min_salary ?? null,
    salary_max: a.max_salary ?? null,
    language: a.lang ?? null,
    category: a.category_name ?? null,
  }
}

export function toDetail(raw: RawJob): JobDetail {
  const a = raw.attributes ?? {}
  const sections: Array<[string | undefined, string | undefined]> = [
    [a.description_headline, a.description],
    [a.functions_headline, a.functions],
    [a.desirable_headline, a.desirable],
    [a.benefits_headline, a.benefits],
  ]
  const description = sections
    .map(([headline, body]) => {
      const text = htmlToText(body)
      return text ? (headline ? `${headline}\n${text}` : text) : ""
    })
    .filter(Boolean)
    .join("\n\n")
  return { ...toCard(raw), description: description || null }
}

/** Every whitespace-separated query term must appear in the title or description (case-insensitive). */
export function matchesAllTerms(raw: RawJob, query: string): boolean {
  const a = raw.attributes ?? {}
  const haystack = [a.title, htmlToText(a.description), htmlToText(a.functions), htmlToText(a.desirable)]
    .join(" ")
    .toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}

/** Remote-mode filter: remote = fully_remote or remote_local, hybrid = hybrid, onsite = no_remote. */
export function modalityMatches(mode: string | undefined, modality: string | null): boolean {
  switch ((mode || "").toLowerCase()) {
    case "remote":
      return modality === "fully_remote" || modality === "remote_local"
    case "hybrid":
      return modality === "hybrid"
    case "onsite":
    case "on-site":
      return modality === "no_remote"
    default:
      return true
  }
}

export function isRemoteMode(mode: string | undefined): boolean {
  return ["remote", "hybrid", "onsite", "on-site"].includes((mode || "").toLowerCase())
}

/** True if the posting date is within `days` of `now` (a posting with no date is kept). */
export function withinDays(date: string | null, days: number, now: Date = new Date()): boolean {
  if (!date || days >= 9999) return true
  const posted = new Date(date).getTime()
  return Number.isNaN(posted) ? true : now.getTime() - posted <= days * 86400_000
}

/**
 * Accept a posting slug or a getonbrd.com job URL (/jobs/<slug> or /jobs/<category>/<slug>).
 * A URL on any other host is rejected.
 */
export function normalizeId(input: string): string | null {
  const trimmed = input.trim()
  const hasScheme = /^https?:\/\//i.test(trimmed)
  if (hasScheme || /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) {
    let parsed: URL
    try {
      parsed = new URL(hasScheme ? trimmed : `https://${trimmed}`)
    } catch {
      return null
    }
    if (!SITE_HOST.test(parsed.hostname)) return null
    const m = parsed.pathname.match(/^\/jobs\/(?:[a-z0-9-]+\/)?([a-z0-9-]+)\/?$/i)
    return m ? m[1] : null
  }
  return /^[a-z0-9]+(?:-[a-z0-9]+)+$/i.test(trimmed) ? trimmed : null
}

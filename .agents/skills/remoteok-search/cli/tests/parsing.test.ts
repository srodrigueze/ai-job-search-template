import { describe, expect, test } from "bun:test"
import {
  fixMojibake,
  htmlToText,
  locationMatches,
  matchesAllTerms,
  normalizeId,
  parseFeed,
  toCard,
  toDetail,
  withinDays,
  type RawJob,
} from "../src/helpers.js"

const RAW: RawJob = {
  id: "1137411",
  date: "2026-09-20T10:00:00+00:00",
  company: "OkWhen",
  position: "Senior .NET Software Engineer",
  tags: ["dotnet", "senior", "engineer"],
  description: "<p>Build APIs with C# &amp; ASP.NET.</p><ul><li>Azure</li></ul>",
  location: "LATAM",
  salary_min: "0",
  salary_max: 90000,
  url: "https://remoteOK.com/remote-jobs/remote-senior-dotnet-software-engineer-okwhen-1137411",
  apply_url: "https://remoteOK.com/remote-jobs/remote-senior-dotnet-software-engineer-okwhen-1137411",
}

describe("parseFeed", () => {
  test("drops the legal notice and keeps postings", () => {
    const feed = parseFeed([{ legal: "terms..." }, RAW])
    expect(feed).toHaveLength(1)
    expect(feed[0].id).toBe("1137411")
  })

  test("rejects a non-array response", () => {
    expect(() => parseFeed({ error: "x" })).toThrow()
  })
})

describe("fixMojibake", () => {
  test("repairs double-encoded UTF-8", () => {
    expect(fixMojibake("Sothebyâ\u0080\u0099s")).toBe("Sotheby’s")
    expect(fixMojibake("Ã¡rbol")).toBe("árbol")
  })

  test("leaves clean text and empty input alone", () => {
    expect(fixMojibake("Sotheby’s")).toBe("Sotheby’s")
    expect(fixMojibake("plain")).toBe("plain")
    expect(fixMojibake(undefined)).toBe("")
  })
})

describe("toCard / toDetail", () => {
  test("maps the contract fields, zero salary becomes null", () => {
    const c = toCard(RAW)
    expect(c.id).toBe("1137411")
    expect(c.title).toBe("Senior .NET Software Engineer")
    expect(c.company).toBe("OkWhen")
    expect(c.location).toBe("LATAM")
    expect(c.date).toBe("2026-09-20")
    expect(c.url).toContain("remoteOK.com")
    expect(c.salary_min).toBeNull()
    expect(c.salary_max).toBe(90000)
  })

  test("missing values are null, not omitted", () => {
    const c = toCard({ id: 1234, position: "x" })
    expect(c.company).toBeNull()
    expect(c.location).toBeNull()
    expect(c.date).toBeNull()
  })

  test("detail has a readable description", () => {
    const d = toDetail(RAW)
    expect(d.description).toContain("C# & ASP.NET")
    expect(d.description).toContain("- Azure")
    expect(d.description).not.toContain("<")
  })
})

describe("filters", () => {
  test("matchesAllTerms checks title, tags and description", () => {
    expect(matchesAllTerms(RAW, ".net azure")).toBe(true)
    expect(matchesAllTerms(RAW, ".net kubernetes")).toBe(false)
  })

  test("locationMatches ignores empty locations", () => {
    expect(locationMatches("LATAM", "latam")).toBe(true)
    expect(locationMatches(null, "latam")).toBe(false)
  })

  test("withinDays keeps undated postings", () => {
    const now = new Date("2026-10-19T00:00:00Z")
    expect(withinDays("2026-10-10", 14, now)).toBe(true)
    expect(withinDays("2026-09-01", 14, now)).toBe(false)
    expect(withinDays(null, 14, now)).toBe(true)
  })
})

describe("htmlToText", () => {
  test("empty input gives empty text", () => {
    expect(htmlToText(undefined)).toBe("")
  })
})

describe("normalizeId", () => {
  test("accepts ids and remoteok URLs, rejects other hosts", () => {
    expect(normalizeId("1137411")).toBe("1137411")
    expect(normalizeId("https://remoteOK.com/remote-jobs/remote-x-y-1137411")).toBe("1137411")
    expect(normalizeId("https://remoteok.com.evil.io/remote-jobs/x-1137411")).toBeNull()
    expect(normalizeId("https://evil.com/x-1137411")).toBeNull()
    expect(normalizeId("abc")).toBeNull()
  })
})

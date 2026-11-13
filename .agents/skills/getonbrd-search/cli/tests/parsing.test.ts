import { describe, expect, test } from "bun:test"
import {
  htmlToText,
  matchesAllTerms,
  modalityMatches,
  normalizeId,
  toCard,
  toDetail,
  withinDays,
  type RawJob,
} from "../src/helpers.js"

const RAW: RawJob = {
  id: "full-stack-net-developer-acme-remote",
  attributes: {
    title: "Full-Stack .NET Developer",
    description_headline: "Requisitos",
    description: "<p>Se requiere:</p><ul><li>C# &amp; ASP.NET</li><li>Angular</li></ul>",
    benefits_headline: "Condiciones",
    benefits: "<div>Seguro m&eacute;dico</div>",
    remote_modality: "remote_local",
    remote_zone: null,
    countries: ["Colombia"],
    lang: "es",
    category_name: "Programming",
    min_salary: 2000,
    max_salary: 3000,
    published_at: 1792443768,
    company: { data: { attributes: { name: "Acme" } } },
  },
  links: { public_url: "https://www.getonbrd.com/jobs/programming/full-stack-net-developer-acme-remote" },
}

describe("toCard", () => {
  test("maps the contract fields and never omits them", () => {
    const c = toCard(RAW)
    expect(c.id).toBe(RAW.id)
    expect(c.title).toBe("Full-Stack .NET Developer")
    expect(c.company).toBe("Acme")
    expect(c.location).toBe("Colombia")
    expect(c.date).toBe("2026-10-19")
    expect(c.url).toContain("getonbrd.com/jobs/")
  })

  test("missing values are null, not omitted", () => {
    const c = toCard({ id: "x-y", attributes: {} })
    expect(c.company).toBeNull()
    expect(c.location).toBeNull()
    expect(c.date).toBeNull()
    expect(c.salary_min).toBeNull()
  })
})

describe("toDetail / htmlToText", () => {
  test("builds a readable description with headlines and list bullets", () => {
    const d = toDetail(RAW).description!
    expect(d).toContain("Requisitos")
    expect(d).toContain("- C# & ASP.NET")
    expect(d).not.toContain("<")
  })

  test("empty input gives empty text", () => {
    expect(htmlToText(null)).toBe("")
  })
})

describe("matchesAllTerms", () => {
  test("requires every term in title or description", () => {
    expect(matchesAllTerms(RAW, ".NET Angular")).toBe(true)
    expect(matchesAllTerms(RAW, ".NET Kubernetes")).toBe(false)
  })
})

describe("modalityMatches", () => {
  test("remote covers fully_remote and remote_local", () => {
    expect(modalityMatches("remote", "fully_remote")).toBe(true)
    expect(modalityMatches("remote", "remote_local")).toBe(true)
    expect(modalityMatches("remote", "hybrid")).toBe(false)
    expect(modalityMatches("onsite", "no_remote")).toBe(true)
    expect(modalityMatches(undefined, "hybrid")).toBe(true)
  })
})

describe("withinDays", () => {
  const now = new Date("2026-10-19T00:00:00Z")
  test("filters by age and keeps undated postings", () => {
    expect(withinDays("2026-10-10", 14, now)).toBe(true)
    expect(withinDays("2026-09-01", 14, now)).toBe(false)
    expect(withinDays(null, 14, now)).toBe(true)
  })
})

describe("normalizeId", () => {
  test("accepts slugs and getonbrd URLs, rejects other hosts", () => {
    expect(normalizeId("full-stack-net-developer-acme-remote")).toBe("full-stack-net-developer-acme-remote")
    expect(normalizeId("https://www.getonbrd.com/jobs/programming/full-stack-net-developer-acme-remote")).toBe(
      "full-stack-net-developer-acme-remote",
    )
    expect(normalizeId("https://www.getonbrd.com/jobs/full-stack-net-developer-acme-remote")).toBe(
      "full-stack-net-developer-acme-remote",
    )
    expect(normalizeId("https://getonbrd.com.evil.io/jobs/a-b-c")).toBeNull()
    expect(normalizeId("https://evil.com/jobs/a-b-c")).toBeNull()
    expect(normalizeId("notaslug")).toBeNull()
  })
})

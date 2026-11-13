import { describe, expect, test } from "bun:test"
import { parseJSON, runCLI } from "./helpers.js"

interface SearchOut {
  meta: { count: number; page: number; source: string }
  results: Array<{ id: string; title: string; url: string; company: string | null; location: string | null; date: string | null }>
}

describe("argument validation (offline)", () => {
  test("an unknown flag exits 1 with a JSON error on stderr", async () => {
    const r = await runCLI(["search", "-q", "x", "--bogus", "y"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("UNKNOWN_FLAG")
    expect(r.stdout).toBe("")
  })

  test("detail without an id exits 1", async () => {
    const r = await runCLI(["detail"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("NO_ID")
  })

  test("bad --jobage and --format are rejected", async () => {
    for (const args of [["--jobage", "0"], ["--format", "xml"], ["--query", ""]]) {
      const r = await runCLI(["search", ...args])
      expect(r.exitCode).toBe(1)
      expect(JSON.parse(r.stderr).code).toBe("BAD_ARG")
    }
  })

  test("detail rejects a URL on another host", async () => {
    const r = await runCLI(["detail", "https://evil.com/x-1137411"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ID")
  })
})

describe("live smoke test", () => {
  test("search returns real postings with the contract fields and the source", async () => {
    const out = parseJSON<SearchOut>(await runCLI(["search", "--limit", "5"]))
    expect(out.results.length).toBeGreaterThanOrEqual(1)
    expect(out.meta.source).toContain("remoteok.com")
    for (const job of out.results) {
      expect(job.id).toBeTruthy()
      expect(job.title).toBeTruthy()
      expect(job.url.toLowerCase()).toContain("remoteok.com")
      expect(job).toHaveProperty("company")
      expect(job).toHaveProperty("location")
      expect(job).toHaveProperty("date")
    }
  })

  test("page 2 is empty because the feed is a single page", async () => {
    const out = parseJSON<SearchOut>(await runCLI(["search", "--page", "2"]))
    expect(out.results).toHaveLength(0)
  })

  test("detail resolves an id returned by search", async () => {
    const out = parseJSON<SearchOut>(await runCLI(["search", "--limit", "1"]))
    const detail = parseJSON<{ id: string }>(await runCLI(["detail", out.results[0].id]))
    expect(detail.id).toBe(out.results[0].id)
  })
})

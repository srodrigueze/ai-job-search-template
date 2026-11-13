import { describe, expect, test } from "bun:test"
import { parseJSON, runCLI } from "./helpers.js"

interface SearchOut {
  meta: { count: number; page: number }
  results: Array<{ id: string; title: string; url: string; company: string | null; location: string | null; date: string | null }>
}

describe("argument validation (offline)", () => {
  test("an unknown flag exits 1 with a JSON error on stderr", async () => {
    const r = await runCLI(["search", "-q", ".NET", "--bogus", "x"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("UNKNOWN_FLAG")
    expect(r.stdout).toBe("")
  })

  test("detail without an id exits 1", async () => {
    const r = await runCLI(["detail"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("NO_ID")
  })

  test("bad --country, --remote and --jobage are rejected", async () => {
    for (const args of [["--country", "COL"], ["--remote", "sometimes"], ["--jobage", "0"]]) {
      const r = await runCLI(["search", "-q", "x", ...args])
      expect(r.exitCode).toBe(1)
      expect(JSON.parse(r.stderr).code).toBe("BAD_ARG")
    }
  })

  test("--strict without a query is rejected", async () => {
    const r = await runCLI(["search", "--strict"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ARG")
  })

  test("detail rejects a URL on another host", async () => {
    const r = await runCLI(["detail", "https://evil.com/jobs/a-b-c"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ID")
  })
})

describe("live smoke test", () => {
  test("search returns real postings with the contract fields", async () => {
    const out = parseJSON<SearchOut>(await runCLI(["search", "-q", "developer", "--limit", "5"]))
    expect(out.results.length).toBeGreaterThanOrEqual(1)
    for (const job of out.results) {
      expect(job.id).toBeTruthy()
      expect(job.title).toBeTruthy()
      expect(job.url).toContain("getonbrd.com")
      expect(job).toHaveProperty("company")
      expect(job).toHaveProperty("location")
      expect(job).toHaveProperty("date")
    }
  })

  test("detail resolves a slug returned by search", async () => {
    const out = parseJSON<SearchOut>(await runCLI(["search", "-q", "developer", "--limit", "1"]))
    const detail = parseJSON<{ id: string; description: string | null }>(await runCLI(["detail", out.results[0].id]))
    expect(detail.id).toBe(out.results[0].id)
    expect(detail.description).toBeTruthy()
  })
})

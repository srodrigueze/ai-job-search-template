#!/usr/bin/env bun
// Self-contained CLI for searching Get on Board (getonbrd.com) tech jobs through
// its public JSON API. Zero runtime dependencies: runs anywhere `bun` is available.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import { isRemoteMode } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", c: "country", n: "limit" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("--") || a.startsWith("-")) {
      const key = alias[a.replace(/^-+/, "")] ?? a.replace(/^-+/, "")
      const next = argv[i + 1]
      if (next === undefined || next.startsWith("-")) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      ;(flags._ as string[]).push(a)
    }
  }
  return flags
}

const HELP = `getonbrd-cli - search Get on Board (getonbrd.com) tech jobs, LATAM-focused

USAGE
  bun run src/cli.ts search [flags]
  bun run src/cli.ts detail <slug|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>    Keywords. The server match is fuzzy; add --strict to keep only
                        postings whose title/description contain every term.
  --country, -c <code>  ISO 3166-1 alpha-2 country code (e.g. CO, MX, CL, AR).
  --remote <mode>       remote | hybrid | onsite (client-side filter on remote_modality;
                        "remote" = fully_remote + remote_local).
  --jobage <days>       Posted within N days (client-side filter).
  --strict              Require every query term in the title or description.
  --page <n>            1-indexed page (50 results/page). Default 1.
  --limit, -n <n>       Cap results emitted (client-side).
  --format <fmt>        json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q ".NET" -c CO --strict --format table
  bun run src/cli.ts search -q "C#" --remote remote --jobage 14 --strict --format table
  bun run src/cli.ts search -q "Angular" -c CO --remote hybrid --format table
  bun run src/cli.ts detail senior-qa-automation-engineer-net-c-improving-remote --format plain
`

const KNOWN_FLAGS: Record<string, Set<string>> = {
  search: new Set(["query", "country", "remote", "jobage", "strict", "page", "limit", "format", "help", "h"]),
  detail: new Set(["format", "help", "h"]),
}

function fail(error: string, code: string): number {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
  return 1
}

async function main(): Promise<number> {
  const flags = parseFlags(process.argv.slice(2))
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  const knownFlags = KNOWN_FLAGS[cmd]
  if (knownFlags) {
    for (const key of Object.keys(flags)) {
      if (key === "_" || knownFlags.has(key)) continue
      return fail(
        `unknown flag --${key} for '${cmd}' - flags are never silently ignored, because a discarded filter changes what the search returns; see --help`,
        "UNKNOWN_FLAG",
      )
    }
  }

  if (cmd === "search") {
    if (flags.query !== undefined && (typeof flags.query !== "string" || !flags.query.trim())) {
      return fail("--query requires a non-empty value", "BAD_ARG")
    }
    if (flags.country !== undefined && (typeof flags.country !== "string" || !/^[A-Za-z]{2}$/.test(flags.country))) {
      return fail("--country must be a two-letter ISO country code such as CO", "BAD_ARG")
    }
    if (flags.remote !== undefined && (typeof flags.remote !== "string" || !isRemoteMode(flags.remote))) {
      return fail("--remote must be one of remote|hybrid|onsite", "BAD_ARG")
    }
    if (typeof flags.strict === "string") {
      return fail("--strict takes no value (put it after the other flags or use --strict alone)", "BAD_ARG")
    }
    if (flags.strict && flags.query === undefined) {
      return fail("--strict needs a --query to match against", "BAD_ARG")
    }
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) {
      return fail(`--format must be one of json|table|plain, got "${fmt}"`, "BAD_ARG")
    }
    const intFlag = (name: string): number | null | undefined => {
      if (flags[name] === undefined) return undefined
      const raw = flags[name]
      const val = typeof raw === "string" ? Number(raw.trim()) : NaN
      if (!Number.isInteger(val) || val < 1) {
        fail(`--${name} must be a whole number of at least 1, got "${raw}"`, "BAD_ARG")
        return null
      }
      return val
    }
    const jobage = intFlag("jobage")
    const page = intFlag("page")
    const limit = intFlag("limit")
    if (jobage === null || page === null || limit === null) return 1

    const opts: SearchOpts = {
      query: typeof flags.query === "string" ? flags.query : undefined,
      country: typeof flags.country === "string" ? flags.country : undefined,
      remote: typeof flags.remote === "string" ? flags.remote : undefined,
      jobage: jobage ?? 9999,
      strict: flags.strict === true,
      page: page ?? 1,
      limit: limit ?? undefined,
      format: fmt as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const id = (flags._ as string[])[1]
    if (!id) return fail("detail requires a <slug|url>", "NO_ID")
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "plain"].includes(fmt)) {
      return fail(`--format must be one of json|plain, got "${fmt}"`, "BAD_ARG")
    }
    const opts: DetailOpts = { id, format: fmt as DetailOpts["format"] }
    return runDetail(opts)
  }

  return fail(`Unknown command "${cmd}"`, "BAD_CMD")
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    process.stderr.write(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e), code: "INTERNAL_ERROR" }) + "\n",
    )
    process.exit(1)
  })

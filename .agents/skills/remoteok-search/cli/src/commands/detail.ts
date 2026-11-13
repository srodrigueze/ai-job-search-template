import { SOURCE, fetchFeed, normalizeId, toDetail, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse a Remote OK posting id from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    // The feed holds only the most recent postings and has no per-job endpoint.
    const raw = (await fetchFeed()).find((j) => String(j.id) === id)
    if (!raw) {
      writeError("Job not found in the current feed (older postings are not available through the API)", "NOT_FOUND")
      return 1
    }
    const job = toDetail(raw)

    if (opts.format === "plain") {
      const pay = job.salary_min || job.salary_max ? `Salary: ${job.salary_min ?? "?"} - ${job.salary_max ?? "?"}` : ""
      const lines = [
        job.title,
        `${job.company || "-"} · ${job.location || "-"}`,
        job.tags.length ? `Tags: ${job.tags.join(", ")}` : "",
        pay,
        "",
        job.description || "(no description)",
        "",
        `URL: ${job.url}`,
        `Source: ${SOURCE}`,
      ].filter((l, i) => l !== "" || i >= 4)
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify({ ...job, source: SOURCE }, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}

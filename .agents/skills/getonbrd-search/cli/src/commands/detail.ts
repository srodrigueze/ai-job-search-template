import { API_BASE, jsonFetch, normalizeId, toDetail, writeError, type RawJob } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse a Get on Board posting slug from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    // /api/v0/jobs/<id> answers 401, so look the posting up through the search
    // endpoint. The search needs every word to occur in the posting's text, and a
    // slug also carries the company and a "remote"/city suffix that may not, so
    // retry with progressively fewer trailing words until the exact id turns up.
    const words = id.split("-")
    let raw: RawJob | undefined
    for (let n = words.length, attempts = 0; n >= 2 && attempts < 6 && !raw; n--, attempts++) {
      const params = new URLSearchParams({
        query: words.slice(0, n).join(" "),
        per_page: "50",
        expand: '["company"]',
      })
      const body = await jsonFetch<{ data: RawJob[] }>(`${API_BASE}/search/jobs?${params.toString()}`)
      raw = body?.data?.find((j) => j.id === id)
    }
    if (!raw) {
      writeError("Job not found (it may be closed or the slug may be wrong)", "NOT_FOUND")
      return 1
    }
    const job = toDetail(raw)

    if (opts.format === "plain") {
      const salary =
        job.salary_min || job.salary_max ? `Salary (as published, currency per posting): ${job.salary_min ?? "?"} - ${job.salary_max ?? "?"}` : ""
      const lines = [
        job.title,
        `${job.company || "-"} · ${job.location || "-"} · ${job.remote_modality || "-"}`,
        job.category ? `Category: ${job.category}` : "",
        salary,
        "",
        job.description || "(no description)",
        "",
        `URL: ${job.url}`,
      ].filter((l, i) => l !== "" || i === 3 || i > 3)
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}

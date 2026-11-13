<p align="center">
  <img src="assets/mascot/pip_flight_loop.gif" alt="Pip, the courier bird" width="200">
</p>

# AI Job Search Template

*A job-search assistant that runs on your machine, powered by [Claude Code](https://claude.com/claude-code).*

A ready-to-configure set of Claude Code skills and commands that helps you **find** job postings, **rank** them against your profile, **tailor** a CV and cover letter (LaTeX) for each one, and **prepare** for interviews. This repository is a clean template: it ships **no personal data**, only blank profile files you fill in with `/setup`.

> This is an independent open-source project and is not affiliated with, endorsed by, or maintained by Anthropic. Claude Code is referenced only to describe the toolchain.
>
> **Original project:** this repository is a derivative work of **[MadsLorentzen/ai-job-search](https://github.com/MadsLorentzen/ai-job-search)** by Mads Lorentzen, released under the MIT License. The framework design, commands, skills, agents, tooling and the `linkedin-search` / `freehire-search` portal CLIs come from that project. Please star and support the original. Details of what was kept and what changed are in [License & attribution](#license--attribution) and [NOTICE.md](NOTICE.md).

---

## Table of contents

- [What you get](#what-you-get)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [How to use the skill](#how-to-use-the-skill)
- [Included job portals](#included-job-portals)
- [Customization](#customization)
- [Repository structure](#repository-structure)
- [Privacy: keep your data out of git](#privacy-keep-your-data-out-of-git)
- [Troubleshooting](#troubleshooting)
- [License & attribution](#license--attribution)

---

## What you get

| Command | What it does |
|---|---|
| `/setup` | Onboarding: builds your profile from your CV/LinkedIn export (`documents/`), a pasted CV, or a short interview. |
| `/scrape` | Searches every enabled job portal for postings matching your profile and de-duplicates across runs. |
| `/rank` | Batch-scores scraped postings against your fit framework and returns a ranked shortlist (deal-breakers veto, deadlines flagged). |
| `/apply <url>` | Full application workflow: evaluate fit → draft CV + cover letter (LaTeX) → second-agent review → revise → compile PDFs. |
| `/interview` | Builds a stage-specific interview prep pack for a tracked application and offers a mock interview. |
| `/outcome` | Records what happened (interview, offer, rejection, silence), archives the submitted documents, drafts follow-ups. |
| `/upskill` | Compares your profile with tracked/ranked postings and produces a prioritized skill-gap learning plan. |
| `/expand` | Enriches your profile from public sources you link (GitHub, portfolio, courses). |
| `/html-report` | Generates an offline HTML dashboard of your application pipeline. |
| `/gmail-sync` | Proposes application status updates from Gmail (you approve before anything is written). |
| `/notion-sync` | One-way, read-only view of your pipeline in a Notion database. |
| `/add-portal` | Generates a search skill for a job board in your market. |
| `/add-template` | Registers your own CV / cover-letter template (LaTeX, Typst, ...). |
| `/reset` | Wipes your profile and/or `documents/` to start over (asks you to type `RESET`). |

```
/setup            /scrape  ->  /rank            /apply <url>
  |                  |            |                  |
  v                  v            v                  v
Fill in your     Search the    Ranked           Evaluate fit
profile          job portals   shortlist        Draft CV + cover letter
                                                Reviewer agent critiques
                                                Revise -> compiled PDFs
```

## Prerequisites

- **[Claude Code](https://claude.com/claude-code)** (CLI). Requires a Claude subscription (Pro/Max/Team) or Anthropic API credits.
- **Python 3.10+**
- **[Bun](https://bun.sh)** to run the job-portal CLIs.
- **A LaTeX distribution** with `lualatex` and `xelatex` ([TeX Live](https://tug.org/texlive/), [MacTeX](https://tug.org/mactex/), [TinyTeX](https://yihui.org/tinytex/) or [MiKTeX](https://miktex.org/)). The CV compiles with `lualatex`; the cover letter with `xelatex`. For minimal installs (TinyTeX/BasicTeX) see [SETUP.md](SETUP.md#minimal-tex-install-tinytexbasictex).
- *Optional:* `pip install pypdf` (or Poppler `pdftotext`) so `/apply` can check that your CV's text layer is ATS-parseable.

## Quick start

### 1. Fork and clone as a private copy

`/setup` writes personal data (name, contact details, employment history, salary expectations) into tracked files. Do **not** work in a public repository with that data: a fork of a public repo is always public, so use a private copy instead.

On GitHub click **Use this template → Create a new repository → Private** (enable "Template repository" in this repo's settings first if you are the owner), then:

```bash
git clone https://github.com/<your-user>/<your-private-repo>.git
cd <your-private-repo>
```

To keep pulling improvements from the public template into your private copy, follow [SETUP.md section 8](SETUP.md#8-pulling-upstream-updates-into-your-fork).

### 2. Install the portal CLIs

```bash
python3 tools/install_portal_clis.py     # Windows: python tools\install_portal_clis.py
```

This runs `bun install` in every `.agents/skills/*/cli/` folder (use `--dry-run` to preview). The shipped portals have zero runtime dependencies, so this only pulls TypeScript dev types.

### 3. Set up your profile

```bash
claude
```

Then, inside Claude Code:

```
/setup
```

`/setup` auto-detects what you have and offers three paths:

1. **Documents folder** – drop your CV (PDF or `.tex`), LinkedIn export, diplomas, reference letters and past applications under `documents/` (see [`documents/README.md`](documents/README.md)); it reads them all. Safe to re-run as you add material.
2. **Paste your CV** into the chat.
3. **Interview** – answer a short questionnaire.

It fills in `CLAUDE.md`, the profile files under `.claude/skills/job-application-assistant/` (`01`–`07`), the CV template (`cv/main_example.tex`) and your search queries, including which portals to enable.

### 4. Find and rank jobs

```
/scrape
/rank
```

`/scrape` runs every enabled portal (see [Included job portals](#included-job-portals)), removes duplicates seen in earlier runs and shows matches with fit ratings. `/rank` then scores them all against your deal-breakers and preferences and hands the one you pick to `/apply`.

### 5. Apply

```
/apply https://www.linkedin.com/jobs/view/1234567890
```

If a site blocks automated fetching, paste the posting text instead:

```
/apply <paste the full job description here>
```

The workflow first runs an integrity gate on the posting (hidden text, injected instructions), evaluates your fit and shows you the assessment, then drafts `cv/main_<company>_<role>.tex` and `cover_letters/cover_<company>_<role>.tex`, has a separate reviewer agent critique them against the posting and your profile, revises, **compiles both PDFs** and verifies page counts and ATS text extraction. Always read the output before you send it.

### 6. Track and prepare

```
/outcome        # record interviews, offers, rejections; archive what you submitted
/interview      # stage-specific prep pack + mock interview for a tracked application
/upskill        # skill-gap analysis and learning plan
/html-report    # offline dashboard of your pipeline
```

## How to use the skill

**Day-to-day loop**

1. `/scrape` (daily or weekly) → `/rank` → pick the best postings.
2. `/apply <url>` for each one you want. Review the fit assessment first; skip weak matches.
3. After applying, `/outcome` to log it. Later, `/outcome followup` surfaces applications that went quiet and drafts a short follow-up (drafts only, never sends).
4. When an interview is scheduled, run `/interview <company>`.

**Tips**

- **Profile depth matters.** The more concrete your achievements (numbers, scale, results), the better CVs and fit scores get. Run `/expand` after `/setup` to surface skills your documents don't state explicitly.
- **Be strict about deal-breakers** (minimum salary, location/work authorization, language, benefits) in your profile. They are free-form lines and `/rank` / `/apply` honour them.
- **Re-tune your search** without redoing your profile: `/setup --section search`.
- **Claims are checked.** The workflow only uses facts from your profile; if a posting needs something you don't have, the gap is shown, not invented.
- **Postings are untrusted input.** The workflow follows no instructions embedded in postings, but it is not a sandbox: on unfamiliar sites, skim what was fetched and written before sending. See [SECURITY.md](SECURITY.md).

## Included job portals

All four are enabled by default. Each lives in `.agents/skills/<name>/` with a `SKILL.md`, a Bun CLI (`search` / `detail`) and tests. `/scrape` auto-discovers any portal skill in that folder.

| Portal skill | Source | Best for | Notes |
|---|---|---|---|
| `linkedin-search` | LinkedIn public `jobs-guest` pages | Any country / field | Pass the location with `-l "City, Country"`. Personal use only, keep volume low (automated access is against LinkedIn's ToS). |
| `freehire-search` | [freehire.me](https://freehire.me) REST API | Tech roles, multi-market | Facets: `--region`, `--country`, `--remote`. |
| `getonbrd-search` | [Get on Board](https://www.getonbrd.com) public API | Tech jobs in Latin America / Spanish-speaking markets | `--country CO\|MX\|CL\|AR\|PE`, `--remote`, `--strict`, `--jobage`. |
| `remoteok-search` | [Remote OK](https://remoteok.com) JSON feed | Remote jobs worldwide | Filters run client-side over the latest ~100 postings; keep queries broad. Attribution to Remote OK is required if you republish its data. |

Run a portal manually, for example:

```bash
bun run .agents/skills/getonbrd-search/cli/src/cli.ts search -q "backend" -c CO --remote remote --jobage 14 --format table
bun run .agents/skills/remoteok-search/cli/src/cli.ts search -q "python" --jobage 7 --format table
bun run .agents/skills/linkedin-search/cli/src/cli.ts search -q "software engineer" -l "Madrid, Spain" --format table
```

**Disable a portal:** set `enabled: false` in the `SKILL.md` frontmatter of that portal.

**Add a portal for your market:** run `/add-portal` and give it the job board URL. It investigates the site, scaffolds a CLI skill with the same contract, test-runs a live query and registers it. Auth-walled portals are declined. A new portal also needs its `Bash(bun run .agents/skills/<name>/cli/src/cli.ts:*)` line added to both `.claude/settings.json` and `ALLOWED_PERMISSIONS` in `tools/security_guards.py`.

## Customization

**Files you can edit by hand** (instead of `/setup`):

| File | What to change |
|---|---|
| `CLAUDE.md` | Your profile summary, goals, deal-breakers |
| `.claude/skills/job-application-assistant/01-candidate-profile.md` | Structured CV data |
| `.../02-behavioral-profile.md` | Self-assessment / personality |
| `.../03-writing-style.md` | Tone and writing rules |
| `.../04-job-evaluation.md` | Fit-scoring framework and career goals |
| `.../05-cv-templates.md` | CV structure and profile-statement templates |
| `.../06-cover-letter-templates.md` | Cover-letter templates |
| `.../07-interview-prep.md` | Your STAR examples |
| `.claude/skills/job-scraper/search-queries.md` | Search queries, target companies, locations, languages |

**Custom CV / cover-letter template:** run `/add-template` (LaTeX, Typst or any CLI toolchain). Switch with `/add-template --use <name>` or go back with `/add-template --use default`. The stock templates are moderncv (CV, `lualatex`) and `cover.cls` (cover letter, `xelatex`).

**Salary benchmarking** is optional and works with any data you provide; see [`tools/README_SALARY_TOOL.md`](tools/README_SALARY_TOOL.md).

**Starting over:**

```
/reset profile      # clear profile files, keep framework rules
/reset documents    # delete files in documents/
/reset all
```

`/reset` lists what will be deleted and requires you to type `RESET`.

## Repository structure

```
.
├── CLAUDE.md                     # Your profile + workflow rules (filled by /setup)
├── .claude/
│   ├── commands/                 # /setup /apply /rank /outcome /interview /expand ...
│   ├── agents/                   # posting-fetcher, posting-scorer, application-reviewer
│   ├── skills/
│   │   ├── job-application-assistant/   # core skill + profile files 01-07
│   │   ├── job-scraper/                 # /scrape orchestration + search-queries.md
│   │   └── upskill/                     # /upskill
│   └── settings.json             # scoped permissions
├── .agents/skills/               # portal CLIs: linkedin, freehire, getonbrd, remoteok
├── cv/main_example.tex           # moderncv CV template
├── cover_letters/                # cover.cls, example letter, fonts
├── templates/                    # custom templates (/add-template)
├── documents/                    # your source material for /setup (gitignored)
├── job_scraper/ company_research/ upskill/   # local state and reports (gitignored)
├── tools/                        # PDF verification, posting guard, install script, CI guards
├── tests/                        # Python test-suite (unittest)
├── SETUP.md                      # Detailed setup guide
└── SECURITY.md
```

## Privacy: keep your data out of git

The `.gitignore` already excludes generated CVs/letters (`cv/main_*`, `cover_letters/cover_*`), PDFs, `documents/**`, the tracker (`job_search_tracker.csv`), `job_scraper/seen_jobs.json`, `.env*` and other local state. Still:

- Keep your working copy **private**. `/setup` edits `CLAUDE.md`, the `01`–`07` profile files, `search-queries.md` and `cv/main_example.tex` **in place**, and those are tracked files.
- Never commit your CV, tracker or application archives to a public repository.
- To publish improvements to the template, do it from a clean checkout of the public template, not from your personal copy.

## Troubleshooting

- **`bun: command not found`** – install [Bun](https://bun.sh) and restart your terminal.
- **LaTeX font / fontawesome errors** – compile the CV with `lualatex` (not `pdflatex`) and the cover letter with `xelatex`; install missing packages per [SETUP.md](SETUP.md).
- **A site can't be fetched** – paste the posting text into `/apply`.
- **A portal returns nothing** – check its `SKILL.md` limits (e.g. Remote OK only exposes the latest ~100 postings) and try broader keywords.
- **Permission prompts for a new portal** – add its `bun run` line to `.claude/settings.json` and `tools/security_guards.py` (see above).

Run the checks:

```bash
python3 -m unittest discover -s tests -t .
python3 tools/security_guards.py
```

## License & attribution

This project is licensed under the **MIT License** (see [LICENSE](LICENSE)).

**It is a derivative work of [MadsLorentzen/ai-job-search](https://github.com/MadsLorentzen/ai-job-search)**, Copyright (c) 2026 Mads Lorentzen, used under the MIT License. The original copyright and permission notice is retained in [LICENSE](LICENSE), as the license requires. This repository is not affiliated with or endorsed by the original author.

What this derivative changes (everything else is unmodified original work):

- Added the `getonbrd-search` (Get on Board) and `remoteok-search` (Remote OK) portal skills, enabled by default, and their permission entries.
- Removed the four Danish demo portals (Jobindex, Jobnet, Jobbank, Jobdanmark) and adjusted docs and tests that referenced them.
- Removed the author-specific funding file, donation prompt and issue-template links; replaced `README.md` and `CHANGELOG.md`.
- Left the profile files (`CLAUDE.md`, `01`–`07`, `search-queries.md`, `cv/main_example.tex`) as blank placeholders.

The original repository's full history, issue tracker and release notes live at <https://github.com/MadsLorentzen/ai-job-search>. Third-party data sources (LinkedIn, freehire.me, Get on Board, Remote OK) have their own terms of use; see each portal's `SKILL.md`. See also [NOTICE.md](NOTICE.md).

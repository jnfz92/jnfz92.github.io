---
name: supabase-source-of-truth
description: Use this skill whenever changing, importing, restoring, displaying, or troubleshooting website data that belongs in Supabase. Enforces Supabase-first data workflows, preserves existing UI behavior, verifies database writes and frontend reads, and prevents local-file workarounds from being mistaken for database integration.
---

# Supabase as the Source of Truth

## Purpose

Use Supabase as the authoritative source for website data whenever the project is designed to store or serve that data from Supabase.

This skill applies when importing content (SRT subtitles, CSV/JSON records, articles, catalogs, translations, learning material), restoring missing data, fixing a page that does not display database content, or changing the frontend's data source.

**A file committed to GitHub, a local asset, a hard-coded array, or browser storage is not a substitute for the requested Supabase data operation.**

## Non-negotiable rules

1. **Inspect before changing.** Identify the Supabase project, schema, table, columns, constraints, indexes, RLS policies, and existing frontend query before writing.
2. **Supabase first for data.** When the user asks to add, restore, import, or fix database-backed content, perform the actual operation in Supabase. Do not merely add or restore a GitHub file.
3. **Source files are inputs, not substitutes.** An SRT/CSV/JSON/HTML file may be read or recovered to parse its contents, but parsed records must be inserted or updated in the intended Supabase table unless the user explicitly requests file-based hosting.
4. **Avoid duplicate or destructive writes.** Check existing rows and unique keys first. Use stable natural keys and idempotent upserts where practical. Never truncate, delete, overwrite, or alter unrelated records without explicit authorization.
5. **Preserve existing product behavior.** Do not redesign a page, add panels/statistics/rankings, change defaults, auto-select an item, or add unrelated features unless explicitly requested.
6. **Connect the frontend to Supabase.** Ensure the page reads the records from the correct Supabase table/API/RPC. Remove conflicting duplicate local loading paths when appropriate.
7. **Respect security.** Never expose service-role keys or secrets in frontend code, commits, logs, or responses. Follow the established public client/API pattern. Verify RLS and grants; do not weaken policies broadly to make a page work.
8. **Verify both sides.** Verify the database write with a direct query, then verify the frontend code actually queries and renders those records. Verify the deployed page separately when possible.
9. **Report facts, not assumptions.** Distinguish database write verified, repository changes committed, deployment completed, and live page behavior verified. A commit does not prove deployment; an SQL insert does not prove the page displays the data.
10. **Keep scope narrow.** Change only what is necessary. Do not silently modify unrelated content, tables, layouts, or features.

## Required workflow

### 1. Establish the source of truth
- Read the project instructions and inspect the current implementation.
- Identify the Supabase project and exact table/view/RPC that owns the data.
- Confirm whether the user expects Supabase-backed data or explicitly requests static/file-based content.
- If the project or target table cannot be established, ask one focused question rather than guessing.

### 2. Inspect the database before importing
Inspect table and column names/types, primary and unique constraints, existing row counts and matching records, relevant RLS policies and grants, defaults, triggers, and required fields.

Do not assume an ID is generated automatically. Check whether it has an identity/sequence/default. Do not invent schema fields or table names.

### 3. Parse and validate the source
When content comes from a file:
- Read the actual source file, not just its filename or a previous summary.
- Parse it using the correct format.
- Validate record counts, required fields, encoding, and duplicates.
- Preserve original wording, sequence numbers, timestamps, and ordering unless asked to transform them.
- Do not fabricate translations, grammar labels, notes, metadata, or missing records.
- Maintain a clear mapping from source fields to database columns.

For SRT imports, retain subtitle number, timecode, and text; validate parsed block counts and empty phrases; preserve gaps in numbering; store records in the designated Supabase table.

### 4. Plan a safe database write
- Determine whether the operation is insert, update, upsert, or restoration.
- Check existing rows by the natural/unique key (for example, `(movie_slug, subtitle_number)`).
- Calculate expected insert/update counts.
- Use batches when appropriate and make retries safe.
- Do not delete or replace existing records unless explicitly requested and scope is clear.

After writing, run a verification query reporting matching row count, first/last sequence or relevant range, empty/invalid required values, and duplicate natural keys where relevant. Compare actual and expected results; investigate mismatches before claiming completion.

### 5. Wire the frontend to Supabase
- Follow existing Supabase client, REST, RPC, pagination, and error-handling conventions.
- Query the actual target table/view/RPC.
- Ensure pagination retrieves all relevant rows; do not silently stop at the first page or truncate the dataset.
- Build selectors/catalogs from database results when that is the existing design.
- Ensure detail/content queries use the same stable key as the database records.
- Remove stale local fetches or hard-coded fallback data only when they conflict with the requested Supabase-backed behavior.
- Do not make a local SRT/JSON file the runtime source when the requested behavior is to load from Supabase.
- Preserve the existing UI and interaction flow.
- Do not auto-select a movie/item or change defaults unless requested.

### 6. Verify repository and deployment separately
- Inspect exact files before editing; make the smallest necessary change.
- Preserve existing functionality and naming conventions.
- Commit with a clear message.
- Verify committed file contents and relevant cache-busting/version references.
- If deployment verification is available, open the actual deployed URL and confirm the data and interaction work.
- If the live deployment cannot be checked, say so plainly. Never infer live success from a GitHub commit.

## Example: adding a movie's subtitles
1. Inspect the selector page and its Supabase query.
2. Inspect the target table, unique key, policies, and existing records.
3. Obtain and parse the film's SRT source.
4. Insert every valid subtitle row into Supabase with the correct movie slug/title, subtitle number, timecode, and phrase.
5. Verify the exact inserted count and confirm no phrases are empty.
6. Ensure the selector is populated from Supabase and selecting the film reads its phrases from Supabase.
7. Do not add local runtime SRT loading, auto-select the film, or add statistics/panels unless explicitly requested.
8. Report database verification, code commit, and live deployment as separate statuses.

## Completion report
Use a concise report when relevant:
- **Supabase:** project/table, records inserted or updated, verification result.
- **Frontend:** files changed and how the page reads the database.
- **Repository:** commit identifier/link, if available.
- **Deployment:** verified / not yet verified.
- **Limitations:** anything not checked or any mismatch discovered.

Never say "done" without stating what was actually verified.

## Ask before proceeding only when
- The target Supabase project or table cannot be identified.
- Source data is ambiguous or unavailable.
- The operation could overwrite/delete existing data.
- Schema changes or broader RLS changes appear necessary.
- Requested UI behavior conflicts with current product behavior and intent is unclear.

Otherwise, proceed with the narrowest safe implementation.

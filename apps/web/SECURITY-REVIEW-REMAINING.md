# Security Review — Remaining Items

Items that could not be fully evaluated or fixed without manual steps (database access, environment config, or runtime testing).

---

## Needs Manual Action Before Review

### 1. Run the NudgeLog unique constraint migration

**Status:** Migration SQL created but not applied (no DB connection in this session)
**Action:** Run `npx prisma migrate deploy` against your database.
**File:** `prisma/migrations/20260327000000_add_nudgelog_unique_constraint/migration.sql`
**Risk if skipped:** Concurrent cron runs can create duplicate nudge records.

### 2. Apply pgvector extension migration

**Status:** Schema declares `extensions = [vector]` and `ContactEmbedding` model uses `Unsupported("vector(1536)")`, but the actual `CREATE EXTENSION vector` hasn't been verified against your DB.
**Action:** Ensure your PostgreSQL instance has pgvector installed and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Then run `npx prisma migrate deploy`.

### 3. Verify environment variables for new features

**Status:** Could not run `pnpm build` — env validation requires real secrets.
**Action:** Ensure `.env` / Vercel env vars include:

- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (for nudge digest emails)
- `QSTASH_TOKEN` and `QSTASH_CURRENT_SIGNING_KEY` (for background job dispatch)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (if SMS enabled)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (if web push enabled)
- `CRON_SECRET` (for cron-secured endpoints)

---

## MEDIUM Severity — Not Yet Fixed

### 4. PII in log output

**Where:** Several service files log `userId`, `emailAccountId`, and error objects that may contain email content.
**Files to audit:**

- `utils/outbound-nudge.ts` — logs `emailAccountId`
- `utils/inbound-nudge.ts` — logs `messageId`, `threadId`
- `utils/contact-embedder.ts` — may log contact names/emails
- `utils/auto-draft.ts` — logs email account info
  **Recommendation:** Ensure your log aggregator (Vercel logs, Datadog, etc.) has appropriate PII retention/redaction policies. Consider hashing user IDs in logs.

### 5. Phone number E.164 validation

**Where:** `app/api/user/bntly-settings/route.ts` — `smsPhoneEncrypted` field
**Current state:** Accepts any string. Should validate E.164 format before storing.
**Fix:** Add `.regex(/^\+[1-9]\d{1,14}$/)` to the Zod schema for `smsPhoneEncrypted`, or validate before passing to Twilio.

### 6. Email digest timezone handling

**Where:** `app/api/nudge/digest/route.ts` — uses `emailDigestTimeUtc` (0-23 integer)
**Current state:** Relies on the cron running hourly and checking the UTC hour. Works but doesn't account for DST or sub-hour precision.
**Recommendation:** Document that digest times are UTC-only. Consider adding a `timezone` field to User model for future DST-aware scheduling.

### 7. Cron endpoint defense-in-depth

**Where:** All cron-secured routes use `hasCronSecret(request)` to validate `CRON_SECRET` header.
**Current state:** Works if `CRON_SECRET` is set. If unset, `hasCronSecret` returns false and routes return 401.
**Recommendation:** Verify `CRON_SECRET` is set in all environments. Consider adding IP allowlisting for Vercel Cron IPs as a second factor.

### 8. Global rate limiting (upgrade path)

**Where:** `utils/rate-limit.ts`
**Current state:** In-memory per-instance limiter. On Vercel serverless, each cold start gets a fresh map, so a determined attacker can bypass by hitting different instances.
**Upgrade path:** Install `@upstash/ratelimit` and back the limiter with your existing Upstash Redis. This provides true global rate limiting across all serverless instances.

---

## Items That Were Evaluated and Fixed

For reference, these were addressed in commits on `ralph/lb-email-assistant`:

| Issue                                               | Severity | Commit     | Fix                                           |
| --------------------------------------------------- | -------- | ---------- | --------------------------------------------- |
| SQL injection in alias-resolver (`$queryRawUnsafe`) | CRITICAL | `833255df` | Switched to `$queryRaw` tagged template       |
| SSRF in Slack webhook (`notify-slack.ts`)           | HIGH     | `833255df` | URL allowlist validation                      |
| Permanent email deletion (`junk-purge.ts`)          | HIGH     | `833255df` | Changed `.delete()` to `.trash()`             |
| Unbounded query results (`outbound-nudge.ts`)       | HIGH     | `833255df` | Added `take: 200`                             |
| Open redirect in service worker (`sw.js`)           | HIGH     | `833255df` | Origin validation                             |
| Prompt injection in LLM calls                       | HIGH     | `833255df` | Defensive system prompts + input sanitization |
| XSS in email digest templates                       | HIGH     | `7e4e0c80` | HTML escaping utility                         |
| Sensitive data in GET response                      | HIGH     | `7e4e0c80` | Removed webhook/phone from GET select         |
| Missing Zod validation (tone-profile PUT)           | MEDIUM   | `7e4e0c80` | Added schema with bounds                      |
| Slack URL validation on write                       | MEDIUM   | `7e4e0c80` | Zod `.refine()` check                         |
| Domain allow-listing for trusted senders            | MEDIUM   | `7e4e0c80` | Deny list + regex validation                  |
| `.parse()` → `.safeParse()` in 6 routes             | MEDIUM   | `f8418c8a` | Prevents ZodError leaking                     |
| No rate limiting on LLM endpoints                   | HIGH     | `dafd9a86` | In-memory sliding window limiter              |
| Nudge dedup race condition                          | HIGH     | `dafd9a86` | DB unique constraint + upsert                 |

---

## How to Use This File

Ask Claude Code to review any of the numbered items above:

```
Review item 5 from SECURITY-REVIEW-REMAINING.md and fix it
```

Or review all remaining MEDIUM items:

```
Fix all MEDIUM items in SECURITY-REVIEW-REMAINING.md
```

Delete this file once all items are addressed.

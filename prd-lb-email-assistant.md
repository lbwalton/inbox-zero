# PRD: LB Personal Email Assistant
### Built on top of `lbwalton/inbox-zero` (fork of elie222/inbox-zero)
### Target Repo: `github.com/lbwalton/inbox-zero` (same fork, Ralph branch)

---

## 1. Introduction / Overview

This project extends the existing open-source Inbox Zero codebase with a personalized intelligence layer. The base app already handles AI draft replies, spam blocking, contact categorization, and reply tracking. What it lacks is a continuous learning engine that understands the user specifically — their tone, relationships, priorities, and communication patterns — across multiple Gmail accounts.

**Key decisions:**
- Multi-Gmail-account support from day one; each account has its own tone profile, scores, labels, and filters
- On connecting a new account, the system immediately runs a full contact scoring scan and tone profile scan
- Notifications show nudges from all accounts combined by default; user can choose combined or per-account view
- Focus Mode: user can activate focus on one account; other accounts only break through if their sender priority score is 80+ (8-10 on 0-10 scale). Optional scheduled focus (e.g., 9am-5pm)
- Auto-drafts are silently created in Gmail Drafts — never auto-sent
- Junk label requires manual deletion by default; optional auto-purge after X days (default 30)
- Manual thumbs-up/down tagging on any email trains contact scoring in real time
- Client domains are AI-suggested from email patterns AND manually editable/confirmable
- Anthropic/Claude default LLM; user-swappable via existing abstraction layer in Settings

---

## 2. Goals

- Connect and switch between multiple Gmail accounts (work, personal) in under 2 clicks
- Immediately score contacts and build a tone profile when a new account is connected
- Score each sender 0-100 with continuous learning from behavior + manual tags
- Auto-draft replies silently in the user's voice for high-priority senders
- Proactive nudge notifications across all channels: Slack, SMS, email digest, browser push
- Focus Mode that silences low-priority cross-account noise while preserving critical alerts
- Trusted sender whitelist that keeps the inbox clean by default
- Junk management with optional auto-purge and manual control

---

## 3. User Stories

### US-001: Add ConnectedAccount table
**Description:** As a developer, I need to store multiple Gmail accounts per user.

**Acceptance Criteria:**
- [ ] Add `ConnectedAccount` table: id, userId, gmailAddress (String), accessToken (String), refreshToken (String), tokenExpiry (DateTime), accountLabel (String nullable), isDefault (Boolean default false), createdAt (DateTime)
- [ ] Relation from User to ConnectedAccount (one-to-many)
- [ ] Generate migration and apply successfully
- [ ] Typecheck passes

---

### US-002: Add ContactScore table
**Description:** As a developer, I need to store contact priority scores scoped to each connected account.

**Acceptance Criteria:**
- [ ] Add `ContactScore` table: id, connectedAccountId, contactEmail (String), priorityScore (Float 0-100), replyRate (Float), avgReplyTimeHours (Float), manualOverride (Boolean default false), autoDraftEnabled (Boolean default true), lastUpdated (DateTime)
- [ ] Relation from ConnectedAccount to ContactScore
- [ ] Unique constraint on (connectedAccountId, contactEmail)
- [ ] Generate migration and apply successfully
- [ ] Typecheck passes

---

### US-003: Add EmailSignal table
**Description:** As a developer, I need to store manual Important/Not Important tags per email thread.

**Acceptance Criteria:**
- [ ] Add `EmailSignal` table: id, connectedAccountId, threadId (String), senderEmail (String), signal (enum: IMPORTANT | NOT_IMPORTANT), taggedAt (DateTime)
- [ ] Relation from ConnectedAccount to EmailSignal
- [ ] Generate migration and apply successfully
- [ ] Typecheck passes

---

### US-004: Add ToneProfile table
**Description:** As a developer, I need to store a writing tone fingerprint per connected account.

**Acceptance Criteria:**
- [ ] Add `ToneProfile` table: id, connectedAccountId (unique), avgSentenceLength (Float), commonOpeners (Json), commonSignoffs (Json), formalityScore (Int 1-5), commonPhrases (Json), lastScanned (DateTime)
- [ ] Relation from ConnectedAccount to ToneProfile
- [ ] Generate migration and apply successfully
- [ ] Typecheck passes

---

### US-005: Add NudgeLog table
**Description:** As a developer, I need to track nudge events per account to prevent duplicates.

**Acceptance Criteria:**
- [ ] Add `NudgeLog` table: id, connectedAccountId, threadId (String), nudgeType (enum: OUTBOUND | INBOUND), sentAt (DateTime), status (enum: PENDING | DISMISSED | SNOOZED | ACTIONED default PENDING), snoozeUntil (DateTime nullable)
- [ ] Relation from ConnectedAccount to NudgeLog
- [ ] Generate migration and apply successfully
- [ ] Typecheck passes

---

### US-006: Add TrustedSender table
**Description:** As a developer, I need to store trusted contacts and domains per account, including AI-suggested client domains.

**Acceptance Criteria:**
- [ ] Add `TrustedSender` table: id, connectedAccountId, type (enum: CONTACT | TEAM_DOMAIN | CLIENT_DOMAIN), value (String), addedManually (Boolean default true), addedAt (DateTime)
- [ ] Relation from ConnectedAccount to TrustedSender
- [ ] Generate migration and apply successfully
- [ ] Typecheck passes

---

### US-007: Add SuggestedLabel and PushSubscription tables
**Description:** As a developer, I need to store AI-suggested labels per account and browser push subscriptions per user.

**Acceptance Criteria:**
- [ ] Add `SuggestedLabel` table: id, connectedAccountId, labelName (String), reasoning (String), status (enum: PENDING | APPROVED | DISMISSED default PENDING), gmailLabelId (String nullable), createdAt (DateTime)
- [ ] Add `PushSubscription` table: id, userId, endpoint (String), p256dhKey (String), authKey (String), createdAt (DateTime)
- [ ] Relations from ConnectedAccount to SuggestedLabel; User to PushSubscription
- [ ] Generate migration and apply successfully
- [ ] Typecheck passes

---

### US-008: Add FocusMode table
**Description:** As a developer, I need to store Focus Mode configuration per user, including which account is focused, schedule, and the priority threshold for cross-account breakthrough alerts.

**Acceptance Criteria:**
- [ ] Add `FocusMode` table: id, userId, focusedAccountId (ConnectedAccount relation, nullable), isActive (Boolean default false), scheduleEnabled (Boolean default false), scheduleStartHour (Int nullable, 0-23), scheduleEndHour (Int nullable, 0-23), scheduleTimezone (String nullable, e.g. "America/Los_Angeles"), breakthroughThreshold (Int default 80), updatedAt (DateTime)
- [ ] Relation from User to FocusMode (one-to-one)
- [ ] Generate migration and apply successfully
- [ ] Typecheck passes

---

### US-009: Add user personalization and Junk settings fields
**Description:** As a developer, I need per-user settings for notifications, nudge thresholds, Junk auto-purge, and auto-draft.

**Acceptance Criteria:**
- [ ] Add to User or UserSettings model: slackEnabled (Boolean default false), slackWebhookUrl (String nullable), smsEnabled (Boolean default false), smsPhoneEncrypted (String nullable), emailDigestEnabled (Boolean default true), emailDigestTimeUtc (Int default 14), pushEnabled (Boolean default false), autoDraftEnabled (Boolean default true), autoDraftThreshold (Int default 70), outboundNudgeDays (Int default 3), inboundNudgeDays (Int default 2), junkAutoPurge (Boolean default false), junkAutoPurgeDays (Int default 30), notificationView (enum: COMBINED | PER_ACCOUNT default COMBINED)
- [ ] Generate migration and apply successfully
- [ ] Typecheck passes

---

### US-010: Connect Gmail account API + immediate onboarding scan
**Description:** As a developer, I need a route that adds a new Gmail account and immediately triggers a contact scoring and tone scan.

**Acceptance Criteria:**
- [ ] Create `POST /api/accounts/connect` initiating Google OAuth for an additional Gmail account
- [ ] On OAuth callback, store new ConnectedAccount with encrypted tokens
- [ ] If first account, set isDefault = true
- [ ] Immediately dispatch calculateContactScores AND scanToneProfile for the new connectedAccountId via QStash (non-blocking)
- [ ] Return new ConnectedAccount record (without raw tokens)
- [ ] Typecheck passes

---

### US-011: Active account switcher API route
**Description:** As a developer, I need a route to set the user's active Gmail account.

**Acceptance Criteria:**
- [ ] Create `PUT /api/accounts/:id/activate` storing active connectedAccountId in session
- [ ] Returns { success: true }
- [ ] Typecheck passes

---

### US-012: Account switcher UI in header
**Description:** As LB, I want a quick dropdown in the app header to switch between Gmail accounts.

**Acceptance Criteria:**
- [ ] Dropdown in header lists all ConnectedAccount records with label and Gmail address
- [ ] Active account shown with a checkmark indicator
- [ ] Selecting calls PUT /api/accounts/:id/activate and refreshes current page
- [ ] "Add account" option at bottom opens connect flow
- [ ] Focus Mode status indicator visible in the dropdown (badge or icon on the focused account)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-013: Contact scoring service with EmailSignal weighting
**Description:** As a developer, I need a service scoring contacts 0-100 using behavioral history and manual tags.

**Acceptance Criteria:**
- [ ] Create `/apps/web/utils/contact-scoring.ts` accepting connectedAccountId
- [ ] Base score: reply rate (35%) + inverted avg reply time normalized (25%) + thread frequency normalized (25%)
- [ ] Signal adjustment: IMPORTANT tag = +5 per tag max +15 total; NOT_IMPORTANT = -10 per tag floor 0
- [ ] Skip contacts with manualOverride = true
- [ ] Upserts into ContactScore table
- [ ] Exports: calculateContactScores(connectedAccountId: string): Promise<void>
- [ ] Typecheck passes

---

### US-014: Contact scoring API route and weekly cron
**Description:** As a developer, I need the scoring service callable on-demand and on a weekly schedule.

**Acceptance Criteria:**
- [ ] Create `POST /api/contact-scoring/run` dispatching calculateContactScores for all connectedAccounts of the authenticated user via QStash
- [ ] Add weekly cron to `vercel.json`: `{ "path": "/api/contact-scoring/run", "schedule": "0 2 * * 0" }`
- [ ] Returns { queued: true } immediately
- [ ] Typecheck passes

---

### US-015: Manual email tagging API route
**Description:** As a developer, I need a route that saves a manual signal tag and re-triggers scoring.

**Acceptance Criteria:**
- [ ] Create `POST /api/emails/signal` accepting { threadId, senderEmail, signal: 'IMPORTANT' | 'NOT_IMPORTANT', connectedAccountId }
- [ ] Upserts EmailSignal record
- [ ] Dispatches calculateContactScores for that connectedAccountId via QStash
- [ ] Returns { saved: true }
- [ ] Typecheck passes

---

### US-016: Manual tag UI on email list and thread view
**Description:** As LB, I want thumbs-up/down buttons on every email to train the scoring system.

**Acceptance Criteria:**
- [ ] Add thumbs-up and thumbs-down icon buttons to each email row in inbox list
- [ ] Add same buttons to email thread/detail view
- [ ] Clicking calls POST /api/emails/signal with correct signal
- [ ] Selected state shown visually (filled icon), persists on reload
- [ ] Tooltips: "Mark as Important" / "Mark as Not Important"
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-017: Tone profile scanner service
**Description:** As a developer, I need a service that extracts a tone fingerprint from 90 days of sent mail.

**Acceptance Criteria:**
- [ ] Create `/apps/web/utils/tone-scanner.ts` accepting connectedAccountId
- [ ] Reads last 90 days of sent mail via Gmail API using that account's credentials
- [ ] Uses configured LLM to extract: avgSentenceLength, top 5 openers, top 5 sign-offs, formalityScore 1-5, top 10 common phrases
- [ ] Upserts into ToneProfile table
- [ ] Exports: scanToneProfile(connectedAccountId: string): Promise<void>
- [ ] Typecheck passes

---

### US-018: Tone profile API routes and monthly cron
**Description:** As a developer, I need routes to get, update, and trigger tone scans.

**Acceptance Criteria:**
- [ ] `GET /api/tone-profile` returns ToneProfile for active connectedAccountId
- [ ] `PUT /api/tone-profile` accepts partial updates for active account
- [ ] `POST /api/tone-profile/scan` dispatches scan for all connected accounts via QStash
- [ ] Add monthly cron: `{ "path": "/api/tone-profile/scan", "schedule": "0 3 1 * *" }`
- [ ] Typecheck passes

---

### US-019: Auto-draft generation service
**Description:** As a developer, I need a service that silently creates Gmail draft replies for high-priority emails in the user's voice.

**Acceptance Criteria:**
- [ ] Create `/apps/web/utils/auto-draft.ts` accepting connectedAccountId, threadId, inboundEmailBody
- [ ] Returns early if ContactScore for sender is below autoDraftThreshold or autoDraftEnabled = false
- [ ] Builds LLM prompt using ToneProfile as system context + full thread history
- [ ] Calls LLM via existing abstraction layer
- [ ] Creates draft via gmail.drafts.create — never sends
- [ ] Exports: generateAutoDraft(connectedAccountId: string, threadId: string, emailBody: string): Promise<void>
- [ ] Typecheck passes

---

### US-020: Hook auto-draft and inbox filter into PubSub webhook
**Description:** As a developer, I need the PubSub webhook to identify the correct ConnectedAccount and dispatch all per-email jobs.

**Acceptance Criteria:**
- [ ] In existing `/api/google/webhook`, identify ConnectedAccount by matching Gmail address from PubSub message
- [ ] Dispatch generateAutoDraft via QStash if user autoDraftEnabled = true
- [ ] Dispatch filterInboundEmail via QStash for every inbound email
- [ ] Both dispatches are non-blocking — webhook returns 200 immediately
- [ ] Typecheck passes

---

### US-021: Outbound nudge detection service
**Description:** As a developer, I need a service that finds sent emails awaiting replies.

**Acceptance Criteria:**
- [ ] Create `/apps/web/utils/outbound-nudge.ts` accepting connectedAccountId
- [ ] Scans sent mail for phrases: "let me know", "please confirm", "can you", "do you have", "following up", "waiting to hear", "please respond", "your thoughts"
- [ ] Checks for replies in each matching thread
- [ ] Creates NudgeLog with type OUTBOUND if: no reply after outboundNudgeDays AND no NudgeLog for that threadId within 24hrs
- [ ] Exports: detectOutboundNudges(connectedAccountId: string): Promise<void>
- [ ] Typecheck passes

---

### US-022: Inbound nudge detection service
**Description:** As a developer, I need a service that finds unreplied inbound emails expecting a response.

**Acceptance Criteria:**
- [ ] Create `/apps/web/utils/inbound-nudge.ts` accepting connectedAccountId
- [ ] Scans inbox for unreplied emails older than inboundNudgeDays
- [ ] Uses LLM to classify: "Does this email expect a reply from the recipient? Answer yes or no."
- [ ] Creates NudgeLog type INBOUND if yes AND no NudgeLog for that threadId within 24hrs
- [ ] Exports: detectInboundNudges(connectedAccountId: string): Promise<void>
- [ ] Typecheck passes

---

### US-023: Nudge detection daily cron
**Description:** As a developer, I need nudge detection to run daily across all connected accounts.

**Acceptance Criteria:**
- [ ] Create `POST /api/nudge/detect` dispatching both detect functions for every ConnectedAccount across all users via QStash
- [ ] Add daily cron: `{ "path": "/api/nudge/detect", "schedule": "0 12 * * *" }`
- [ ] Typecheck passes

---

### US-024: Focus Mode enforcement in nudge dispatcher
**Description:** As a developer, I need the nudge dispatcher to suppress cross-account notifications when Focus Mode is active, except for senders scoring 80+.

**Acceptance Criteria:**
- [ ] Before dispatching any notification, check if FocusMode.isActive = true for the user
- [ ] If Focus Mode is active and the nudge's connectedAccountId is NOT the focusedAccountId: only dispatch if ContactScore for the nudge's sender is >= breakthroughThreshold (default 80)
- [ ] If Focus Mode is active and nudge IS for the focused account: dispatch normally
- [ ] If Focus Mode has scheduleEnabled = true: automatically activate/deactivate based on current time in scheduleTimezone vs scheduleStartHour/scheduleEndHour
- [ ] Typecheck passes

---

### US-025: Focus Mode API routes
**Description:** As a developer, I need API routes to get, toggle, and configure Focus Mode.

**Acceptance Criteria:**
- [ ] `GET /api/focus-mode` returns the user's FocusMode record or null
- [ ] `PUT /api/focus-mode` accepts { isActive, focusedAccountId, scheduleEnabled, scheduleStartHour, scheduleEndHour, scheduleTimezone, breakthroughThreshold } and upserts
- [ ] Returns updated FocusMode record
- [ ] Typecheck passes

---

### US-026: Nudge delivery utilities — Slack, SMS, email digest, Web Push
**Description:** As a developer, I need all four notification delivery utilities.

**Acceptance Criteria:**
- [ ] Create `/apps/web/utils/notify-slack.ts`: POST to SLACK_WEBHOOK_URL; message includes account label, nudge type, sender, subject, date, link. Only if slackEnabled = true.
- [ ] Create `/apps/web/utils/notify-sms.ts`: Twilio SDK; decrypts phone; message "📬 [Work/Personal] [sender] is waiting on you — [subject max 60 chars]. Open: [url]". Only if smsEnabled = true.
- [ ] Create `POST /api/nudge/digest`: fetches PENDING NudgeLogs across all accounts (or per-account if notificationView = PER_ACCOUNT), groups by account label + nudge type, sends via Resend. Cron: `{ "path": "/api/nudge/digest", "schedule": "0 14 * * *" }`. Only if emailDigestEnabled = true.
- [ ] Add `public/sw.js`, `POST /api/push/subscribe`, and service worker registration in root layout
- [ ] Create `/apps/web/utils/notify-push.ts` using web-push; sends to all PushSubscription records; handles 410 expirations. Only if pushEnabled = true.
- [ ] Typecheck passes

---

### US-027: Nudge dispatcher orchestrator
**Description:** As a developer, I need a single orchestrator reading pending NudgeLogs and routing to all enabled channels with Focus Mode enforcement.

**Acceptance Criteria:**
- [ ] Create `/apps/web/utils/nudge-dispatcher.ts`
- [ ] Reads all PENDING NudgeLog records across all user accounts
- [ ] Applies Focus Mode logic (US-024) before each dispatch
- [ ] Calls Slack/SMS/push utilities per user settings
- [ ] Updates NudgeLog status to ACTIONED after dispatch
- [ ] `POST /api/nudge/dispatch` triggers via QStash
- [ ] Typecheck passes

---

### US-028: Trusted sender inbox filter with EmailSignal support
**Description:** As a developer, I need logic that archives unknown-sender emails and routes spam to Junk.

**Acceptance Criteria:**
- [ ] Create `/apps/web/utils/inbox-filter.ts` accepting connectedAccountId and sender email
- [ ] Trusted if: in TrustedSender (case-insensitive contact or domain) OR in ContactScore OR EmailSignal has IMPORTANT for sender
- [ ] NOT_IMPORTANT signal overrides trust — treat as unknown
- [ ] Trusted: leave in inbox; Unknown: label "Review" + remove INBOX; Spam/cold: label "Junk"
- [ ] Create "Review" and "Junk" labels if missing
- [ ] Exports: filterInboundEmail(connectedAccountId: string, senderEmail: string, threadId: string): Promise<void>
- [ ] Typecheck passes

---

### US-029: Junk auto-purge service and cron
**Description:** As a developer, I need a service that permanently deletes Junk emails older than X days when enabled.

**Acceptance Criteria:**
- [ ] Create `/apps/web/utils/junk-purge.ts` accepting connectedAccountId
- [ ] Only runs if user junkAutoPurge = true
- [ ] Queries Gmail for emails with "Junk" label older than junkAutoPurgeDays
- [ ] Deletes via gmail.messages.delete
- [ ] `POST /api/junk/purge` route dispatched via QStash
- [ ] Weekly cron: `{ "path": "/api/junk/purge", "schedule": "0 4 * * 1" }`
- [ ] Typecheck passes

---

### US-030: Smart label suggestion + client domain detection service
**Description:** As a developer, I need a monthly job that suggests labels and detects client domains.

**Acceptance Criteria:**
- [ ] Create `/apps/web/utils/label-suggester.ts` accepting connectedAccountId
- [ ] LLM prompt 1: suggest 3-5 Gmail labels based on email patterns. Creates SuggestedLabel records status PENDING.
- [ ] LLM prompt 2: detect company domains appearing frequently. Creates TrustedSender records type CLIENT_DOMAIN, addedManually = false.
- [ ] Skips labels already in SuggestedLabel or Gmail
- [ ] Monthly cron calls this alongside tone scan
- [ ] Typecheck passes

---

### US-031: Smart label approve/dismiss API routes
**Description:** As a developer, I need routes to approve or dismiss suggested labels.

**Acceptance Criteria:**
- [ ] `POST /api/labels/approve/:id`: APPROVED status, create Gmail label, store gmailLabelId, apply to past 30 days
- [ ] `PATCH /api/labels/:id` with { status: DISMISSED }: dismiss
- [ ] `GET /api/labels/suggested`: returns PENDING records for active account
- [ ] Typecheck passes

---

### US-032: Settings hub layout and sidebar
**Description:** As LB, I want a settings hub with sidebar nav for all personalization panels.

**Acceptance Criteria:**
- [ ] Create `/app/settings/personalization/layout.tsx` with sidebar nav
- [ ] Links: Connected Accounts, Focus Mode, Tone Profile, Contact Intelligence, Trusted Senders, Notifications, Auto-Draft Rules, Nudge Rules, Junk Settings, Suggested Labels
- [ ] Active link highlighted; layout consistent with existing /settings design
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-033: Connected Accounts settings panel
**Description:** As LB, I want to manage all connected Gmail accounts.

**Acceptance Criteria:**
- [ ] `/settings/personalization/accounts` lists all ConnectedAccount records with label, Gmail address, default badge
- [ ] Each row: "Set as Default", inline label editor, "Disconnect" button
- [ ] "Add Gmail Account" opens OAuth connect flow
- [ ] Disconnect removes account + all associated data via cascade
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-034: Focus Mode settings panel
**Description:** As LB, I want to configure Focus Mode — which account to focus, when to activate it on a schedule, and the priority threshold for breakthrough alerts.

**Acceptance Criteria:**
- [ ] Create `/settings/personalization/focus` panel
- [ ] Global Focus Mode toggle (maps to FocusMode.isActive)
- [ ] Account selector: dropdown of connected accounts to focus on
- [ ] Breakthrough threshold: number input labeled "Alert me from other accounts when sender scores above X / 100" (default 80); helper text "Only the most critical emails will break through"
- [ ] Schedule section: toggle "Auto-enable on a schedule"; when on shows: start time selector, end time selector, timezone selector; schedule uses scheduleStartHour, scheduleEndHour, scheduleTimezone
- [ ] "Focus Mode Active" status indicator with which account is focused and when it auto-disables
- [ ] All settings save via PUT /api/focus-mode
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-035: Tone Profile settings panel
**Description:** As LB, I want to view and edit my tone fingerprint per account and trigger re-scans.

**Acceptance Criteria:**
- [ ] `/settings/personalization/tone` shows ToneProfile for active account
- [ ] Editable: avg sentence length, common openers, sign-offs, formality score (1-5 select), common phrases
- [ ] Save calls PUT /api/tone-profile, success toast
- [ ] "Re-scan Now" calls POST /api/tone-profile/scan, "Scan started" toast
- [ ] Shows "Last scanned: [date]" and active account label
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-036: Contact Intelligence settings panel
**Description:** As LB, I want to view, override, and configure contacts per account.

**Acceptance Criteria:**
- [ ] `/settings/personalization/contacts` shows top 50 contacts for active account sorted by priorityScore
- [ ] Columns: Email, Score (color badge 0-39 gray / 40-69 amber / 70-100 green), Reply Rate, Avg Reply Time, Auto-Draft toggle, Manual Override lock icon
- [ ] Score editable inline; saving sets manualOverride = true
- [ ] Auto-Draft toggle saves immediately
- [ ] Manual Override lock: locked = score won't auto-update; clicking unlocks and re-enables auto-recalculation
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-037: Trusted Senders settings panel with AI-suggested client domains
**Description:** As LB, I want to manage trusted contacts and domains including AI-suggested ones.

**Acceptance Criteria:**
- [ ] `/settings/personalization/trusted` with three sections: Contacts, Team Domains, Client Domains
- [ ] Client Domains shows AI-suggested entries (addedManually = false) with "Suggested" badge
- [ ] User can confirm (sets addedManually = true) or remove suggested entries
- [ ] Add field + remove buttons per entry in each section
- [ ] Domain validation: no @, no http, must contain dot
- [ ] CRUD via POST/DELETE /api/trusted-senders
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-038: Notification settings panel
**Description:** As LB, I want to configure all notification channels and choose combined vs per-account notification view.

**Acceptance Criteria:**
- [ ] `/settings/personalization/notifications` with toggles for: Slack, SMS, Email Digest, Browser Push
- [ ] Notification view toggle: "Combined (all accounts)" or "Per account" — maps to user notificationView setting
- [ ] Slack: toggle + webhook URL input
- [ ] SMS: toggle + phone input (last 4 digits shown post-save) + "Send Test SMS" button
- [ ] Email Digest: toggle + time select (6am/7am/8am PT)
- [ ] Browser Push: toggle + "Enable Push Notifications" button triggering browser permission + saves subscription
- [ ] Save via PUT /api/user/notification-settings
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-039: Auto-Draft and Nudge Rules settings panel
**Description:** As LB, I want to configure draft generation and nudge timing thresholds.

**Acceptance Criteria:**
- [ ] `/settings/personalization/rules` with:
  - Global Auto-Draft toggle
  - Priority threshold slider 0-100 (default 70) with helper text "X% of your contacts qualify"
  - Outbound nudge days: number input "Remind me if no reply after X days"
  - Inbound nudge days: number input "Remind me to reply after X days"
- [ ] Save via PUT /api/user/nudge-settings
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-040: Junk Settings panel
**Description:** As LB, I want to control Junk label behavior.

**Acceptance Criteria:**
- [ ] `/settings/personalization/junk` with:
  - Toggle "Auto-purge Junk after X days" (default off)
  - Number input for days (default 30, only active when toggle is on)
  - "Purge Now" button triggers POST /api/junk/purge, shows confirmation toast
- [ ] Save via PUT /api/user/junk-settings
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-041: Suggested Labels settings panel
**Description:** As LB, I want to review, approve, or dismiss AI-suggested Gmail labels.

**Acceptance Criteria:**
- [ ] `/settings/personalization/labels` shows PENDING SuggestedLabel records for active account
- [ ] Each row: label name, AI reasoning, Approve and Dismiss buttons
- [ ] Approve calls POST /api/labels/approve/:id; row updates to "Created in Gmail ✓"
- [ ] Dismiss calls PATCH /api/labels/:id; row disappears
- [ ] Empty state with "Generate Now" button
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-038: Enable pgvector and add ContactEmbedding and ContactAlias tables
**Description:** As a developer, I need vector storage and alias storage in Supabase to power semantic contact resolution.

**Acceptance Criteria:**
- [ ] Enable the `pgvector` extension in Supabase via SQL: `CREATE EXTENSION IF NOT EXISTS vector;`
- [ ] Add `ContactEmbedding` table via Prisma (using Unsupported type for vector column): id, connectedAccountId, contactEmail (String), contactName (String nullable), embedding (Unsupported("vector(1536)")), updatedAt (DateTime). Unique on (connectedAccountId, contactEmail).
- [ ] Add `ContactAlias` table: id, userId, phrase (String), resolvedEmail (String), resolvedName (String nullable), connectedAccountId, confirmedAt (DateTime). Unique on (userId, phrase).
- [ ] Add relations from ConnectedAccount to ContactEmbedding; from User to ContactAlias
- [ ] Generate migration and apply successfully
- [ ] Typecheck passes

---

### US-039: Contact embedding generation service
**Description:** As a developer, I need a service that generates vector embeddings for all contacts in a connected account so they can be searched semantically.

**Acceptance Criteria:**
- [ ] Create `/apps/web/utils/contact-embedder.ts` accepting connectedAccountId
- [ ] Fetches all contacts from Gmail Contacts API for that account (name + email)
- [ ] Also pulls top 100 ContactScore records (includes senders who aren't in Contacts)
- [ ] For each contact, constructs an embedding input string: "[name] [email] [any known labels from TrustedSender or ContactScore]"
- [ ] Calls the OpenAI Embeddings API (`text-embedding-3-small`, 1536 dimensions) or the configured LLM provider's embedding endpoint
- [ ] Upserts each embedding into `ContactEmbedding` table
- [ ] Runs on new account connect (dispatched via QStash alongside scoring and tone scan)
- [ ] Exports: generateContactEmbeddings(connectedAccountId: string): Promise<void>
- [ ] Typecheck passes

---

### US-040: Semantic alias resolution service
**Description:** As a developer, I need a service that takes a natural language phrase and returns the best-matching contact using vector similarity search.

**Acceptance Criteria:**
- [ ] Create `/apps/web/utils/alias-resolver.ts`
- [ ] First checks `ContactAlias` table for exact phrase match (case-insensitive) — if found, return immediately without vector search
- [ ] If no confirmed alias: embeds the input phrase using the same embedding model as US-039
- [ ] Runs pgvector cosine similarity search against `ContactEmbedding` for the user's connected accounts: `ORDER BY embedding <=> $queryVector LIMIT 3`
- [ ] Returns top 3 matches with: contactEmail, contactName, similarityScore, connectedAccountId
- [ ] Exports: resolveAlias(userId: string, phrase: string): Promise<AliasMatch[]>
- [ ] Typecheck passes

---

### US-041: Alias confirmation API routes
**Description:** As a developer, I need API routes to resolve a phrase, confirm an alias, and manage stored aliases.

**Acceptance Criteria:**
- [ ] `POST /api/alias/resolve` accepting { phrase } — calls resolveAlias and returns top 3 matches. If exact alias exists, returns it with confirmed: true.
- [ ] `POST /api/alias/confirm` accepting { phrase, resolvedEmail, resolvedName, connectedAccountId } — upserts a `ContactAlias` record. Returns { saved: true }.
- [ ] `GET /api/alias` — returns all ContactAlias records for the authenticated user
- [ ] `DELETE /api/alias/:id` — deletes a stored alias
- [ ] `PATCH /api/alias/:id` accepting { resolvedEmail, resolvedName } — updates a stored alias to a different contact
- [ ] Typecheck passes

---

### US-042: Alias resolution inline UI in email compose
**Description:** As LB, I want the email compose To: field to automatically suggest a real contact when I type a natural language phrase like "my wife", and remember my choice going forward.

**Acceptance Criteria:**
- [ ] In the compose/reply To: field, after the user pauses typing (300ms debounce), call POST /api/alias/resolve with the current input if it doesn't look like an email address
- [ ] If a confirmed alias is returned: silently replace the typed phrase with the resolved contact chip (name + email) — no confirmation needed
- [ ] If unconfirmed matches are returned: render an inline confirmation chip directly below the To: field showing: contact avatar initial, resolved name, email address, "✓ Use this" button, and "Not right" link
- [ ] Clicking "✓ Use this": calls POST /api/alias/confirm, replaces phrase with contact chip
- [ ] Clicking "Not right": dismisses the chip and shows next best match if available
- [ ] Confirmation chip uses spring animation: opacity 0→1 + translateY 4px→0, mass 0.4 / stiffness 450 / damping 28
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-043: Alias Manager settings panel
**Description:** As LB, I want to view, edit, and delete all my confirmed contact aliases in one place.

**Acceptance Criteria:**
- [ ] Create `/settings/personalization/aliases` panel
- [ ] Add "Aliases" link to the Intelligence section of the settings sidebar (between Contact Intelligence and Trusted Senders)
- [ ] Fetches all ContactAlias records via GET /api/alias
- [ ] Table columns: Phrase (e.g. "my wife"), Resolves To (name + email chip), Account, Confirmed Date, Edit button, Delete button
- [ ] Edit button: opens inline row edit showing a contact search input to reassign the alias to a different contact, saves via PATCH /api/alias/:id
- [ ] Delete button: shows inline confirmation "Remove this alias?" with Confirm/Cancel, deletes via DELETE /api/alias/:id
- [ ] Empty state: "No aliases yet. They're created automatically when you confirm a suggestion."
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-042: Priority score badge, manual tag UI, and Focus Mode indicator on inbox
**Description:** As LB, I want priority badges, thumbs-up/down tags, and a Focus Mode status bar visible in my inbox.

**Acceptance Criteria:**
- [ ] Colored priority badge on each inbox email row next to sender: gray (0-39), amber (40-69), green (70-100)
- [ ] Numeric score in badge; tooltip "Priority score: X"
- [ ] Thumbs-up/down icon buttons on each email row (hover-visible desktop, always-visible mobile) and in thread view
- [ ] Clicking calls POST /api/emails/signal; filled icon state persists on reload
- [ ] When Focus Mode is active: a slim banner visible at top of inbox reads "Focus Mode: [Account Label] · Other accounts suppressed below [X]" with a quick "Pause" link
- [ ] No badge shown if no score exists for sender
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

## 4. Functional Requirements

- **FR-1:** Every data table (ContactScore, ToneProfile, NudgeLog, TrustedSender, SuggestedLabel) is scoped to connectedAccountId, not userId
- **FR-2:** Gmail API calls always use credentials of the specific ConnectedAccount
- **FR-3:** Active account set per session; all inbox views and settings panels operate on the active account
- **FR-4:** Contact priority score = reply rate (35%) + inverted avg reply time (25%) + thread frequency (25%) + signal adjustments (15%)
- **FR-5:** IMPORTANT signal: +5 per tag max +15. NOT_IMPORTANT: -10 per tag floor 0. manualOverride skips auto-recalculation.
- **FR-6:** Auto-draft uses gmail.drafts.create only — never gmail.messages.send
- **FR-7:** Focus Mode breakthrough threshold: integer 0-100 (default 80). Only NudgeLogs from non-focused accounts with sender priorityScore >= threshold break through.
- **FR-8:** Focus Mode schedule: auto-activates at scheduleStartHour and deactivates at scheduleEndHour in scheduleTimezone. Nudge dispatcher checks current time before each dispatch.
- **FR-9:** Junk auto-purge only runs when junkAutoPurge = true; otherwise Junk is manual-delete only
- **FR-10:** AI-suggested client domains have addedManually = false; must be user-confirmed to be fully trusted
- **FR-11:** Nudge deduplication: same threadId cannot produce more than one NudgeLog within 24 hours
- **FR-12:** All AI calls use existing LLM abstraction — Anthropic/Claude default, user-swappable in Settings
- **FR-13:** Long-running jobs dispatched via Upstash QStash — never inline in API routes
- **FR-14:** Phone stored AES-encrypted; only last 4 digits shown in UI
- **FR-15:** Domain matching case-insensitive, full domain only
- **FR-16:** On new account connect, immediately dispatch contact scoring + tone scan via QStash

---

## 5. Non-Goals

- No mobile native app (browser push covers mobile browsers)
- No Outlook / Office 365 support
- No team-shared inbox
- No billing system (personal self-hosted use)
- No LLM fine-tuning (prompt-engineering only)
- Not replacing Gmail — augments it via Gmail API

---

## 6. Design Considerations

*Informed by the elite-saas-designer framework. This is a productivity-first, power-user tool for someone who spends significant time in email daily. Design philosophy: dark-first, keyboard-driven, zero cognitive overhead, sub-100ms perceived interactions.*

### 6.1 Design Philosophy

This is a **productivity/power-user tool** — not a consumer app. Design principles in priority order:

1. **Speed over decoration** — every color, border, and icon must earn its place by reducing cognitive load or communicating state
2. **Dark-first** — primary theme is dark; light theme is a toggle, not an afterthought
3. **Progressive disclosure** — the inbox shows only what matters right now; depth is available on demand
4. **Keyboard-first** — all critical actions reachable without a mouse
5. **Zero loading spinners** — optimistic UI with instant visual feedback

### 6.2 Design System Tokens

Build on the existing shadcn/ui + Tailwind system but layer these semantic tokens on top:

**Color (Oklch space for perceptual uniformity):**
- `--color-base`: near-black (`oklch(12% 0 0)`) — page and sidebar background
- `--color-surface`: dark card surface (`oklch(17% 0 0)`) — email rows, panels
- `--color-surface-hover`: slightly lighter (`oklch(21% 0 0)`)
- `--color-accent`: electric blue (`oklch(65% 0.2 250)`) — primary actions, active states
- `--color-priority-low`: neutral gray (`oklch(50% 0 0)`) — score 0-39
- `--color-priority-mid`: amber (`oklch(70% 0.18 75)`) — score 40-79
- `--color-priority-high`: emerald (`oklch(72% 0.17 160)`) — score 80-100
- `--color-focus-indicator`: violet (`oklch(62% 0.22 290)`) — Focus Mode UI elements
- `--color-destructive`: red (`oklch(58% 0.22 25)`) — destructive actions only

**Typography — Geist (developer/technical aesthetic, matches the productivity positioning):**
- Display: Geist, tight letter-spacing (-0.02em), weights 600-700
- Body/labels: Geist, normal tracking, weight 400-500, 14px minimum for UI labels
- Monospace (email addresses, scores): Geist Mono

**Spacing:** Strict 4px base unit. No arbitrary values.

**Radius:** 6px for cards and rows; 4px for badges and chips; 8px for modals and panels

### 6.3 Inbox Layout

The inbox is the primary surface. It should feel like a high-signal terminal, not a cluttered email client.

**Email list row anatomy (left to right):**
1. Account color dot (2px left border, color-coded per connected account — subtle but scannable)
2. Sender name (weight 500, 14px)
3. Priority badge (score chip — only shown when score exists; color-coded per tokens above)
4. Subject line (truncated with ellipsis, weight 400, slightly muted)
5. Snippet (very muted, max 60 chars)
6. Timestamp (right-aligned, monospace)
7. Thumbs-up/thumbs-down signal buttons (visible on row hover on desktop; always visible on mobile)

**Spacing:** 12px vertical padding per row; 16px horizontal. Rows have 1px separator, not full card borders (reduces visual weight).

**Focus Mode banner:** When active, a 32px slim banner below the top nav (not over the inbox). Violet left border accent, subtle background tint, text: "Focus · [Account] · Other accounts paused below [X]" with a "Pause" link on the right. Does not shift layout — overlays the very top of the list with a fixed position and a fade-out gradient below it.

**Account color coding:** Each connected account gets a unique color (pulled from a fixed accessible palette of 6 colors). The 2px left border on email rows, the account dot in the header switcher, and the Focus Mode banner all use the same color for that account. This creates a fast visual scan — LB can see at a glance if a Personal email snuck into his focused Work session.

### 6.4 Account Switcher Component

- Lives in the top nav, left of the user avatar
- Shows: account color dot + label abbreviation (W / P) + small chevron
- On click: a popover (not a full dropdown) with all connected accounts, each showing color dot + label + Gmail address + active checkmark
- Below the list: "Add Gmail Account" with a `+` icon
- Focus Mode status shown per account in the popover: violet dot if that account is currently focused
- Keyboard: `Tab` to reach, `Space`/`Enter` to open, arrow keys to navigate, `Enter` to select

### 6.5 Focus Mode UI

Focus Mode is a first-class feature — it deserves prominent, clear visual feedback, not buried settings.

- **Activation:** Quick-toggle accessible from the account switcher popover AND from the Focus Mode settings panel
- **Active state:** Entire app UI has a very subtle violet tint on the sidebar/nav (opacity 8%) — enough to signal "you're in focus mode" without being distracting
- **Banner:** Slim, non-intrusive, dismissable per session
- **Breakthrough alerts:** When a cross-account notification breaks through the threshold, the push/SMS/Slack message is prefixed with "🔴 CRITICAL [Account]" to distinguish from normal nudges

### 6.6 Settings Hub

The settings hub at `/settings/personalization` follows a two-column layout:
- Left: 240px fixed sidebar with nav links, grouped into sections:
  - **Accounts:** Connected Accounts, Focus Mode
  - **Intelligence:** Tone Profile, Contact Intelligence, Trusted Senders, Suggested Labels
  - **Inbox:** Auto-Draft Rules, Nudge Rules, Junk Settings
  - **Alerts:** Notifications
- Right: content panel with 640px max-width, centered

Each settings panel:
- Opens with a clear H2 title + one-sentence description of what this panel controls
- Uses card-sectioned layout (surface background, 6px radius, 16px padding) per logical group
- Save feedback: inline success state on the button itself ("Saved ✓") that reverts to "Save" after 2s — no toast for routine saves
- Destructive actions (Disconnect account, Purge Now): require confirmation — a small inline confirmation state on the button itself, not a modal

### 6.7 Priority Badge Component

The priority badge is the most-seen custom component. It must be:
- **Size:** 20px height, min-width 28px, monospace digit(s), 4px horizontal padding
- **States:** scored (shows number with color), unscored (not rendered — no empty badge)
- **Tooltip:** on hover "Priority score: X / 100 · Based on reply history + your tags"
- **Accessibility:** `aria-label="Priority score X"`, not keyboard focusable (decorative unless user tabs to it)

### 6.8 Thumbs Signal Button Component

- **Size:** 16px icon, 28px touch target minimum (meets WCAG 2.2 AA)
- **Default state:** ghost/outline icon, muted color
- **Selected state:** filled icon, color-matched (green for thumbs-up, red for thumbs-down)
- **Transition:** spring physics, mass 0.5 / stiffness 400 / damping 28 — snappy with no overshoot (critically damped, power-user feel)
- **Tooltip:** "Mark as Important" / "Mark as Not Important"
- **Mutual exclusion:** selecting thumbs-up while thumbs-down is selected clears thumbs-down and vice versa

### 6.9 Keyboard Navigation

At minimum, the following shortcuts must work in the inbox:
- `I` — mark selected email as Important (thumbs-up signal)
- `N` — mark selected email as Not Important (thumbs-down signal)
- `F` — toggle Focus Mode on/off
- `J` / `K` — next / previous email in list (vim-style)
- `Cmd+K` — global command palette (inherit from base app if present, or add)

### 6.10 Motion Spec

All custom animated components use spring physics (never duration-based easing):
- **Row interactions** (hover, select): mass 0.5 / stiffness 500 / damping 30 — instant, no delay
- **Badge mount** (score appears for first time): scale from 0.7 to 1.0, mass 0.4 / stiffness 600 / damping 25
- **Focus Mode banner** slide-in: translate Y from -32px to 0, mass 0.6 / stiffness 380 / damping 32
- **Account switcher popover**: opacity 0→1 + scale 0.96→1.0, mass 0.4 / stiffness 450 / damping 28
- **Signal button fill**: scale pulse 1.0→1.2→1.0, mass 0.3 / stiffness 800 / damping 20

### 6.11 Responsive Behavior

- **Desktop (1280px+):** Full two-column settings layout; thumbs buttons on hover
- **Tablet (768-1279px):** Settings sidebar collapses to icon-only nav
- **Mobile (<768px):** Settings sidebar becomes a bottom sheet nav; thumbs buttons always visible; account switcher accessible via header tap; Focus Mode banner is 28px height with truncated text

### 6.12 Accessibility Requirements (WCAG 2.2 AA minimum)

- All interactive elements minimum 24x24px touch target (44x44px for primary actions)
- Minimum 4.5:1 contrast ratio for all text on background surfaces
- Priority badges: do not rely on color alone — include numeric score
- Focus Mode banner: includes text state, not color-only signaling
- Signal buttons: `aria-pressed` state reflects selected/deselected
- All form inputs in settings: associated labels, error states with `aria-describedby`
- Color-coded account dots: supplemented with account label text, not color alone

---

## 6b. Contact Alias Resolution (Semantic Memory)

### Overview

This feature gives the assistant a semantic memory layer so natural language references like "my wife", "my boss", or "the client" automatically resolve to real Gmail contacts — and stay resolved permanently once confirmed. It is powered by **pgvector**, Supabase's built-in Postgres vector extension, meaning zero additional services or cost.

Think of it as the same memory system that makes Siri understand "call home" — except trained entirely on your own email history, contacts, and the labels you assign.

### How It Works

1. When a new account is connected, the system generates a vector embedding for every contact (name + email + any known labels/aliases)
2. When the user types a natural language reference — in the compose window, a search bar, or a future chat interface — the system embeds that phrase and runs a similarity search against all contact embeddings
3. The top match is surfaced as an inline suggestion: *"Did you mean Laura Walton (laura@...)?"*
4. User confirms once — the alias is stored permanently
5. All future references to that phrase resolve silently — no confirmation prompt again

### Alias Types the System Learns

| What you say | What it resolves to |
|---|---|
| "my wife" | Laura (from contacts + past email patterns) |
| "my boss" | Most-emailed person with manager-signal in email history |
| "the client" | Context-dependent — most recent active client thread |
| "my team" | All contacts sharing the user's company domain |
| "Jackson's school" | Domain that sends school-related emails to LB |
| "Tinuiti" | All `@tinuiti.com` contacts |

### User Stories (US-038 through US-043)

See Section 3 user stories.

### Design Notes

- Alias confirmation appears as a **non-blocking inline chip** directly below the compose To: field or search input — not a modal, not a toast
- Chip anatomy: avatar dot + resolved name + email + "✓ Use this" button + "Not right" link
- Once confirmed, the To: field silently replaces the alias phrase with the resolved contact chip
- In the Alias Manager settings panel, aliases are shown as a simple two-column list: phrase → resolved contact, with an edit and delete button per row

---

## 7. Technical Stack

**Base (already in repo):** Next.js App Router, Tailwind CSS, shadcn/ui, Prisma ORM, Upstash Redis, Google OAuth + Gmail API + PubSub, Resend, multi-LLM abstraction, Turborepo

**New env vars:**
- `DATABASE_URL` — Supabase Postgres connection string
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- `SLACK_WEBHOOK_URL`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- `QSTASH_URL`, `QSTASH_TOKEN`

**New npm packages:**
- `web-push` — Web Push notifications
- `twilio` — SMS
- `framer-motion` — spring physics animations (if not already in base app)
- `openai` — embedding generation via `text-embedding-3-small` (or use existing LLM provider if it supports embeddings)

**Vector database:**
- **pgvector** — Supabase built-in Postgres extension, zero additional cost. Enable with `CREATE EXTENSION IF NOT EXISTS vector;`. Prisma uses `Unsupported("vector(1536)")` type for the embedding column. Similarity search runs directly in SQL via the `<=>` cosine distance operator.

---

## 8. Success Metrics (HEART Framework)

- **Happiness:** 80%+ of auto-drafts need only minor edits before sending
- **Engagement:** User tags at least 5 emails per week (Important/Not Important) — indicates the system is teaching itself
- **Adoption:** Both Gmail accounts connected and active within 10 minutes of first setup
- **Retention:** User switches to Focus Mode at least 3x per week
- **Task success:** Zero missed follow-ups on outbound emails containing a question; nudges arrive within 15 minutes of threshold being crossed

---

## 9. Open Questions Resolved

- **OQ-1 ✅:** On new account connect, immediately dispatch contact scoring + tone scan via QStash. No waiting for cron.
- **OQ-2 ✅:** Notifications default to combined view (all accounts). User can switch to per-account view in Settings. Focus Mode adds a third mode: focused account gets full notifications; other accounts are suppressed unless sender scores 80+ (user-configurable threshold).
- **OQ-3 (Junk) ✅:** Manual deletion by default. Optional auto-purge toggle with configurable days (default 30). "Purge Now" button available.
- **OQ-4 (Client domains) ✅:** AI-suggested from email patterns AND manually enterable. Suggested domains shown with badge; user must confirm them to be fully trusted (addedManually = true).

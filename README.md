# HBS WORKSPACE – A HBS Brand
## Run
### Run Both (Monorepo Root)
```bash
npm run dev          # Runs both API (port 4000) and Web (port 3000) concurrently
```

### Run Separately
```bash
# Option A: From root
npm run dev:api      # API server -> http://localhost:4000/docs
npm run dev:web      # Web app    -> http://localhost:3000

# Option B: From individual directories
cd api && npm run start:dev
cd web && npm run dev
```

### Database Operations
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:seed      # Seed super admin and preset roles
```
## Status
- [x] Phase 1: monorepo, auth (JWT + rotating refresh), multi-tenancy, RBAC, audited Super Admin company access, design tokens, landing + login
- [x] Phase 2: plans, pricing page, Super Admin UI (stats, companies, suspend/activate, plans, payments), trial, plan limits (branches), Razorpay orders + signature verify + idempotent webhooks (**needs Razorpay test keys to run live; set RAZORPAY_* in .env**)
- [x] Phase 3: company profile, branches, departments, designations, employees (CRUD, search/sort/paginate, CSV import/export, archive, transfer history, plan employee limit, optional portal login), custom roles & permission matrix, user access with branch/department restriction. Pending: employee documents (needs S3), photo upload, ID card, offboarding workflow, salary history (Phase 7)
- [x] Phase 4: attendance — face (in-browser face-api descriptors, AES-256-GCM encrypted templates, consent, server liveness challenge, duplicate-face + lockout), selfie, GPS geofence, manual/bulk edits with audit, correction workflow, overnight-safe checkout. Needs FACE_ENC_KEY. **Limitation:** liveness is client-side (not tamper-proof); use a certified service (e.g. AWS Rekognition Face Liveness) for high-assurance. Selfies stored in DB until S3 is configured. Late/early/overtime/weekly-off/holiday auto-marking arrive with shifts (Phase 5).
- [x] Phase 5: shift types/config, assignment (employee/department/branch, temporary), rotation generator + roster calendar, swap workflow (colleague accepts → manager approves), holidays (company/branch/department/optional), night-shift-safe work date, late/early/overtime/break-aware hours, weekly-off & holiday auto-expectation, finalize-day, shift reports. Limits: SPLIT shifts are treated as one window; holiday overtime is counted by shift rules only; export to PDF/Excel in Phase 10; rotation via BullMQ in later phases.
- [x] Phase 6: leave types (defaults seeded per company), branch/department quota policies, balances (allocated/used/pending/remaining), half-day, emergency, 1–2 level approval, cancel, carry-forward, encashment, holiday/weekly-off aware day count, ON_LEAVE attendance sync, LWP query for payroll. Defaults (e.g. maternity 182 days) are configurable starting points, not legal advice. Pending: notifications (Phase 8), leave-year/proration settings, cross-year leave split.
- [x] Phase 7: salary structures + revision history, configurable PF/ESI/PT/OT rules (integer-paise math), attendance/leave/holiday → payable days, LWP, loans & advances with repayment, bonus/incentive/other adjustments, run workflow DRAFT→SUBMITTED→APPROVED→LOCKED, payslips (PDF single + bulk), bank-transfer CSV, salary register, post-lock adjustments applied to next run. **Verify statutory defaults with your CA.** Not built: TDS projection engine (monthly TDS is entered per employee), bank payout API, arrears auto-calc, F&F settlement, leave-encashment payout.
- [x] Phase 8: birthdays & work anniversaries (timezone-aware hourly BullMQ job, idempotent per employee/year, milestone filter, editable templates, in-app + email, delivery log, upcoming/calendar widgets), in-app notification centre (leave decisions, payslips, celebrations). Needs REDIS_URL for scheduled/queued jobs (without it use **Run now**); email needs SMTP_*. Pending: WhatsApp & push providers, Socket.IO live updates (UI polls every 60s), subscription/attendance alert notifications.
- [x] Phase 9: CRM — leads (source/status/priority/follow-up/history), customers, deals + drag-drop pipeline (New Lead→Contacted→Interested→Proposal→Negotiation→Won/Lost), activities (calls/meetings/tasks/follow-ups), lead→customer+deal conversion, monthly sales targets, reports (conversion, source, pipeline, team performance). Sales Executives see only their own records; `crm:manage` sees all. Pending: due-date reminder notifications, import/export, email/WhatsApp from CRM, custom pipeline stages. Existing companies need a Sales role created in Settings (new companies get Sales Manager/Executive presets).
- [x] Phase 10: announcements (+notifications), expenses (receipt upload, approval, reimbursement via next payroll), assets (assign/return history), recruitment (jobs, candidates, interviews), performance (cycles, goals/KPIs, self+manager review), helpdesk (tickets, comments, assignment), reports centre (HR/attendance/leave/payroll/CRM/ops; JSON, CSV, PDF). Re-run `npm run db:seed` to sync new permissions into existing companies' system roles. Pending: Excel .xlsx export (CSV opens in Excel), receipt storage on S3 (stored in DB for now), asset documents, offer letters, 360° feedback.
- [x] Phase 11: production Dockerfiles, prod compose + nginx (TLS, rate limits, headers), env validation, health endpoint, graceful shutdown, auth throttling, CI + deploy workflows, MySQL backup script, deployment/security/status docs. See docs/DEPLOYMENT.md first.
See docs/ARCHITECTURE.md.

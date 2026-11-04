# HBS WORKSPACE – A HBS Brand
## Run
    cp .env.example apps/api/.env && cp .env.example apps/web/.env.local
    docker compose up -d
    npm install
    npm run db:migrate -- --name init && npm run db:seed
    npm run dev:api   # http://localhost:4000/docs
    npm run dev:web   # http://localhost:3000
## Status
- [x] Phase 1: monorepo, auth (JWT + rotating refresh), multi-tenancy, RBAC, audited Super Admin company access, design tokens, landing + login
- [x] Phase 2: plans, pricing page, Super Admin UI (stats, companies, suspend/activate, plans, payments), trial, plan limits (branches), Razorpay orders + signature verify + idempotent webhooks (**needs Razorpay test keys to run live; set RAZORPAY_* in .env**)
- [x] Phase 3: company profile, branches, departments, designations, employees (CRUD, search/sort/paginate, CSV import/export, archive, transfer history, plan employee limit, optional portal login), custom roles & permission matrix, user access with branch/department restriction. Pending: employee documents (needs S3), photo upload, ID card, offboarding workflow, salary history (Phase 7)
- [x] Phase 4: attendance — face (in-browser face-api descriptors, AES-256-GCM encrypted templates, consent, server liveness challenge, duplicate-face + lockout), selfie, GPS geofence, manual/bulk edits with audit, correction workflow, overnight-safe checkout. Needs FACE_ENC_KEY. **Limitation:** liveness is client-side (not tamper-proof); use a certified service (e.g. AWS Rekognition Face Liveness) for high-assurance. Selfies stored in DB until S3 is configured. Late/early/overtime/weekly-off/holiday auto-marking arrive with shifts (Phase 5).
- [x] Phase 5: shift types/config, assignment (employee/department/branch, temporary), rotation generator + roster calendar, swap workflow (colleague accepts → manager approves), holidays (company/branch/department/optional), night-shift-safe work date, late/early/overtime/break-aware hours, weekly-off & holiday auto-expectation, finalize-day, shift reports. Limits: SPLIT shifts are treated as one window; holiday overtime is counted by shift rules only; export to PDF/Excel in Phase 10; rotation via BullMQ in later phases.
- [x] Phase 6: leave types (defaults seeded per company), branch/department quota policies, balances (allocated/used/pending/remaining), half-day, emergency, 1–2 level approval, cancel, carry-forward, encashment, holiday/weekly-off aware day count, ON_LEAVE attendance sync, LWP query for payroll. Defaults (e.g. maternity 182 days) are configurable starting points, not legal advice. Pending: notifications (Phase 8), leave-year/proration settings, cross-year leave split.
- [x] Phase 7: salary structures + revision history, configurable PF/ESI/PT/OT rules (integer-paise math), attendance/leave/holiday → payable days, LWP, loans & advances with repayment, bonus/incentive/other adjustments, run workflow DRAFT→SUBMITTED→APPROVED→LOCKED, payslips (PDF single + bulk), bank-transfer CSV, salary register, post-lock adjustments applied to next run. **Verify statutory defaults with your CA.** Not built: TDS projection engine (monthly TDS is entered per employee), bank payout API, arrears auto-calc, F&F settlement, leave-encashment payout.
- [x] Phase 8: birthdays & work anniversaries (timezone-aware hourly BullMQ job, idempotent per employee/year, milestone filter, editable templates, in-app + email, delivery log, upcoming/calendar widgets), in-app notification centre (leave decisions, payslips, celebrations). Needs REDIS_URL for scheduled/queued jobs (without it use **Run now**); email needs SMTP_*. Pending: WhatsApp & push providers, Socket.IO live updates (UI polls every 60s), subscription/attendance alert notifications.
- [ ] Phase 9 (next): CRM
See docs/ARCHITECTURE.md.

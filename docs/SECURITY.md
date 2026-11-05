# Security notes

## Implemented
* Passwords: bcrypt (cost 12). JWT access tokens (15 min) + opaque refresh tokens stored as SHA-256 hashes, **rotated on every use**, reuse revokes the whole family.
* Multi-tenancy: `tenantId` comes only from the verified token; every query is scoped; branch/department restrictions via `scope()`. Super Admin company access is a 1-hour, audited, tenant-scoped token that cannot call Super Admin routes.
* Authorization enforced in NestJS guards (`@RequirePerms`, `@SuperAdminOnly`); a role cannot grant permissions its creator lacks; self-approval blocked for leave, expenses, payroll, shift swaps, attendance corrections.
* Input validation: global `ValidationPipe` (whitelist + forbidNonWhitelisted); CSV exports neutralise spreadsheet formulas; HTML email content is escaped.
* Rate limiting: global throttler (120/min), 10/min on login/register/refresh, plus nginx `limit_req`. Face-attempt lockout (5 failures / 10 min).
* Transport/headers: HTTPS + HSTS (nginx), helmet, Next security headers, `trust proxy` for correct client IPs.
* Secrets: environment only; startup refuses weak/missing secrets in production (`config/env.ts`). Razorpay payment + webhook signatures verified server-side, webhooks idempotent.
* Biometrics: templates AES-256-GCM encrypted at rest, explicit consent, purge on archive/withdraw.
* Money: integer-paise payroll arithmetic; locked payroll immutable (post-lock changes are audited adjustments).

## Known gaps / recommended before large-scale launch
1. **Tokens live in `sessionStorage`** (XSS-exposed). Consider httpOnly refresh cookie + CSRF token; add a strict Content-Security-Policy once inline scripts are audited.
2. **Face liveness is client-side** – use a certified liveness service for high-assurance attendance.
3. Bank account numbers and selfies/receipts are stored **unencrypted in MySQL** – move files to S3 (SSE-KMS, signed URLs) and encrypt bank fields.
4. No MFA / password-reset email flow / account lockout beyond rate limits.
5. No automated tenant-isolation integration tests against a live DB – write them (two tenants, cross-ID access attempts) and run in CI with a MySQL service.
6. Dependency audit is advisory in CI; pin and review upgrades. Run an external penetration test.
7. Data-protection obligations (India DPDP Act / your jurisdiction): privacy notice, consent records, retention schedule, breach process, data-processing agreements – requires legal review.

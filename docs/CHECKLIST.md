# Product status

## Built (all 11 phases)
Auth & multi-tenancy · Super Admin (plans, companies, payments, audited company access) · Razorpay orders/verify/webhooks · Company, branches, departments, designations, roles & permissions · Employees (CSV import/export, transfer, archive) · Attendance (face, selfie, GPS geofence, manual, corrections) · Shifts (night/rotational/swaps/holidays) · Leaves (policies, balances, approvals, carry-forward, encashment) · Payroll (structures, statutory rules, workflow, payslip PDF, bank CSV) · Celebrations & notifications (BullMQ) · CRM · Expenses, assets, recruitment, performance, helpdesk, announcements · Reports centre (CSV/PDF) · Docker, CI/CD, backups.

## Pending configuration (cannot be verified without your credentials)
* Razorpay keys + webhook secret (test mode first) · SMTP · Redis URL · `FACE_ENC_KEY` · AWS resources · domain/TLS.
* Initial Prisma migration must be generated and committed (see DEPLOYMENT.md §0).

## Not built / future
Razorpay recurring subscriptions, invoice PDFs, upgrade proration, grace period · Super Admin: create/edit company, audit-log, support, settings pages · TDS projection, F&F settlement, Form 16/PF/ESI returns, bank payout API · WhatsApp, push, Socket.IO · Excel `.xlsx` export · S3 file storage · biometric devices/kiosk · employee documents/ID card/offboarding · SSO/MFA · public careers page · custom CRM stages · mobile apps.

## Honest testing status
Unit tests cover pure logic (payroll maths, shift/night-shift times, leave quotas, permissions guard, crypto, CSV/PDF, env validation). **No live-database, browser or load tests have been run** – before go-live execute the 23 workflows in the original brief against a staging environment with real MySQL/Redis and Razorpay test keys.

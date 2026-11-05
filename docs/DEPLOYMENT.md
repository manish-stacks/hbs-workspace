# Deployment guide (AWS: EC2 + RDS MySQL + S3 + CloudFront + Nginx + Docker)

## 0. One-time: create the database migrations
The repo ships the Prisma schema but **no migration history yet** (it could not be generated without a MySQL server). Do this once on your machine and commit the result:
```
docker compose up -d mysql
cp .env.example apps/api/.env
cd apps/api && npx prisma migrate dev --name init   # creates prisma/migrations/
git add prisma/migrations && git commit -m "db: initial migration"
```
From then on production uses `prisma migrate deploy` (never `migrate dev`/`db push`). Every schema change = a new committed migration.

## 1. AWS resources
| Resource | Notes |
|---|---|
| VPC, security groups | EC2: 80/443 from anywhere, 22 from your IP only. RDS: 3306 only from the EC2 security group. |
| RDS MySQL 8.0 | Multi-AZ for production, storage encryption on, automated backups ≥ 7 days, deletion protection, `require_secure_transport=ON`. Create user `hbs_app` (no SUPER). |
| EC2 (t3.medium+) | Ubuntu 22.04/24.04, Docker + compose plugin, IAM role with ECR pull + S3 backup write. |
| ECR | repos `hbs-api`, `hbs-web`. |
| S3 | bucket for DB backups (private, SSE). Later: bucket for documents/selfies/receipts (currently stored in MySQL). |
| CloudFront (optional) | Origin = EC2 domain; cache `/_next/static/*` and `/models/*`; forward all headers/cookies and **no caching** for `/api/*`. ACM cert in us-east-1. |
| Route 53 / DNS | A record `app.example.com` → EC2 Elastic IP (or CloudFront). |

## 2. Server bootstrap
```
sudo mkdir -p /opt/hbs && cd /opt/hbs
# copy: docker-compose.prod.yml, infrastructure/nginx/default.conf.template, scripts/backup-mysql.sh
cp .env.production.example .env && chmod 600 .env && nano .env   # fill every value
# TLS (first time, before nginx starts): 
sudo certbot certonly --standalone -d app.example.com --agree-tos -m you@example.com
```
Login to ECR, then:
```
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml run --rm migrate     # applies migrations + seeds permissions/plans/super admin
docker compose -f docker-compose.prod.yml up -d
curl -fsS https://app.example.com/api/health
```
Certificate renewal: `0 3 * * * certbot renew --quiet --deploy-hook "docker compose -f /opt/hbs/docker-compose.prod.yml exec nginx nginx -s reload"`.

## 3. CI/CD (GitHub Actions)
* `ci.yml` – every push/PR: install, `prisma validate`, API tests, API + web build, `npm audit`.
* `deploy.yml` – on tag `vX.Y.Z`: build & push images to ECR, SSH to EC2, run migrations, `up -d`, health-check. Add the secrets listed at the top of the file (prefer an OIDC role over access keys).
* Rollback: `sed -i 's/^TAG=.*/TAG=v1.0.0/' .env && docker compose -f docker-compose.prod.yml up -d` (migrations are forward-only – write backward-compatible migrations, or restore from backup).

## 4. Razorpay
Set live/test keys in `.env`. In the Razorpay dashboard add webhook `https://app.example.com/api/webhooks/razorpay` with events `payment.captured`, `payment.failed`, `order.paid`, and copy the webhook secret to `RAZORPAY_WEBHOOK_SECRET`. Test in **test mode** end-to-end before live keys.

## 5. Backups & restore
* **RDS automated backups + snapshots** are the primary protection (point-in-time recovery).
* **Logical dumps:** `scripts/backup-mysql.sh` via cron (daily, 14-day local retention, optional S3 copy). Test a restore monthly:
```
gunzip -c hbs_workspace-YYYYMMDD-HHMMSS.sql.gz | mysql -h <host> -u <user> -p hbs_workspace_restore
```
* **Back up secrets** (`FACE_ENC_KEY`, `JWT_ACCESS_SECRET`) in a password manager/Secrets Manager. Without `FACE_ENC_KEY` enrolled faces cannot be decrypted.
* Redis holds only queue state; `redis-data` volume is enough.

## 6. Monitoring & logging
* Health: `GET /api/health` (DB check) – wire to an uptime monitor / ALB target check / Route 53 health check.
* Container logs: `docker compose logs -f api` (json-file, rotated). Ship to CloudWatch with the CloudWatch agent or the `awslogs` Docker driver.
* Alarms to create: RDS CPU/storage/connections, EC2 CPU/disk, 5xx rate (nginx), failed-payment webhooks, backup job success.
* Audit trail lives in the `AuditLog` table (logins, impersonation, payroll, attendance edits, role changes).

## 7. Go-live checklist
See `docs/SECURITY.md` and `docs/CHECKLIST.md` (pending integrations and known gaps).

# HBS Workspace – Architecture (Phase 1)
Monorepo: apps/web (Next.js 14 App Router), apps/api (NestJS 10 + Prisma 5 + MySQL 8), Redis/BullMQ (from Phase 8).

## Tenancy
Shared DB, tenantId on every tenant-owned table. tenantId comes ONLY from the verified JWT. Super Admin has tenantId=null.
"Open Dashboard" -> POST /api/super-admin/companies/:id/access issues a 1h token scoped to that tenant with impersonatedBy and writes an AuditLog row. Impersonated tokens are rejected on super-admin routes.

## Auth
bcrypt, 15m JWT, opaque refresh token (SHA-256 in DB), rotation per refresh, reuse revokes the family.

## ER (Phase 1)
Tenant 1-1 Company; Tenant 1-N Branch/Department/Designation/User/Role/AuditLog; User N-N Role (UserRole); Role N-N Permission (RolePermission); User 1-N RefreshToken.

## API (Phase 1)
POST /auth/register-company, /auth/login, /auth/refresh, /auth/logout; GET /auth/me
GET/POST /branches, /departments (permission-guarded, tenant-scoped)
GET /super-admin/companies; POST /super-admin/companies/:id/access

## Roadmap
Phases 2-11 per master prompt; one phase per commit/tag.

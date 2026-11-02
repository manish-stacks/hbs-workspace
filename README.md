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
- [ ] Phase 3: employees, departments, designations, roles
See docs/ARCHITECTURE.md.

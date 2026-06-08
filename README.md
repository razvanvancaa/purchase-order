# Purchase Order Management System

A full-stack web app for managing purchase orders through a multi-stage approval workflow. Built as a personal project to practice building real-world business applications with NestJS and Next.js.

## What it does

Employees submit purchase orders which then flow through a chain of approvals depending on amount and category. The system handles routing automatically — small orders skip certain stages, IT equipment goes through an IT review, and anyone in Finance and IT can't approve their own orders. Once fully approved, Finance invoices the order and it's marked as complete.

There's also a budget system where each employee has an annual spending cap. When a budget is close to being exceeded, orders get automatically rejected at submission. Employees can request a budget supplement from their manager directly through the app.

## Tech stack

**Backend — NestJS (Node.js)**

NestJS was chosen because it gives structure to a Node backend without being overly opinionated. The module system keeps things organized as the app grows. Key packages used:

- `@nestjs/typeorm` + TypeORM — database ORM with PostgreSQL. Using `synchronize: true` in dev so the schema updates automatically from entities
- `@nestjs/jwt` + `passport-jwt` — JWT-based auth with access tokens (1 day) and refresh tokens (7 days)
- `@nestjs/config` — reads `.env` files, injected everywhere via `ConfigService`
- `bcryptjs` — password hashing
- `nodemailer` — email notifications. In dev, it's wired to Mailtrap so no real emails get sent
- `@nestjs/swagger` — auto-generates API docs at `/api/docs`
- `class-validator` — DTO validation on incoming requests

**Database — PostgreSQL**

Standard relational setup. A few things worth noting:

- There's a database trigger (`trg_prevent_self_approval`) that blocks self-approval at the DB level, not just in the application layer. This means even if someone bypasses the API, the database itself rejects it.
- `pg_cron` is used to reset annual budgets on January 1st each year. The Docker image builds a custom PostgreSQL image with `postgresql-16-cron` installed.

**Frontend — Next.js 16 (App Router)**

Using the App Router with `'use client'` on interactive pages. Tailwind CSS for styling. A few things that were non-trivial:

- Dark mode works by toggling a `.dark` class on `<html>` and using `@custom-variant dark` in Tailwind v4 CSS. localStorage is guarded with `typeof window !== 'undefined'` to avoid SSR crashes
- Axios interceptors handle token refresh automatically — on a 401 response, it tries the refresh token before logging out
- The notification bell polls every 30 seconds. Managers also see budget supplement requests in their bell

**CI — GitHub Actions**

Two jobs: backend runs Jest tests then builds, frontend runs `next build`. The backend tests use direct service instantiation (`new PurchaseOrdersService(...)`) instead of NestJS's test module — this turned out to be more reliable when the project uses `moduleResolution: nodenext`.

## Application workflow

1. **Requester** submits a purchase order with title, amount, and category
2. The system decides the initial route:
   - Amount < €100 → skips manager, goes straight to Finance
   - IT Equipment + submitted by Manager → goes to IT first
   - Everything else → starts at Manager stage
3. **Manager** reviews and approves/rejects. If rejected, it goes back to the requester for rework
4. After manager approval, IT Equipment goes to **IT Representative**, others go straight to Finance
5. **Finance** makes the final call — can approve (which invoices it) or permanently reject
6. At any stage, the requester gets an email when their order status changes
7. Finance gets an email when an order reaches their stage

Self-approval is blocked at the IT and Finance stages. If you submitted the order, you can't also approve it.

## Budget system

Each user can have an annual spending limit set by an admin. When an order is invoiced, the used amount is updated. If submitting a new order would exceed the budget, it's automatically rejected immediately at submission with a reason.

Employees can request a budget supplement from the Profile page. The request goes to all managers via email and also shows up in the manager's in-app notification bell. Managers approve with a new limit or reject with a comment.

## Project structure

```
rinftech/
├── .github/
│   └── workflows/
│       └── ci.yml
├── backend/
│   └── po-backend/
│       ├── src/
│       │   ├── auth/
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── current-user.decorator.ts
│       │   │   ├── jwt-auth.guard.ts
│       │   │   ├── jwt.strategy.ts
│       │   │   ├── roles.decorator.ts
│       │   │   ├── roles.guards.ts
│       │   │   └── dto/
│       │   │       ├── login.dto.ts
│       │   │       └── register.dto.ts
│       │   ├── budgets/
│       │   │   ├── budget.entity.ts
│       │   │   ├── budget-request.entity.ts
│       │   │   ├── budgets.controller.ts
│       │   │   ├── budgets.module.ts
│       │   │   ├── budgets.service.ts
│       │   │   ├── budget-requests.controller.ts
│       │   │   ├── budget-requests.service.ts
│       │   │   └── dto/
│       │   │       └── set-budget.dto.ts
│       │   ├── database/
│       │   │   ├── database.module.ts
│       │   │   └── database.service.ts
│       │   ├── email/
│       │   │   ├── email.module.ts
│       │   │   ├── email.service.ts
│       │   │   └── notifications.service.ts
│       │   ├── po-history/
│       │   │   ├── po-history.entity.ts
│       │   │   └── po-history.module.ts
│       │   ├── purchase-orders/
│       │   │   ├── purchase-order.controller.ts
│       │   │   ├── purchase-order.entity.ts
│       │   │   ├── purchase-orders.module.ts
│       │   │   ├── purchase-orders.service.ts
│       │   │   ├── purchase-orders.service.spec.ts
│       │   │   └── dto/
│       │   │       ├── create-po.dto.ts
│       │   │       ├── reject-po.dto.ts
│       │   │       └── uptdate-po.dto.ts
│       │   ├── users/
│       │   │   ├── user.entity.ts
│       │   │   ├── users.controller.ts
│       │   │   ├── users-service.ts
│       │   │   ├── users.module.ts
│       │   │   └── dto/
│       │   │       ├── update-profile.dto.ts
│       │   │       └── uptdate-role.dto.ts
│       │   ├── app.controller.ts
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
├── frontend/
│   └── po-frontend/
│       ├── app/
│       │   ├── (auth)/
│       │   │   ├── layout.tsx
│       │   │   ├── login/page.tsx
│       │   │   └── register/page.tsx
│       │   ├── (dashboard)/
│       │   │   ├── layout.tsx
│       │   │   ├── admin/
│       │   │   │   ├── budgets/page.tsx
│       │   │   │   └── change-role/page.tsx
│       │   │   ├── approvals/page.tsx
│       │   │   ├── budget-requests/page.tsx
│       │   │   ├── dashboard/page.tsx
│       │   │   ├── profile/page.tsx
│       │   │   └── purchase-orders/
│       │   │       ├── page.tsx
│       │   │       ├── new/page.tsx
│       │   │       └── [id]/
│       │   │           ├── page.tsx
│       │   │           └── edit/page.tsx
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Navbar.tsx
│       │   │   └── Sidebar.tsx
│       │   ├── auth/
│       │   │   └── LoginForm.tsx
│       │   └── purchase-orders/
│       │       ├── ApprovalActions.tsx
│       │       ├── POForm.tsx
│       │       ├── POStatusBadge.tsx
│       │       └── POTimeline.tsx
│       ├── lib/
│       │   ├── api.ts
│       │   └── auth.ts
│       ├── types/
│       │   └── index.ts
│       ├── Dockerfile
│       ├── next.config.ts
│       └── package.json
├── postgres/
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Running locally

**Without Docker:**

```bash
# Backend
cd backend/po-backend
cp .env.example .env   # fill in DB credentials and Mailtrap SMTP
npm install
npm run start:dev

# Frontend
cd frontend/po-frontend
npm install
npm run dev            # runs on http://localhost:3001
```

**With Docker:**

```bash
docker-compose up --build
```

The Docker setup uses a custom PostgreSQL image with pg_cron enabled. Backend waits for the DB healthcheck before starting.

## Testing and CI

**Backend unit tests:**

```bash
cd backend/po-backend
npm run test
```

Tests are written with Jest and cover the core `PurchaseOrdersService` logic — routing decisions, self-approval blocking, status transitions, and budget enforcement. The tests use direct service instantiation (`new PurchaseOrdersService(...)`) rather than NestJS's test module. This avoids a class token mismatch that shows up with `moduleResolution: nodenext` in CI environments where the injected class reference can differ between modules.

**Frontend build check:**

```bash
cd frontend/po-frontend
npm run build
```

**CI pipeline (.github/workflows/ci.yml):**

Two jobs run in parallel on every push and pull request:

1. **backend-test** — installs dependencies, runs `npm test`, then `npm run build` inside `backend/po-backend`
2. **frontend-build** — installs dependencies and runs `next build` inside `frontend/po-frontend`

The frontend job runs a static export which exercises SSR pre-rendering, so any `window`/`localStorage` access that isn't guarded with `typeof window !== 'undefined'` will fail here, not just at runtime.

## Notes

- `synchronize: true` is fine for development but should be replaced with proper migrations before any production use
- The Mailtrap sandbox catches all outgoing emails in development — nothing goes to real inboxes
- The self-approval DB trigger runs independently of the application, so it acts as a safety net even if the service layer is bypassed
- Budget resets run via pg_cron on January 1st. If pg_cron isn't available (e.g. plain PostgreSQL without the extension), the app logs a warning and continues normally

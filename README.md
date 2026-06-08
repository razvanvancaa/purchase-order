# Purchase Order Management System

A full-stack web app for managing purchase orders through a multi-stage approval workflow. Built as a personal project to practice building real-world business applications with NestJS and Next.js.

## What it does

Employees submit purchase orders which then flow through a chain of approvals depending on amount and category. The system handles routing automatically — small orders skip certain stages, IT equipment goes through an IT review, and anyone in Finance and IT can't approve their own orders. Once fully approved, Finance invoices the order and it's marked as complete.

There's also a budget system where each employee has an annual spending cap. When a budget is close to being exceeded, orders get automatically rejected at submission. Employees can request a budget supplement from their manager directly through the app.

## Tech stack

### NestJS

NestJS is a Node.js framework built on top of Express that enforces a module-based architecture inspired by Angular. Each feature (purchase orders, budgets, auth, email) lives in its own module with a controller, service, and entity — this makes it easy to navigate and extend the codebase. It uses TypeScript decorators extensively for things like route definitions, dependency injection, and validation. The DI container handles wiring services together, so you rarely instantiate anything manually.

### TypeORM

TypeORM is the ORM used to talk to PostgreSQL. Entities are TypeScript classes decorated with column definitions, and TypeORM generates and runs the SQL queries. In development, `synchronize: true` means schema changes are applied automatically when the app starts, so there are no manual migration files to manage. Relations like `@ManyToOne` and `@OneToMany` map cleanly to foreign keys and allow eager or lazy loading of related data.

### PostgreSQL

PostgreSQL is the relational database backing the whole application. All purchase orders, users, budgets, and history records are stored here with proper foreign key constraints. The project uses two PostgreSQL-specific features beyond standard SQL: a trigger (`trg_prevent_self_approval`) that enforces self-approval prevention at the database level as a safety net, and the `pg_cron` extension that runs a scheduled SQL job on January 1st each year to reset annual budgets — without needing any application-level cron infrastructure.

### Next.js (App Router)

Next.js is the React framework used for the frontend. This project uses the App Router (introduced in Next.js 13), where each folder under `app/` becomes a route. Pages that need interactivity are marked with `'use client'` and run entirely in the browser — server components aren't used beyond layout wrappers. The app is built with `output: 'standalone'` for Docker, which bundles only the files needed to run the server, making the Docker image smaller.

### Tailwind CSS

Tailwind is a utility-first CSS framework where styling is done by composing small, single-purpose class names directly in the markup. There are no separate `.css` files per component — everything is inline in the JSX. The project uses Tailwind v4, which introduces `@custom-variant` for defining the dark mode variant and uses a CSS-first configuration instead of `tailwind.config.js`. Dark mode is implemented by toggling a `.dark` class on the `<html>` element and persisting the preference in localStorage.

### Axios

Axios is the HTTP client used by the frontend to call the backend API. All API calls go through a single configured Axios instance with a base URL and an interceptor that attaches the JWT access token to every request. A response interceptor handles token expiry: on a 401, it automatically tries to exchange the refresh token for a new access token before retrying the original request — if that also fails, it clears the session and redirects to login.

### JSON Web Tokens (JWT)

JWTs are used for authentication. After login, the backend issues two tokens: a short-lived access token (1 day) used to authorize API requests, and a longer-lived refresh token (7 days) used only to get a new access token when the first expires. The tokens are signed with a secret from the environment config and carry the user's ID, email, and role in the payload. `@nestjs/jwt` and `passport-jwt` handle signing, verification, and extracting the user from the token on protected routes.

### bcryptjs

bcryptjs is used to hash user passwords before storing them. When a user registers or changes their password, the plain-text password is hashed with a salt factor of 10. On login, `bcrypt.compare` checks the submitted password against the stored hash without ever needing to decrypt it. Using bcrypt (rather than a plain hash like SHA-256) means brute-force attacks are significantly slower because the algorithm is intentionally computationally expensive.

### Nodemailer

Nodemailer is the Node.js library used to send emails. It's configured with SMTP settings from the environment, and in development those settings point to Mailtrap — a sandbox service that accepts real SMTP connections but displays the emails in a web inbox instead of delivering them. The `EmailService` class wraps Nodemailer and exposes methods that compose and send specific emails (status change notifications, budget updates, finance alerts). If no `MAIL_HOST` is configured, it skips sending and just logs to the console.

### Mailtrap

Mailtrap is an email testing service that provides a sandbox SMTP server. Emails sent through it don't reach real inboxes — they show up in a Mailtrap inbox where you can inspect the HTML, headers, and content. It's used in development and in the Docker environment to catch all outgoing emails safely. This means you can test the full email-sending code path (nodemailer config, template rendering, SMTP handshake) without risking emails going to real users.

### Swagger (OpenAPI)

`@nestjs/swagger` auto-generates an interactive API documentation page at `/api/docs`. It scans the NestJS controllers and DTOs at startup and builds an OpenAPI spec from the decorators (`@ApiOperation`, `@ApiResponse`, `@ApiBody`). This makes it easy to explore and manually test all endpoints from the browser without needing a separate tool like Postman. It also serves as living documentation that stays in sync with the code.

### class-validator

class-validator is used to validate incoming request bodies. DTOs (Data Transfer Objects) are plain TypeScript classes with decorators like `@IsString()`, `@IsNumber()`, and `@IsEmail()` on their fields. NestJS's `ValidationPipe` runs these automatically on every request, rejecting invalid payloads with a structured 400 error before they ever reach the service layer. This keeps validation logic out of the services and co-located with the DTO definition.

### Jest

Jest is the test framework used for backend unit tests. The tests cover the `PurchaseOrdersService` — routing decisions, self-approval blocking, budget enforcement, and status transitions. Instead of using NestJS's built-in test module, the tests instantiate the service directly with mocked dependencies (`jest.fn()`). This approach was more reliable with `moduleResolution: nodenext`, where NestJS's DI token system can behave differently depending on how modules are resolved between the app and the test runner.

### Docker / Docker Compose

Docker is used to containerize the application for consistent local development and deployment. The `docker-compose.yml` defines three services: a custom PostgreSQL image with `pg_cron` pre-installed, the NestJS backend, and the Next.js frontend. The backend waits for a PostgreSQL healthcheck before starting. Environment variables (DB credentials, JWT secret, SMTP config) are passed directly in the Compose file rather than relying on `.env` files being present inside containers.

### GitHub Actions

GitHub Actions provides the CI pipeline. Two jobs run in parallel on every push: one runs the Jest test suite and then builds the backend, the other runs `next build` for the frontend. The frontend build acts as a type-check and catches any SSR issues — if a component accesses `window` or `localStorage` without a browser guard, the static pre-rendering step will fail. Keeping both jobs independent means a frontend issue doesn't block the backend test run and vice versa.

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

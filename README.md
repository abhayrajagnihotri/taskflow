# TaskFlow — Backend Project Management System

![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)
![Node.js](https://img.shields.io/badge/Node.js-22.x-green)
![Express](https://img.shields.io/badge/Express-5.2.1-lightgrey)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.0-blue)
![Prisma](https://img.shields.io/badge/Prisma-7.9.1-indigo)
![Redis](https://img.shields.io/badge/Redis-7.0-red)
![BullMQ](https://img.shields.io/badge/BullMQ-6.2.0-coral)
![Jest](https://img.shields.io/badge/Jest-30.4.2-brightgreen)

TaskFlow is a production-grade, multi-tenant project management REST API and asynchronous background job processing system built with Node.js, Express, TypeScript, PostgreSQL (Prisma 7), Redis, and BullMQ. 

The application provides secure multi-tenant organization isolation, Role-Based Access Control (RBAC), JWT authentication with refresh token rotation, organization member management, project & task lifecycle management, multi-criteria filtering, offset pagination, and resilient background email notification workers with exponential backoff retries and dead-letter queues (DLQ).

---

## 1. Overview

TaskFlow is designed around multi-tenant organization boundaries. Every user belongs to an organization with a specific role (`org_admin` or `member`). All project, task, and organization member data operations are strictly scoped to the user's organization.

### Key Capabilities:
* **Multi-Tenant Security**: Data lookups, member management, and job status inspections automatically verify organization context derived from server-side JWT database validation (`req.user.organizationId`).
* **Authentication & Token Rotation**: Secure registration, login, JWT access tokens (15m TTL), and SHA-256 hashed refresh tokens (7d TTL) with automatic rotation and revocation.
* **Member Management**: Organization members list, member details, adding new members, demoting/promoting roles (`org_admin` / `member`), and member removal with admin guardrails.
* **Projects & Tasks REST API**: Full CRUD capabilities, task status summary dashboard, multi-criteria filtering (`status`, `priority`, `assigneeId`, `dueFrom`, `dueTo`), and offset pagination (`(page - 1) * limit`).
* **Asynchronous Notification Queue**: Task assignments trigger background email notification jobs via BullMQ and Redis.
* **Fault-Tolerant Worker**: Independent worker process (`src/worker.ts`) handling job retries with exponential backoff (1s → 2s → 4s) and Dead-Letter Queue (DLQ) routing.
* **Compensating Consistency**: Prevents database-queue inconsistency by automatically deleting task assignments if queue enqueueing fails.

---

## 2. Assignment Requirements & Scope

This project was built to fulfill the **GrubPac TaskFlow Backend Developer Technical Assignment**:

* **Task 01 — Database Design & Implementation**: PostgreSQL schema with Prisma 7, 8 tables, 3 native enums, indexes, referential actions, and deterministic seed script.
* **Task 02 — Authentication & Authorization**: JWT access tokens, refresh token rotation, bcrypt password hashing (cost 12), RBAC (`org_admin` vs `member`), rate limiting.
* **Task 03 — Projects & Tasks REST API**: Project/Task CRUD, dashboard aggregation, offset pagination, filters, assignment management, cross-tenant 403 protection.
* **Task 04 — Background Jobs & Email Notifications**: Redis + BullMQ, `email-notifications` queue, `email-notifications-dlq`, exponential backoff retries, `GET /jobs/:id` status endpoint, Docker Compose API + Worker + Redis + Postgres.
* **Task 05 — Testing & API Documentation**: 41 automated Jest tests (100% pass rate) with dedicated test database (`taskflow_test`), OpenAPI 3.0 specification (`src/docs/openapi.json`), interactive Swagger UI (`GET /docs`), and importable Postman collection (`docs/TaskFlow.postman_collection.json`).
* **Member Management**: Organization membership listing, member adding, role updates, and member removal with RBAC and last-admin protections.

---

## 3. Technology Stack

* **Runtime & Language**: Node.js v22+ / TypeScript v5.9.3
* **Web Framework**: Express v5.2.1
* **Database & ORM**: PostgreSQL 16 / Prisma v7.9.1 with `@prisma/adapter-pg` SQL Driver Adapter
* **Cache & Message Queue**: Redis 7 / BullMQ v6.2.0 / ioredis v6.0.0
* **Security & Auth**: jsonwebtoken v9.0.3 / bcrypt v6.0.0 / helmet v8.3.0 / express-rate-limit v8.6.2
* **Validation**: Zod v4.4.3
* **Testing Stack**: Jest v30.4.2 / ts-jest v29.4.12 / Supertest v7.2.2
* **Containerization**: Docker & Docker Compose
* **API Documentation**: Swagger UI Express v5.0.1 / OpenAPI 3.0 / Postman Collection

---

## 4. Architecture Overview

### API Request Flow:
```text
Client ──► Express API ──► Middlewares ──► Controller ──► Service ──► Prisma 7 ──► PostgreSQL
```

### Async Task Assignment & Notification Flow:
```text
POST /tasks/:id/assignments
       │
       ▼
1. Validate Org Membership
       │
       ▼
2. Create DB Assignment
       │
       ▼
3. Enqueue BullMQ Job ──(If Queue Fails)──► Rollback / Delete DB Assignment
       │
       ▼
4. Respond 200 OK { jobId }
       │
       ▼ (Asynchronous)
Redis ("email-notifications") ──► Worker Process ──► Mock Email Logger
                                       │
                         (After 3 Retries Exhausted)
                                       │
                                       ▼
                       Redis ("email-notifications-dlq")
```

---

## 5. Repository Structure

```text
taskflow/
├── docs/
│   ├── ARCHITECTURE.md                  # Comprehensive Architecture Guide
│   └── TaskFlow.postman_collection.json # Importable Postman API Collection
├── prisma/
│   ├── migrations/                      # PostgreSQL Migration Files
│   │   └── 20260821112151_init/
│   │       └── migration.sql
│   ├── schema.prisma                    # Prisma 7 Database Schema
│   └── seed.ts                          # Database Seeding Script
├── src/
│   ├── config/                          # Environment & Redis Configurations
│   │   ├── env.ts
│   │   └── redis.ts
│   ├── docs/                            # OpenAPI 3.0 JSON Specification
│   │   └── openapi.json
│   ├── lib/                             # JWT & Prisma Instance Libraries
│   │   ├── jwt.ts
│   │   └── prisma.ts
│   ├── middleware/                      # Auth, RBAC, Error & Rate Limit Middlewares
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── rate-limit.middleware.ts
│   ├── modules/                         # Feature Modules (Controllers, Services, Routes, Validation)
│   │   ├── auth/
│   │   ├── jobs/
│   │   ├── notifications/
│   │   ├── orgs/
│   │   ├── projects/
│   │   └── tasks/
│   ├── queues/                          # BullMQ Queue & DLQ Instantiation
│   │   └── email.queue.ts
│   ├── types/                           # Ambient Type Declarations
│   ├── utils/                           # Errors, Password Hashing, Pagination Helpers
│   │   ├── errors.ts
│   │   ├── pagination.ts
│   │   └── password.ts
│   ├── app.ts                           # Express Application Definition
│   ├── server.ts                        # HTTP API Server Entry Point
│   └── worker.ts                        # Standalone Queue Worker Entry Point
├── tests/
│   ├── integration/                     # Auth, Member, Project, Task, Assignment & Security Integration Tests
│   ├── unit/                            # Auth, Assignment & Pagination Unit Tests
│   ├── import-meta-transformer.js       # Jest ESM AST Transformer
│   └── setup.ts                         # Test Database Isolation Setup
├── .env.example                         # Environment Variables Template
├── .gitignore                           # Git Exclude Configuration
├── Dockerfile                           # Production Docker Build File
├── docker-compose.yml                   # Docker Multi-Container Compose Config
├── jest.config.js                       # Jest Test Suite Configuration
├── package.json                         # Project Manifest & Scripts
├── prisma.config.ts                     # Prisma 7 Config File
└── tsconfig.json                        # TypeScript Configuration
```

---

## 6. Database Design

### Database Models (`prisma/schema.prisma`):

| Model Table | Description | Primary Key | Foreign Keys & Actions |
|---|---|---|---|
| `users` | User identity & credentials | `id` (UUID) | Unique email index |
| `organizations` | Multi-tenant organization boundaries | `id` (UUID) | - |
| `org_members` | Connects users to organizations with roles | `id` (UUID) | FK `organization_id` (`Cascade`), FK `user_id` (`Cascade`) |
| `projects` | Organization projects | `id` (UUID) | FK `organization_id` (`Cascade`) |
| `tasks` | Project tasks | `id` (UUID) | FK `project_id` (`Cascade`) |
| `task_assignments` | Task-to-User assignments | `id` (UUID) | FK `task_id` (`Cascade`), FK `user_id` (`Restrict`) |
| `comments` | User comments on tasks | `id` (UUID) | FK `task_id` (`Cascade`), FK `user_id` (`Restrict`) |
| `refresh_tokens` | Hashed refresh tokens for revocation | `id` (UUID) | FK `user_id` (`Cascade`), Unique `token_hash` index |

### Native Enums:
* `Role`: `org_admin`, `member`
* `Status`: `todo`, `in_progress`, `review`, `done`
* `Priority`: `low`, `medium`, `high`, `urgent`

---

## 7. Authentication & Authorization

* **Registration (`POST /auth/register`)**: Creates Organization, User, and assigns user as `org_admin` in an atomic Prisma transaction.
* **Login (`POST /auth/login`)**: Validates credentials via bcrypt, generates access token and raw refresh token, stores SHA-256 token hash in database.
* **Access Tokens**: Short-lived (15m) JWTs containing `sub: userId`.
* **Refresh Tokens**: Long-lived (7d) opaque tokens stored hashed in database. Rotating refresh tokens revokes the old token and issues a new pair.
* **Role-Based Access Control (RBAC)**:
  * `org_admin`: Full organization access including project deletion (`DELETE /projects/:id`) and member management (`POST /organizations/members`, `PATCH /organizations/members/:userId`, `DELETE /organizations/members/:userId`).
  * `member`: Read/write access to projects, tasks, and assignments, but cannot delete projects or administer organization members.

---

## 8. API Endpoints Table

| HTTP Method | Endpoint Path | Auth Required? | Purpose | Role Restriction |
|---|---|---|---|---|
| `POST` | `/auth/register` | No | Register new Org Admin & Organization | Public |
| `POST` | `/auth/login` | No | Login and acquire JWT access & refresh tokens | Public |
| `POST` | `/auth/refresh` | No | Rotate access & refresh tokens | Public |
| `POST` | `/auth/logout` | No | Revoke refresh token | Public |
| `GET` | `/organizations/members` | Yes | List members in user's organization | Member / Admin |
| `GET` | `/organizations/members/:userId` | Yes | Get member details by user ID | Member / Admin |
| `POST` | `/organizations/members` | Yes | Add member to user's organization | **`org_admin` Only** |
| `PATCH` | `/organizations/members/:userId` | Yes | Update member role (`org_admin` / `member`) | **`org_admin` Only** |
| `DELETE` | `/organizations/members/:userId` | Yes | Remove member from organization | **`org_admin` Only** |
| `POST` | `/projects` | Yes | Create project in user's organization | Member / Admin |
| `GET` | `/projects` | Yes | List projects in user's organization (paginated) | Member / Admin |
| `GET` | `/projects/:id` | Yes | Fetch project details by ID | Member / Admin |
| `PATCH` | `/projects/:id` | Yes | Update project details | Member / Admin |
| `DELETE` | `/projects/:id` | Yes | Delete project and associated tasks | **`org_admin` Only** |
| `GET` | `/projects/:id/dashboard` | Yes | Fetch task status count summary (`todo`, `in_progress`, `review`, `done`) | Member / Admin |
| `POST` | `/projects/:projectId/tasks` | Yes | Create task within project | Member / Admin |
| `GET` | `/projects/:projectId/tasks` | Yes | List project tasks with filters & pagination | Member / Admin |
| `GET` | `/tasks/:id` | Yes | Fetch single task details | Member / Admin |
| `PATCH` | `/tasks/:id` | Yes | Update task fields (status, priority, due date) | Member / Admin |
| `DELETE` | `/tasks/:id` | Yes | Delete task | Member / Admin |
| `POST` | `/tasks/:id/assignments` | Yes | Assign user to task & enqueue notification job | Member / Admin |
| `DELETE` | `/tasks/:id/assignments/:userId` | Yes | Unassign user from task | Member / Admin |
| `GET` | `/jobs/:id` | Yes | Fetch notification job status (`pending`, `active`, `completed`, `failed`) | Member / Admin |
| `GET` | `/docs` | No | Interactive Swagger UI API documentation | Public |

---

## 9. Task Filtering & Pagination

### Multi-Criteria Task Filtering (`GET /projects/:projectId/tasks`):
* `status`: Filter by status (`todo`, `in_progress`, `review`, `done`)
* `priority`: Filter by priority (`low`, `medium`, `high`, `urgent`)
* `assigneeId`: Filter tasks assigned to a specific user UUID
* `dueFrom` & `dueTo`: Filter tasks with due dates falling within an ISO date range

### Offset Pagination Formula:
$$\text{skip} = (\text{page} - 1) \times \text{limit}$$

* `page`: Default `1` (minimum `1`)
* `limit`: Default `20` (minimum `1`, maximum capped at `100`)

---

## 10. Background Jobs & Retry Mechanics

* **Queue Engine**: BullMQ with Redis backing.
* **Main Queue**: `email-notifications`
* **Dead-Letter Queue (DLQ)**: `email-notifications-dlq`
* **Retry Behavior**:
  * Total Attempts: `4` (1 initial attempt + 3 retries)
  * Backoff: `exponential` with `delay: 1000`
  * Execution Timeline: Initial attempt failure → **Retry #1 (1s)** → **Retry #2 (2s)** → **Retry #3 (4s)** → **Status: `failed`** → Pushed to DLQ.
* **Job Status Endpoint (`GET /jobs/:id`)**: Normalizes BullMQ internal states to `pending`, `active`, `completed`, or `failed`.

---

## 11. Compensating Consistency Strategy

When `POST /tasks/:id/assignments` is called:
1. Validates authenticated user, task organization scoping, and target user organization membership.
2. Creates the `task_assignments` DB record in PostgreSQL.
3. Attempts to enqueue the job into BullMQ (`emailQueue.add(...)`).
4. **Compensating Rollback**: If queue enqueueing fails (e.g. Redis unavailable), the service catches the error, **deletes the newly created DB assignment record**, and returns a `500 QUEUE_ENQUEUE_FAILED` server error.
5. **No PostgreSQL transaction is held open** while communicating with Redis.

---

## 12. Multi-Tenant Security

* **Organization Isolation**: Every data query includes `organization_id: req.user.organizationId`.
* **Zero Trust Client Input**: Organization IDs supplied in client request bodies, parameters, or headers are ignored. Organization context is derived strictly from server-side JWT token validation.
* **Cross-Tenant Security Response**: Attempting to access resources or member data belonging to another organization returns **`403 FORBIDDEN`** or **`404 MEMBER_NOT_FOUND`** without exposing sensitive resource details.

---

## 13. Testing Strategy

* **Framework**: Jest + ts-jest + Supertest.
* **Test Database Isolation**: Tests run against a dedicated test database (`DATABASE_URL_TEST="postgresql://taskflow:taskflow_password@localhost:5432/taskflow_test"`). The development database `taskflow` is **never modified or reset**.
* **Test Suite Results**:
  * Unit Tests: 11 tests across 3 suites
  * Integration Tests: 30 tests across 6 suites
  * Total Tests: **41 Passed / 0 Failed (100% Pass Rate)**
  * Statement Coverage: **~72.04%**

---

## 14. Local Development Setup

### Prerequisites:
* Node.js v22.x
* PostgreSQL 16 (or Docker)
* Redis 7 (or Docker)

### Installation Steps:
```bash
# 1. Clone repository and install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env

# 3. Start PostgreSQL and Redis via Docker Compose
docker compose up postgres redis -d

# 4. Apply Prisma migrations and seed database
npx prisma migrate deploy
npx prisma db seed

# 5. Start API Server (Terminal 1)
npm run dev

# 6. Start Worker Process (Terminal 2)
npm run worker
```

---

## 15. Running Tests & Validation Commands

```bash
# Run TypeScript compilation check (0 errors required)
npx tsc --noEmit

# Run complete Jest unit and integration test suite
npm test

# Run tests with code coverage report
npm run test:coverage
```

---

## 16. Swagger UI & Documentation Links

* **Interactive Swagger UI**: `http://localhost:3000/docs`
* **OpenAPI Specification**: `src/docs/openapi.json`
* **Postman Collection**: `docs/TaskFlow.postman_collection.json`

---

## 17. Docker Compose Orchestration

```bash
# Start all 4 services (PostgreSQL, Redis, API, Worker)
docker compose up --build -d

# View logs
docker compose logs -f

# Shutdown services
docker compose down
```

### Configured Services:
1. `postgres`: PostgreSQL 16 Alpine container (Port `5432:5432`)
2. `redis`: Redis 7 Alpine container (Port `6379:6379`)
3. `api`: Express REST API container (Port `3000:3000`, running `npm run start`)
4. `worker`: BullMQ background worker container (Running `npm run worker`)

---

## 18. Assignment Verification Checklist

* [x] **Task 01 — Database Design & Implementation**: COMPLETE (8 tables, 3 enums, seeds, migrations)
* [x] **Task 02 — Authentication & Authorization**: COMPLETE (JWT, refresh rotation, bcrypt, RBAC, rate limit)
* [x] **Task 03 — Projects & Tasks REST API**: COMPLETE (Project/Task CRUD, dashboard, filtering, pagination, 403 isolation)
* [x] **Task 04 — Background Jobs & Email Notifications**: COMPLETE (Redis, BullMQ, worker, retries, DLQ, compensating rollback, `/jobs/:id`)
* [x] **Task 05 — Testing & API Documentation**: COMPLETE (41 Jest tests, test DB isolation, Swagger UI at `/docs`, Postman collection)
* [x] **Member Management**: COMPLETE (`/organizations/members` CRUD endpoints, RBAC, org isolation, last admin guardrail)

---

## 19. License & Project Note

This software is developed as an assignment submission for the **GrubPac TaskFlow Backend Developer Technical Assignment**.

# AI SaaS Platform Backend

A modern, production-grade AI SaaS backend built with **NestJS 11**, **TypeScript**, **Prisma ORM 7**, and **PostgreSQL (Neon)**. It provides multi-provider LLM chat with Server-Sent Events (SSE) streaming, AI-powered web search, automated monthly subscription quotas, session-based authentication, and a comprehensive admin control panel.

---

## Features

- **Authentication & Sessions**:
  - JWT Access Token (15m) + Refresh Token rotation (7d) stored in PostgreSQL.
  - Multi-device login support with `logout` and `logout-all` session revocation.
  - Role-Based Access Control (`USER` & `ADMIN`).
- **User Profile Management**:
  - Profile retrieval with integrated plan and usage counters.
  - Update profile details and password changes with session invalidation.
  - Account deletion with cascading clean-up.
- **Subscriptions & Quota Enforcement**:
  - Dual plan architecture: `FREE` (50 requests/month) and `PREMIUM` (1,000 requests/month).
  - NestJS `UsageLimitGuard` protecting generative AI and web search endpoints.
  - Upgrade/downgrade endpoints with automatic limit recalculations.
- **AI Provider Management (Admin)**:
  - Multi-provider architecture supporting **OpenAI**, **Anthropic Claude**, and **Google Gemini** (plus OpenAI-compatible APIs like **Groq**).
  - AES-256 encrypted API key storage.
  - Dynamic fallback model resolution, default provider selection, and live health check ping tests.
- **Chat Module**:
  - Multi-turn conversation management with automatic title generation.
  - Standard JSON response (`POST /chat`) and real-time streaming via Server-Sent Events (`POST /chat/stream`).
  - Conversation and message history with cascading deletions.
- **AI Web Search**:
  - Zero-cost live search scraper using DuckDuckGo HTML endpoint (no paid search API keys needed).
  - 2-hour database query caching (`SearchCache`) to minimize redundant LLM token costs.
  - Query autocompletion suggestions and recent history tracking.
- **Admin Panel & Operations**:
  - Dashboard overview aggregated via optimized PostgreSQL queries.
  - User management (search, pagination, activate/deactivate, role promotions).
  - Subscription management with atomic override transactions.
  - Usage analytics with continuous timeseries trendlines and model breakdown.
  - Asynchronous HTTP request activity audit logging (`RequestLog` interceptor).
  - System health diagnostics (process uptime, memory heap stats, DB latency probe, and live AI provider pings).
- **Interactive Documentation**:
  - Complete **Swagger / OpenAPI 3.0** documentation with direct Bearer token testing at `/api/docs`.

---

## Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript (ESM)
- **Database & ORM**: PostgreSQL with Prisma ORM 7 (`@prisma/adapter-pg`)
- **Authentication**: JWT (`@nestjs/jwt`), bcryptjs
- **Security & Validation**: Helmet, class-validator, class-transformer
- **Documentation**: Swagger / OpenAPI 3.0 (`@nestjs/swagger`, `swagger-ui-express`)
- **Package Manager**: pnpm

---

## Getting Started

### 1. Prerequisites
- **Node.js**: `v20+` or `v22+`
- **pnpm**: `v9+` (or `npm i -g pnpm`)
- **PostgreSQL Database** (e.g. Neon, Supabase, or local PostgreSQL)

### 2. Clone the Repository
```bash
git clone https://github.com/FajlaRabby24/nestjs-backend-assignment.git
cd nestjs-backend-assignment
```

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Environment Variables
Create a `.env` file in the root directory:

```env
# Server
PORT=3000

# Database (PostgreSQL Connection String)
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# JWT Configuration
JWT_ACCESS_SECRET="your-super-secret-access-key-min-32-chars"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars"
JWT_REFRESH_EXPIRES_IN="7d"

# AES Encryption Key for AI Provider API Keys (32-character string)
ENCRYPTION_KEY="your-32-character-encryption-key!"
```

### 5. Database Setup & Migrations
```bash
# Apply migrations to database
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate
```

### 6. Running the Application
```bash
# Development (watch mode)
pnpm run dev

# Production build & run
pnpm run build
pnpm run start:prod
```

The server starts by default at `http://localhost:3000`.

---

## API Documentation

Once the backend is running, visit the interactive Swagger UI:

👉 **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

You can authorize requests directly in the Swagger UI using the **Authorize** button with a Bearer JWT token.

A complete Postman manual testing walkthrough is also available in [POSTMAN_TESTING_GUIDE.md](./POSTMAN_TESTING_GUIDE.md).

---

## API Endpoints Summary

### Authentication (`/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/auth/register` | Register a new user account | No |
| `POST` | `/auth/login` | Login and receive access & refresh tokens | No |
| `POST` | `/auth/refresh` | Refresh access token using active refresh token | No |
| `POST` | `/auth/logout` | Revoke current session | No |
| `POST` | `/auth/logout-all` | Revoke all active sessions across devices | Bearer JWT |

### User Profile (`/users`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/users/profile` | Get current user profile, subscription & quota | Bearer JWT |
| `PATCH` | `/users/profile` | Update profile (name, phone, avatar) | Bearer JWT |
| `PATCH` | `/users/change-password` | Change account password | Bearer JWT |
| `DELETE` | `/users/account` | Permanently delete account | Bearer JWT |

### Subscriptions & Quotas (`/subscriptions`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/subscriptions/status` | Get active subscription details and expiry | Bearer JWT |
| `GET` | `/subscriptions/remaining` | Get remaining monthly request quota | Bearer JWT |
| `POST` | `/subscriptions/upgrade` | Upgrade subscription to PREMIUM (1,000 req/mo) | Bearer JWT |
| `POST` | `/subscriptions/downgrade` | Downgrade subscription to FREE (50 req/mo) | Bearer JWT |

### AI Providers (`/ai-providers`) — Admin Only
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/ai-providers` | Configure a new AI provider (OpenAI, Claude, Gemini, Groq) | Admin JWT |
| `GET` | `/ai-providers` | List all configured providers | Admin JWT |
| `GET` | `/ai-providers/:id` | Get provider details by ID | Admin JWT |
| `PATCH` | `/ai-providers/:id` | Update provider configuration | Admin JWT |
| `DELETE` | `/ai-providers/:id` | Soft delete an AI provider | Admin JWT |
| `PATCH` | `/ai-providers/:id/toggle` | Enable or disable a provider | Admin JWT |
| `PATCH` | `/ai-providers/:id/set-default`| Set provider as default | Admin JWT |
| `GET` | `/ai-providers/:id/health` | Ping and check upstream provider connectivity | Admin JWT |

### Chat & Streaming (`/chat`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/chat` | Send prompt to AI (Standard JSON response) | Bearer JWT + Quota |
| `POST` | `/chat/stream` | Stream prompt response via Server-Sent Events (SSE) | Bearer JWT + Quota |
| `GET` | `/chat/conversations` | List user conversation history | Bearer JWT |
| `GET` | `/chat/conversations/:id/messages` | Get message history for conversation | Bearer JWT |
| `DELETE` | `/chat/conversations/:id` | Delete conversation and messages | Bearer JWT |

### AI Web Search (`/web-search`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/web-search` | Live web search scraper + AI synthesis | Bearer JWT + Quota |
| `GET` | `/web-search/history` | Get user search history | Bearer JWT |
| `GET` | `/web-search/recent` | Get recent unique search queries | Bearer JWT |
| `GET` | `/web-search/suggestions` | Search autocompletions for prefix | Bearer JWT |
| `DELETE` | `/web-search/history/:id` | Delete search history entry | Bearer JWT |

### Admin Panel (`/admin`) — Admin Only
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/admin/dashboard/stats` | Aggregated platform dashboard metrics | Admin JWT |
| `GET` | `/admin/users` | List users with pagination and search | Admin JWT |
| `PATCH` | `/admin/users/:id/status` | Activate or deactivate user | Admin JWT |
| `PATCH` | `/admin/users/:id/role` | Promote/demote user role (USER ⇄ ADMIN) | Admin JWT |
| `GET` | `/admin/subscriptions` | List subscriptions with filters and search | Admin JWT |
| `PATCH` | `/admin/subscriptions/:userId` | Manual override of user subscription plan | Admin JWT |
| `GET` | `/admin/analytics/usage` | Daily trendline metrics and provider breakdown | Admin JWT |
| `GET` | `/admin/logs/requests` | Chronological HTTP request audit logs | Admin JWT |
| `GET` | `/admin/system/health` | Diagnostic health (memory, uptime, DB, AI pings) | Admin JWT |

---

## Testing

```bash
# Run unit tests
pnpm run test

# Run e2e tests
pnpm run test:e2e

# Run test coverage
pnpm run test:cov
```

---

## License

UNLICENSED — Private and proprietary.

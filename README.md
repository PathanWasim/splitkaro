# 💰 SplitKaro

**Production-grade Group Expense Split & Settlement System** — India-first, UPI-based.

Built with Node.js/Express/TypeScript backend, PostgreSQL/Supabase database, and React/Vite frontend.

---

## Features

- **Multi-user Authentication** — JWT-based with bcrypt password hashing
- **Group Management** — Create, invite members, role-based access (admin/member)
- **Immutable Expense Ledger** — Expenses are never deleted; corrections create adjustment entries
- **Smart Split Types** — Equal, custom amounts, or percentage-based splits
- **Settlement Engine** — Greedy O(n log n) algorithm minimizes transactions
- **UPI Integration** — Deep links for instant mobile payments
- **Dashboard & Analytics** — Cross-group totals, monthly spending, top spenders
- **CSV Export** — Download expense data for record-keeping
- **Notifications** — In-app + email reminders for unpaid settlements
- **Fintech Security** — Input validation (Zod), rate limiting, Helmet.js, idempotency keys

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express 5 + TypeScript |
| Database | PostgreSQL (Supabase-ready) |
| Auth | Custom JWT + bcrypt |
| Validation | Zod v4 |
| Frontend | React 19 + Vite + TypeScript |
| Styling | Vanilla CSS (Catppuccin Mocha dark theme) |
| Email | Resend API |

---

## Project Structure

```
fintech/
├── server/                     # Backend
│   ├── src/
│   │   ├── config/             # DB pool, env validation, email
│   │   ├── middleware/         # Auth, validation, rate-limiter, group access
│   │   ├── modules/
│   │   │   ├── auth/           # Register, login, profile
│   │   │   ├── groups/         # CRUD, invite, role-based access
│   │   │   ├── expenses/       # Immutable ledger, splits, balances
│   │   │   ├── settlements/    # Idempotent creation, UPI links
│   │   │   ├── dashboard/      # Analytics, CSV export
│   │   │   └── notifications/  # In-app + email reminders
│   │   ├── utils/              # AppError, settlementEngine, UPI, CSV
│   │   ├── db/migrations/      # SQL migration files
│   │   ├── app.ts              # Express app setup
│   │   └── server.ts           # Entry point
│   └── package.json
│
├── client/                     # Frontend
│   ├── src/
│   │   ├── api/                # Axios client with JWT interceptor
│   │   ├── context/            # AuthContext with localStorage persistence
│   │   ├── components/Layout/  # Navbar + Outlet
│   │   ├── pages/              # 7 pages (Login, Register, Dashboard, etc.)
│   │   ├── utils/              # Currency & date formatting
│   │   ├── App.tsx             # Routes with protected/public guards
│   │   └── main.tsx            # Entry point
│   └── package.json
│
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Supabase project)

### 1. Setup Backend

```bash
cd server
npm install
cp .env.example .env    # Edit with your DB credentials
npm run dev             # Starts at http://localhost:3001
```

### 2. Run Migrations

Execute the SQL files in `server/src/db/migrations/` against your database in order (001 → 005).

### 3. Setup Frontend

```bash
cd client
npm install
npm run dev             # Starts at http://localhost:5173
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register |
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/auth/me` | Profile |
| PATCH | `/api/v1/auth/me` | Update profile |
| POST | `/api/v1/groups` | Create group |
| GET | `/api/v1/groups` | List groups |
| GET | `/api/v1/groups/:id` | Group detail |
| POST | `/api/v1/groups/:id/invite` | Invite member |
| POST | `/api/v1/groups/:id/expenses` | Add expense |
| GET | `/api/v1/groups/:id/expenses` | List expenses |
| GET | `/api/v1/groups/:id/expenses/balances` | Get balances |
| GET | `/api/v1/groups/:id/expenses/settlements` | Optimal settlements |
| POST | `/api/v1/groups/:id/settlements` | Create settlement |
| PATCH | `/api/v1/groups/:id/settlements/:sid` | Record payment |
| GET | `/api/v1/dashboard/summary` | User summary |
| GET | `/api/v1/dashboard/groups/:id/analytics` | Group analytics |
| GET | `/api/v1/dashboard/groups/:id/export` | CSV export |
| GET | `/api/v1/notifications` | Get notifications |
| POST | `/api/v1/notifications/groups/:id/reminders` | Send reminders |

---

## Settlement Algorithm

Uses a **greedy net-balance approach** to minimize the number of transactions:

1. Calculate net balance for each member (amount paid − amount owed)
2. Sort into debtors (negative balance) and creditors (positive balance)
3. Match largest debtor with largest creditor iteratively
4. Complexity: **O(n log n)** — handles groups of any size efficiently

---

## Security Considerations

- ✅ Parameterized SQL queries (no SQL injection)
- ✅ bcrypt password hashing (12 rounds)
- ✅ JWT tokens with expiry
- ✅ Input validation with Zod
- ✅ Rate limiting on auth + API routes
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Idempotency keys for settlements
- ✅ Environment variable validation at startup

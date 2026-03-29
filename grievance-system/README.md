# CareDesk — AI-Powered Customer Grievance Redressal System

A production-ready full-stack application that uses Anthropic Claude AI to intelligently classify, prioritize, and resolve customer grievances with a beautiful, hand-crafted UI.

---

## Features

- **AI Classification** — Auto-detects category, priority, and sentiment from grievance descriptions using Claude
- **AI Response Generation** — Generates empathetic, professional email responses for officers
- **Role-Based Access** — Customer, Officer, and Admin roles with JWT authentication
- **Real-Time Updates** — Socket.io broadcasts status changes to admin dashboard
- **SLA Monitoring** — Hourly cron job auto-escalates breached tickets
- **Email Notifications** — Acknowledgement, status updates, and resolution emails via Nodemailer
- **Full Timeline** — Every status change logged with author and timestamp
- **Internal Notes** — Officers and admins can add private notes to tickets
- **Analytics Dashboard** — Bar, Pie, and Line charts for grievance trends
- **CSV Export** — One-click export of all grievances
- **Responsive Design** — Mobile-friendly with hand-crafted CSS (no Tailwind/Bootstrap)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v6, Recharts, Axios |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (pg) |
| AI | Anthropic Claude (claude-opus-4-5) |
| Auth | JWT + bcrypt |
| Email | Nodemailer |
| Real-time | Socket.io |
| Scheduling | node-cron |
| Security | helmet, cors, express-rate-limit |

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Anthropic API key
- Gmail account (for email notifications, optional)

---

## Installation

### 1. Clone the repository
```bash
git clone <repo-url>
cd grievance-system
```

### 2. Set up the database
```bash
psql -U postgres -c "CREATE DATABASE grievance_db;"
psql -U postgres -d grievance_db -f database/schema.sql
```

### 3. Configure backend environment
```bash
cd backend
cp .env.example .env
# Edit .env with your values:
# - DATABASE_URL
# - JWT_SECRET (any random string)
# - ANTHROPIC_API_KEY
# - EMAIL_* (optional)
```

### 4. Install backend dependencies
```bash
cd backend
npm install
```

### 5. Install frontend dependencies
```bash
cd frontend
npm install
```

### 6. Create uploads directory (backend)
```bash
mkdir backend/uploads
```

### 7. Start development servers

**Backend** (terminal 1):
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Frontend** (terminal 2):
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

---

## API Endpoints

### Auth — `/api/auth`
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/register` | Register new user | Public |
| POST | `/login` | Login, returns JWT | Public |
| GET | `/me` | Get current user | Required |

### Grievances — `/api/grievances`
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Submit grievance | Public |
| GET | `/` | List all grievances | Admin/Officer |
| GET | `/:id` | Get by ticket ID | Public |
| PATCH | `/:id/status` | Update status | Admin/Officer |
| PATCH | `/:id/assign` | Assign officer | Admin |
| POST | `/:id/notes` | Add internal note | Admin/Officer |
| DELETE | `/:id` | Soft delete | Admin |

### Admin — `/api/admin`
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/stats` | Dashboard statistics | Admin |
| GET | `/officers` | List all officers | Admin |
| GET | `/export` | Export CSV | Admin |

### AI — `/api/ai`
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/suggest` | Generate response | Admin/Officer |
| POST | `/classify` | Classify grievance | Public |
| POST | `/summary` | Executive summary | Admin |

---

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@caredesk.in | Admin@123 |
| Officer | officer@caredesk.in | Officer@123 |
| Customer | Register via portal | — |

> **Note:** The seed passwords in schema.sql use bcrypt hashes. If login fails, run the seed script manually or register new accounts and update roles in the database.

---

## Folder Structure

```
grievance-system/
├── frontend/                  # React + Vite app
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route-level page components
│   │   ├── context/           # React context providers
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API service layer
│   │   └── styles/            # Global CSS + variables
│   └── vite.config.js
│
├── backend/                   # Node.js + Express API
│   ├── src/
│   │   ├── controllers/       # Route handler logic
│   │   ├── models/            # Database query functions
│   │   ├── routes/            # Express route definitions
│   │   ├── middleware/        # Auth, error, rate limiting
│   │   ├── services/          # AI, email, SLA, notifications
│   │   └── utils/             # Logger, ID generator
│   └── server.js
│
└── database/
    └── schema.sql             # PostgreSQL schema + seed data
```

---

## Environment Variables

```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/grievance_db
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
ANTHROPIC_API_KEY=sk-ant-...
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

---

## Security Features

- JWT authentication with 7-day expiry
- bcrypt password hashing (12 salt rounds)
- HTTP security headers via helmet
- CORS restricted to frontend origin
- Rate limiting: 100 req/15min general, 10 req/15min for AI
- Parameterized SQL queries (no injection risk)
- File upload validation (type + size)
- Soft deletes (data preserved)

---

## License

MIT

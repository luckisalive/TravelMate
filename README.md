# TravelMate ✈️🏨📊

> **The Unified Travel Planning, Booking, Multi-Currency Expense Management, and Group Debt Simplification Platform.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-00e599.svg)](https://neon.tech/)
[![Tests](https://img.shields.io/badge/Tests-391%20Passing-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-ISC-purple.svg)](LICENSE)

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Live Links](#-live-links)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Database Schema & Data Integrity](#-database-schema--data-integrity)
- [Tech Stack](#-tech-stack)
- [REST API Reference](#-rest-api-reference)
- [Quickstart (Local Development)](#-quickstart-local-development)
- [Production Deployment](#-production-deployment)
- [Free-Tier Resilience & Keep-Alive](#-free-tier-resilience--keep-alive)
- [Project Documentation & Academic Viva](#-project-documentation--academic-viva)
- [Attributions & License](#-attributions--license)

---

## 📌 Overview

**TravelMate** eliminates travel tool fragmentation by uniting all phases of trip management into a single, cohesive web platform. Traditional travel planning forces travelers to bounce between flight aggregators, hotel booking portals, note-taking apps, currency converters, and peer-to-peer expense splitters like Splitwise. 

TravelMate centralizes the entire lifecycle:
1. **Discover & Book:** Search verified hotels and reserve multi-modal transport (flights, trains, buses) with an interactive 180-seat aircraft cabin seatmap.
2. **Auto-Generate Itineraries:** Automatically schedule confirmed hotel check-ins and flight departures into an interactive day-by-day activity timeline.
3. **Multi-Currency Expense Tracking:** Log shared travel expenses across 30+ international currencies with live exchange rates from the European Central Bank (Frankfurter API) and immutable base currency snapshots.
4. **Greedy Debt Simplification:** Automatically calculate net balances among trip members and minimize multi-party debt transfers using an optimized $O(N \log N)$ algorithm.

Built from the ground up to operate reliably on zero-cost free cloud tiers (**Render**, **Vercel**, and **Neon PostgreSQL**), TravelMate incorporates enterprise-grade engineering practices including ACID row-level locking (`SELECT ... FOR UPDATE`), IDOR protection, connection pooling with keep-alive automation, and an automated verification suite containing **391 passing assertions**.

---

## 🌐 Live Links

| Service | Environment | URL |
| :--- | :--- | :--- |
| **Frontend Web App** | Vercel (Edge CDN) | [https://travel-mate-cyan-beta.vercel.app](https://travel-mate-cyan-beta.vercel.app) |
| **Backend REST API** | Render (Web Service) | [https://travelmate-api.onrender.com/api](https://travelmate-api.onrender.com/api) |
| **API Health & DB Probe** | Render | [https://travelmate-api.onrender.com/api/health](https://travelmate-api.onrender.com/api/health) |

---

## ✨ Key Features

### 🏨 Hotel Discovery & Booking
- Sourced from OpenStreetMap (Overpass API) across major travel hubs.
- Dynamic filtering by city, star rating (1–5 stars), price range, and amenities.
- Real-time stay duration calculations and instant booking confirmation linked to active trips.

### ✈️ Multi-Modal Transport & Real-Time Seatmap
- Integrated search across **flights**, **trains**, and **buses** with origin, destination, and date filters.
- **Interactive Cabin Seat Selection:** Visual 30-row x 6-seat (1A through 30F) seatmap for aircraft bookings.
- **Race Condition Immunity:** Uses PostgreSQL atomic row-level locks (`SELECT ... FOR UPDATE`) inside database transactions to prevent double-booking during concurrent user requests.
- Instant digital boarding pass generation upon checkout.

### 💱 Dual-Currency Expense Tracking
- Log expenses in native transaction currencies (USD, EUR, GBP, AED, JPY, INR, etc.).
- Daily automated exchange rate sync against the European Central Bank via Frankfurter API.
- **Immutable Financial Accounting:** Saves both the local transaction amount and a converted `amount_base` snapshot with the exact exchange rate used at transaction time.

### 🤝 Splitwise-Style Group Debt Simplification
- Supports equal splits and custom per-member allocations.
- Computes real-time net balances across all trip participants.
- **Greedy Min-Cash-Flow Algorithm:** Reduces complex $O(N^2)$ multilateral debt webs to the minimal possible number of transactions ($O(N \log N)$).
- One-click debt settlement logging with complete audit history and revert capabilities.

### 📅 Auto-Linked Dynamic Itinerary Planner
- Confirmed hotel stays and flight reservations automatically create corresponding entries in the day-wise itinerary.
- Manual activity scheduling with custom time tags and day reordering.
- Synchronization engine detects and links orphan bookings.

### 🧠 Travel Intelligence & Recommendation Engine
- **Cost Estimator:** Real-time budget tracking comparing cumulative bookings and expenses against total trip budget.
- **Smart Recommendations:** Ranks transport and hotel options based on user travel style (`cheapest`, `balanced`, or `comfort`).

### 🛡️ Enterprise Security & Integrity
- **Authentication:** Bcrypt password hashing (10 salt rounds) with stateless signed JWT tokens.
- **IDOR Protection:** Strict ownership and group membership checks ensure users cannot access or alter resources from trips they do not belong to.
- **SQL Injection Prevention:** Parameterized SQL queries across all PostgreSQL interactions.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Vercel Edge)"]
        UI["React 19 Single Page App<br/>Vite + TailwindCSS v4 + Lucide Icons"]
    end

    subgraph Backend ["Backend API Layer (Render)"]
        API["Express.js REST Engine<br/>Node.js 18+ (CORS & Auth Middleware)"]
        Cron["node-cron Service<br/>(Daily FX Sync & Warmup)"]
        Algo["Debt Simplification Engine<br/>(Greedy Min-Cash-Flow)"]
    end

    subgraph Database ["Persistence Layer (Neon)"]
        Postgres[("Neon Serverless PostgreSQL<br/>Connection Pooler + B-Tree Indexes<br/>Row-Level Locks (SELECT FOR UPDATE)")]
    end

    subgraph External ["External Services"]
        FX["Frankfurter API<br/>(European Central Bank Rates)"]
        OSM["OpenStreetMap / Overpass<br/>(Geospatial & Station Fixtures)"]
    end

    UI -->|HTTPS / REST + JWT| API
    API -->|Pooled Queries & Transactions| Postgres
    Cron -->|Daily Sync| FX
    FX -.->|Exchange Rate Matrix| Postgres
    OSM -.->|ETL Seed Pipeline| Postgres
    API --> Algo
```

---

## 🗄️ Database Schema & Data Integrity

The database is built on **Neon Lakebase PostgreSQL** across 15 relational tables with strict referential integrity (`ON DELETE CASCADE`), CHECK constraints, and specialized B-tree performance indexes:

```
├── Authentication & Profiles
│   ├── users                 (ID, name, email, password_hash, currency_pref, travel_style)
├── Reference & Inventory
│   ├── stations              (code, name, city, country, type: airport/rail/bus, lat, lon)
│   ├── hotels                (id, name, city, stars, price_per_night, rating, osm_id)
│   ├── transport_options     (id, mode, operator, number, origin_code, destination_code, departs_at, arrives_at)
│   └── seats                 (id, transport_id, seat_no, booking_id)
├── Trips & Memberships
│   ├── trips                 (id, name, created_by, start_date, end_date, budget, base_currency)
│   └── trip_members          (trip_id, user_id, role: owner/member, joined_at)
├── Bookings & Reviews
│   ├── bookings              (id, user_id, trip_id, hotel_id, transport_id, amount, amount_base, status)
│   └── reviews               (id, user_id, booking_id, rating, comment)
├── Financial & Group Expense Engine
│   ├── expenses              (id, trip_id, paid_by, category, amount, currency, amount_base, rate_used)
│   ├── expense_splits        (id, expense_id, user_id, amount_owed, amount_owed_base)
│   ├── settlements           (id, trip_id, from_user, to_user, amount, settled_at)
│   └── exchange_rates        (base, currency, rate, updated_at)
└── Planning & Alerts
    ├── itinerary_items       (id, trip_id, day_number, position, time, title, notes, booking_id)
    └── notifications         (id, user_id, type, message, is_read, scheduled_for)
```

---

## 💻 Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite 6 | Modern component architecture with lightning-fast HMR |
| **Styling** | Tailwind CSS v4 | Responsive utility-first modern design system |
| **Icons** | Lucide React | Clean, lightweight SVG icon package |
| **Backend** | Node.js, Express.js | High-performance modular REST API |
| **Database** | Neon PostgreSQL | Serverless PostgreSQL with autoscaling compute |
| **DB Client** | `pg` (node-postgres) | Connection-pooled client with transaction support |
| **Auth** | JWT & Bcrypt.js | Stateless authentication & salted password hashing |
| **Scheduler** | `node-cron` | Background recurring jobs for daily FX rate synchronization |
| **Testing** | Node.js Test Runner, Jest, Supertest | Comprehensive end-to-end integration and concurrency suite |
| **Deployment** | Vercel & Render | Continuous integration & cloud hosting with zero infrastructure cost |

---

## 📡 REST API Reference

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new user account.
- `POST /api/auth/login` — Authenticate and receive a JWT token.
- `GET /api/auth/me` — Retrieve the currently authenticated profile.
- `PATCH /api/auth/preferences` — Update preferred currency or travel style.

### 🗺️ Trips & Collaboration (`/api/trips`)
- `GET /api/trips` — List all trips created by or shared with the authenticated user.
- `POST /api/trips` — Create a new trip with budget and base currency.
- `GET /api/trips/:id` — Retrieve full trip details and participant list.
- `PUT /api/trips/:id` — Update trip dates, name, or budget.
- `DELETE /api/trips/:id` — Delete a trip (cascades to bookings, expenses, itinerary).
- `POST /api/trips/:id/members` — Add a companion to a collaborative group trip.

### 🏨 Hotels (`/api/hotels`)
- `GET /api/hotels` — Search hotels by city, rating, and price.
- `GET /api/hotels/:id` — Retrieve detailed hotel information and amenities.
- `GET /api/hotels/destinations` — Retrieve verified destination cities.

### 🚆 Transport & Seatmap (`/api/transport`)
- `GET /api/transport/search` — Query flights, trains, and buses by origin, destination, and mode.
- `GET /api/transport/:id` — Retrieve transport details and operator information.
- `GET /api/transport/:id/seats` — Fetch dynamic 180-seat grid with live reservation status.
- `POST /api/transport/:id/seats/reserve` — Atomic concurrency-safe seat booking.

### 🎟️ Bookings (`/api/bookings`)
- `GET /api/bookings` — View user's confirmed and completed reservations.
- `POST /api/bookings` — Create a hotel or transport booking linked to a trip.
- `PATCH /api/bookings/:id/cancel` — Cancel a booking and release any assigned seats.
- `PATCH /api/bookings/:id/complete` — Mark a booking completed (unlocks review capability).

### 💰 Expenses & Splits (`/api/expenses`)
- `GET /api/expenses/trip/:tripId` — List all expenses and split breakdowns for a trip.
- `POST /api/expenses` — Log a new multi-currency expense with equal or custom split.
- `PUT /api/expenses/:id` — Update an existing expense and recompute splits.
- `DELETE /api/expenses/:id` — Remove an expense entry.
- `GET /api/expenses/trip/:tripId/summary` — Retrieve category spend breakdown vs. budget.

### 🤝 Settlements (`/api/settlements`)
- `GET /api/settlements/trip/:tripId/balances` — Retrieve net balances and simplified debt transactions.
- `POST /api/settlements` — Record a debt settlement between two members.
- `GET /api/settlements/trip/:tripId/history` — View settlement history audit log.

### 📅 Itinerary Planner (`/api/itinerary`)
- `GET /api/itinerary/trip/:tripId` — Retrieve day-by-day activity schedule.
- `POST /api/itinerary/trip/:tripId` — Add an activity or destination visit.
- `POST /api/itinerary/trip/:tripId/sync-bookings` — Auto-link confirmed bookings into itinerary days.
- `POST /api/itinerary/trip/:tripId/reorder` — Reorder activities within a day.

### ⭐ Reviews & Notifications (`/api/reviews`, `/api/notifications`)
- `POST /api/reviews` — Submit a verified star rating and review for a completed booking.
- `GET /api/reviews/hotel/:hotelId` — View verified community reviews for a hotel.
- `GET /api/notifications` — List alerts and booking updates.
- `PATCH /api/notifications/:id/read` — Mark notification as read.

---

## 🚀 Quickstart (Local Development)

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **PostgreSQL Database** (a free instance at [neon.tech](https://neon.tech) or a local PostgreSQL instance)
- **Git**

### 2. Clone the Repository
```bash
git clone https://github.com/luckisalive/TravelMate.git
cd TravelMate
```

### 3. Backend Setup
```bash
cd backend

# Create environment file
cp .env.example .env
```

Edit `backend/.env` with your credentials:
```ini
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@ep-sample-pooler.neon.tech/travelmate?sslmode=require
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d
BASE_CURRENCY=INR
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

Install dependencies, run migrations, apply indexes, and seed reference data:
```bash
npm install
npm run db:migrate    # Runs schema.sql
npm run db:indexes    # Creates optimized B-tree indexes
npm run db:seed       # Populates stations, hotels, transport inventory, and seats
npm run dev           # Starts API server on http://localhost:5000
```

### 4. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev           # Starts Vite development server on http://localhost:5173
```
Visit `http://localhost:5173` in your browser.

### 5. Running the Test Suite
The backend contains an automated testing suite verifying all functionality, concurrency locks, IDOR security, and math calculations:
```bash
cd backend
npm test              # Executes all verification test suites (391 passing assertions)
```

---

## 🌐 Production Deployment

### Backend on [Render](https://render.com)
1. Fork or push this repository to your GitHub account.
2. In the Render Dashboard, click **New > Blueprint** and link your repository. Render will automatically detect [`render.yaml`](render.yaml).
3. Set the required secret environment variables:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string (including `?sslmode=require`).
   - `CORS_ORIGIN`: Your frontend URL (`https://<your-app>.vercel.app`).
4. Click **Apply**. The backend builds and exposes health checks at `/api/health`.

### Frontend on [Vercel](https://vercel.com)
1. In the Vercel Dashboard, click **Add New > Project** and import the repository.
2. Configure project settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
3. Add an Environment Variable:
   - `VITE_API_URL`: `https://<your-render-service>.onrender.com/api`
4. Click **Deploy**. SPA routing rewrites are pre-configured in [`frontend/vercel.json`](frontend/vercel.json).

---

## ⚡ Free-Tier Resilience & Keep-Alive

Render free tier instances spin down after 15 minutes of inactivity, and Neon compute scales to zero after 5 minutes. TravelMate includes three zero-cost solutions to eliminate cold starts during live demonstrations:

1. **GitHub Actions Keep-Alive Workflow:** The included workflow [`.github/workflows/keepalive.yml`](.github/workflows/keepalive.yml) automatically pings the backend `/api/health` endpoint every 14 minutes.
2. **CLI Warmup Script:** Warm up both Render container and Neon connection pool prior to a presentation:
   ```bash
   cd backend
   npm run keepalive https://travelmate-api.onrender.com
   ```
3. **Comprehensive Guide:** See [docs/KEEPALIVE_GUIDE.md](docs/KEEPALIVE_GUIDE.md) for full instructions on external uptime monitors (Cron-Job.org, UptimeRobot).

---


## 📜 Attributions & License

- **Geospatial & Accommodation Data:** © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL).
- **Exchange Rates:** [Frankfurter API](https://www.frankfurter.app/) (European Central Bank).

This project is licensed under the [MIT License](LICENSE).

# TravelMate — Viva Presentation & Demonstration Script

> **Target Duration:** 7–10 Minutes  
> **Target Audience:** External Examiners, Project Evaluators, Academic Faculty  
> **Project Scope:** Full-Stack Travel Planning, Hotel & Transport Booking, Multi-Currency Expense Management, and Splitwise Debt Simplification Platform  

---

## 1. Quick Reference & Demo Credentials

Have these credentials ready in a notepad or browser password manager prior to the demonstration:

| Persona | Email | Password | Role in Demo |
| :--- | :--- | :--- | :--- |
| **User A (Trip Organizer)** | `alice@example.com` | `Password123!` | Creates trips, books hotel & flight seat, logs shared expenses |
| **User B (Travel Companion)** | `bob@example.com` | `Password123!` | Added as trip member, participates in debt splitting and settlement |
| **User C (Solo Traveler)** | `charlie@example.com` | `Password123!` | Demonstrates IDOR access rejection and isolated user data |

**Live Deployment URLs:**
- **Frontend SPA (Vercel):** `https://travel-mate-cyan-beta.vercel.app`
- **Backend API (Render):** `https://travelmate-acy7.onrender.com`
- **Database:** Serverless Neon PostgreSQL (AWS Frankfurt / ap-southeast)
- **Local Fallback:** `http://localhost:3000` (Frontend) & `http://localhost:5000` (Backend)

---

## 2. Timed Viva Presentation Script (7 Minutes)

```mermaid
journey
    title 7-Minute Viva Presentation Flow
    section 00:00 - 01:00
      Problem & Architecture : 5: Speaker
    section 01:00 - 02:30
      Trip Creation & Booking : 5: Speaker
    section 02:30 - 04:00
      Currency & Splitwise : 5: Speaker
    section 04:00 - 05:15
      AI Intelligence & Itinerary : 5: Speaker
    section 05:15 - 06:00
      Concurrency, Security & Tests : 5: Speaker
    section 06:00 - 07:00
      Conclusion & Q&A : 5: Speaker
```

---

### [00:00 - 01:00] Introduction, Problem Statement & Architecture

**Spoken Script:**
> *"Good morning, esteemed examiners. Today, I am proud to present **TravelMate**, an end-to-end travel management and group financial settlement platform.*
>
> *Modern travelers face massive tool fragmentation: they search hotels on one site, book flights on another, track expenses in spreadsheets, and settle group debts on Splitwise. This fragmentation leads to lost itineraries, uncoordinated group budgets, and awkward debt calculations.*
>
> *TravelMate unifies this entire lifecycle under one unified architecture:*
> 1. *A responsive React 19 Single Page Application styled with Tailwind CSS v4 on Vercel.*
> 2. *A RESTful Node.js and Express API hosted on Render with token-based JWT security.*
> 3. *A relational Neon PostgreSQL database utilizing strict foreign keys, atomic transactions, and B-tree indexes.*
> 4. *Integration with OpenStreetMap geospatial data and Frankfurter's daily central bank exchange rates.*
>
> *Let us walk through a live, end-to-end trip workflow."*

---

### [01:00 - 02:30] Trip Creation, Hotel Booking & Flight Seat Selection

**Action:** Log in as `alice@example.com`. Open the Trips page and create a trip: **"Goa Beach Retreat"** (Budget: `₹45,000`, Base Currency: `INR`).

**Spoken Script:**
> *"Here on the Dashboard, Alice creates a new trip with a allocated budget. Notice how TravelMate enforces a base currency for this trip.*
>
> *Next, Alice books accommodations. Navigating to the **Hotels** module, we query real geospatial open data from OpenStreetMap. We can filter by star rating, budget constraints, and view amenities.*
> *When Alice confirms a booking, the system creates a booking record linked to her trip, immediately calculating the base currency equivalent.*
>
> *Now let us look at the **Transport** module. We support Flights, Trains, and Buses. For flights, TravelMate features an interactive, real-time cabin seatmap. Rows 1 to 30 feature standard 3x3 seating (A through F). Notice seats in red are already occupied.*
> *Alice selects Seat **3A**, confirms the booking, and instantly receives an interactive digital Boarding Pass complete with departure time, route details, and status."*

---

### [02:30 - 04:00] Financial Engine: Dual-Currency & Splitwise Debt Simplification

**Action:** Open the **Trip Detail View** > **Expenses** tab. Show Alice adding an expense in USD (`$100`) for Scuba Diving, splitting it equally between Alice and Bob. Then switch to the **Balances** tab.

**Spoken Script:**
> *"Now we enter the financial core of TravelMate. Group travel often involves multi-currency spending. Here, Alice paid $100 USD for scuba diving.*
> *Our backend currency worker syncs European Central Bank daily rates via Frankfurter. At expense creation time, our engine snaps the current exchange rate and computes `amount_base` immutably. This guarantees historical financial integrity even if rates fluctuate tomorrow.*
>
> *Notice our UI provides dual-currency visibility: displaying the primary spending currency and the home base currency (`$100 ≈ ₹8,400`).*
>
> *Now look at the **Balances** tab. Rather than maintaining an $O(N^2)$ web of pairwise debts where everyone pays everyone, our backend implements a **Greedy Debt Simplification Algorithm** running in $O(N \log N)$ time.*
> *By calculating net balances across all members and pairing the largest debtor with the largest creditor using dual max-heaps, we reduce the total cash flow transactions to at most $N-1$ payments.*
> *With a single click on **Settle Up**, Bob records a payment, updates the ledger, and zeros out the balances."*

---

### [04:00 - 05:15] Intelligent Services: Cost Estimator, Recommender & Auto-Itinerary

**Action:** Navigate to **Overview**, show the Cost Estimator card, the **Itinerary** tab with synced bookings, and the **Notifications** bell.

**Spoken Script:**
> *"TravelMate does not just log data—it provides trip intelligence:*
> 1. ***Trip Cost Estimator:** Analyzes trip duration, destination tier, and booked reservations, projecting total estimated expenditure and warning if the trip is on pace to exceed its budget.*
> 2. ***Travel Style Recommender:** Scores flights and hotels by user preference (`cheapest`, `balanced`, or `comfort`) using multi-attribute utility normalization.*
> 3. ***Auto-Linked Itinerary:** Every confirmed flight or hotel booking is automatically synced as a chronologically sorted activity in the Day-Wise Itinerary.*
> 4. ***Notification Center:** In-app notifications alert travelers of upcoming check-ins, departures, and pending debt settlements."*

---

### [05:15 - 06:00] Engineering Rigor: Concurrency, IDOR Security & Automated Tests

**Action:** Briefly show the terminal / test summary with all 391 assertions passing, or open `tests/phase10.test.js`.

**Spoken Script:**
> *"To ensure enterprise-grade reliability, we built an automated verification suite consisting of **391 test assertions** covering security and concurrency:*
>
> 1. ***Atomic Seat Booking Concurrency:** In airline booking, two users clicking the same seat simultaneously is a classic race condition. We solved this at the database level using PostgreSQL row-level locks and conditional atomic updates:*
>    `UPDATE seats SET booking_id = $1 WHERE transport_id = $2 AND seat_no = $3 AND booking_id IS NULL;`
>    *Our automated burst test fires simultaneous requests against identical seats: exactly 1 request receives HTTP 201 Created; all concurrent requests receive HTTP 409 Conflict without double-booking.*
>
> 2. ***IDOR Security Enforcement:** Insecure Direct Object References are prevented structurally. All resource access (trips, bookings, expenses) verifies user membership. An unauthorized user attempting to read, modify, or delete another user's itinerary or expenses is blocked with HTTP 404/403.*
>
> 3. ***Production Architecture:** The frontend is production-built on Vercel with clean SPA routing, and the backend is containerized on Render backed by Neon Serverless PostgreSQL with automated keep-alive health monitoring.*
>
> *Thank you. I welcome your questions."*

---

## 3. Examiner Defense & High-Yield Q&A

### Q1: Why did you choose Neon PostgreSQL instead of MongoDB?
**Answer:**
> *"TravelMate's core domain requires strict relational integrity and transactional guarantees. Airline seat allocation demands atomic transactions (`SELECT ... FOR UPDATE`) to avoid double-booking. Furthermore, group expense splitting requires relational integrity across `expenses` and `expense_splits`, where cascade rules and foreign keys protect against orphan records. MongoDB's document model lacks native relational constraints without complex application-level validation."*

### Q2: How does your debt simplification algorithm work, and what is its computational complexity?
**Answer:**
> *"We use a greedy two-pointer / min-max heap approach:
> 1. For each user, calculate net balance: $\text{Net} = \sum \text{Paid} - \sum \text{Owed}$.
> 2. Separate users into creditors ($\text{Net} > 0$) and debtors ($\text{Net} < 0$).
> 3. Iteratively take the largest debtor and the largest creditor, and settle the minimum of their absolute values: $\min(|\text{debt}|, |\text{credit}|)$.
> 4. Repeat until all balances reach 0.00.
> This reduces an arbitrary transaction graph with up to $\frac{N(N-1)}{2}$ edges to at most $N-1$ transactions in $O(N \log N)$ time."*

### Q3: How do you handle currency fluctuations in historical expenses?
**Answer:**
> *"We decouple current exchange rates from historical transactions. When an expense is recorded, the backend queries the database rate for that specific date from our `exchange_rates` cache, computes `amount_base = amount / rate_used`, and stores both `amount_base` and `rate_used` immutably on the expense record. If foreign exchange rates shift next month, past trip expenses and budget calculations remain 100% stable."*

### Q4: How did you prevent race conditions during seat booking?
**Answer:**
> *"We enforced safety at the database layer rather than relying on application memory. Inside a database transaction (`BEGIN ... COMMIT`), we execute an atomic conditional update:
> `UPDATE seats SET booking_id = $1 WHERE transport_id = $2 AND seat_no = $3 AND booking_id IS NULL RETURNING id;`
> If two requests run concurrently, PostgreSQL's row-level locking ensures that only the first transaction updates the row (`rowCount = 1`). The second transaction matches zero rows (`rowCount = 0`), triggers an immediate transaction rollback, and returns HTTP 409 Conflict."*

### Q5: How do you protect against IDOR (Insecure Direct Object Reference) vulnerabilities?
**Answer:**
> *"Every endpoint that takes a resource ID (e.g. `/api/trips/:id`, `/api/trips/:id/expenses`) verifies that the requesting `req.user.id` is either the trip creator or an authorized member in `trip_members`. If not, we return HTTP 404 Not Found rather than 403 Forbidden, preventing attackers from even enumerating valid resource IDs."*

### Q6: How do you handle Render's 15-minute free tier cold start during deployment?
**Answer:**
> *"Render spins down free web service instances after 15 minutes of inactivity. We mitigated this by:
> 1. Exposing a lightweight `/api/health` probe that returns a minimal JSON payload without heavy database overhead.
> 2. Implementing a GitHub Actions cron workflow (`.github/workflows/keepalive.yml`) and configuring external monitoring (e.g., UptimeRobot / Cron-job.org) to ping `/api/health` every 10–14 minutes.
> 3. Providing an automated local warmup script (`npm run keepalive`) to prime containers before live demonstrations."*

---

## 4. Emergency Backup & Fallback Strategy

If cloud connectivity or venue Wi-Fi becomes unstable during the viva:
1. **Local Demo Setup:** Both frontend and backend are completely self-contained. Open a terminal and run:
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```
2. Navigate to `http://localhost:3000`. The local client proxies directly to `localhost:5000` connected to Neon PostgreSQL.
3. Offline database seeds are pre-generated, so all features (hotels, flights, seats, expenses) function identically offline.

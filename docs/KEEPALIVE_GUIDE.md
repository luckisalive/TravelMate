# Keep-Alive & Free-Tier Resilience Guide

## 1. Overview & Cloud Constraints

TravelMate's production architecture is designed to run entirely on free cloud tiers without requiring credit card subscriptions or paid infrastructure:

| Component | Free Cloud Provider | Free Tier Limitation | Production Impact |
| :--- | :--- | :--- | :--- |
| **Backend API** | [Render](https://render.com) (Web Service) | Spins down instance after **15 minutes** of inactivity | First incoming request experiences a **30-50 second cold start** while container provisions |
| **Database** | [Neon](https://neon.tech) (Lakebase Postgres) | Compute automatically scales to zero after **5 minutes** of inactivity | First query after sleep incurs a **1-2 second latency** while Postgres compute resumes |
| **Frontend** | [Vercel](https://vercel.com) (Edge CDN) | Globally cached static SPA | Instantaneous delivery (0s cold start) |

During an academic viva or evaluation demo, an unannounced 45-second cold start while navigating the frontend can disrupt the demonstration flow. This guide provides three distinct zero-cost solutions to keep services primed and warm.

---

## 2. Keep-Alive Strategies

### Strategy A: Free External Uptime Monitor (Recommended for Hands-Off Operation)

External monitors send an automated HTTP `GET` request every 5 to 10 minutes, keeping both the Render container and Neon Postgres compute active throughout working hours.

#### Option 1: Cron-Job.org (100% Free, No Card Required)
1. Sign up for a free account at [cron-job.org](https://cron-job.org).
2. Click **Create Cronjob**.
3. Fill in:
   - **Title:** `TravelMate Keep-Alive`
   - **Address (URL):** `https://<your-app>.onrender.com/api/health`
   - **Schedule:** Every 10 minutes (`*/10 * * * *`).
4. Click **Save**.

#### Option 2: UptimeRobot (Free 5-Minute Ping)
1. Register at [uptimerobot.com](https://uptimerobot.com).
2. Click **Add New Monitor**.
3. Configure:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `TravelMate Render API`
   - **URL (or IP):** `https://<your-app>.onrender.com/api/health`
   - **Monitoring Interval:** Every 5 or 10 minutes.
4. Save the monitor.

---

### Strategy B: Automated GitHub Actions Workflow

The repository includes a ready-to-use GitHub Actions workflow at [`.github/workflows/keepalive.yml`](file:///.github/workflows/keepalive.yml).

- **Schedule:** Runs every 14 minutes via cron syntax (`*/14 * * * *`).
- **Manual Trigger:** Can be dispatched on-demand via the GitHub **Actions** tab.
- **Setup:**
  1. Push the code to your GitHub repository.
  2. Navigate to your GitHub repository **Settings** > **Secrets and variables** > **Actions**.
  3. Add a repository secret named `RENDER_API_URL` with your Render backend URL:
     `https://<your-app>.onrender.com/api/health`
  4. Enable GitHub Actions in your repository tab.

---

### Strategy C: CLI Warmup Script (Pre-Viva Instant Prep)

Before stepping into the viva examination room, run the built-in warm-up script from your local machine to guarantee that the server is warm:

```bash
# From the backend directory:
npm run keepalive https://<your-app>.onrender.com

# Example output:
# [Keep-Alive] Pinging target: https://travelmate-api.onrender.com/api/health
# [Keep-Alive] Status Code: 200
# [Keep-Alive] Response Time: 342ms
# [Keep-Alive] Health Payload: { status: 'ok', service: 'TravelMate API', timestamp: '...' }
# ✅ Service is warm, responsive, and ready!
```

---

## 3. Pre-Viva Examination Checklist (T-Minus 10 Minutes)

1. [ ] **Ping Backend:** Run `npm run keepalive <RENDER_URL>` 10 minutes prior to entering the exam room.
2. [ ] **Verify Database:** Open the live Vercel URL in your browser and log in with your demo account (`alice@example.com` or demo credentials).
3. [ ] **Confirm Search Queries:** Run one quick hotel search (e.g. `Mumbai`) and transport search to ensure Neon database compute has resumed and cache tables are primed.
4. [ ] **Inspect Console:** Open DevTools (F12) to verify no CORS errors or unexpected 401s occur.

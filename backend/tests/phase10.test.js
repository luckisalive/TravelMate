process.env.NODE_ENV = 'test';
require('dotenv').config();
const request = require('supertest');
const app = require('../server');
const db = require('../config/db');
const { getExchangeRate, convertToBase, convertFromBase } = require('../utils/currency');
const { syncExchangeRates } = require('../services/rateSyncService');

describe('TravelMate Phase 10 - Automated Verification & Integration Suite', () => {
  const testRunId = Date.now();
  let tokenAlice, userAlice;
  let tokenBob, userBob;
  let sampleFlight;

  afterAll(async () => {
    await db.pool.end();
  });

  describe('1. System Health & Infrastructure', () => {
    test('GET /api/health returns 200 and ok status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('TravelMate API');
    });

    test('Exchange rates table is populated with active rates', async () => {
      const dbRes = await db.query('SELECT COUNT(*) as count FROM exchange_rates');
      expect(parseInt(dbRes.rows[0].count, 10)).toBeGreaterThan(0);
    });
  });

  describe('2. User Setup for Security & Concurrency', () => {
    test('Registers User Alice (Owner)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice Supertest',
          email: `alice_super_${testRunId}@test.com`,
          password: 'Password123!',
        });
      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      tokenAlice = res.body.token;
      userAlice = res.body.user;
    });

    test('Registers User Bob (Intruder)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Bob Supertest',
          email: `bob_super_${testRunId}@test.com`,
          password: 'Password123!',
        });
      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      tokenBob = res.body.token;
      userBob = res.body.user;
    });
  });

  describe('3. Concurrency Test: Simultaneous Flight Seat Bookings (ADR-005)', () => {
    let raceSeatNo;

    test('Finds an active flight with available unreserved seats', async () => {
      const flightRes = await request(app).get('/api/transport?mode=flight&limit=1');
      expect(flightRes.status).toBe(200);
      expect(flightRes.body.data.transports.length).toBeGreaterThan(0);
      sampleFlight = flightRes.body.data.transports[0];

      const seatRes = await request(app).get(`/api/transport/${sampleFlight.id}/seats`);
      expect(seatRes.status).toBe(200);
      const avail = seatRes.body.data.seats.filter((s) => s.is_available);
      expect(avail.length).toBeGreaterThan(0);
      raceSeatNo = avail[0].seat_no;
    });

    test('Simultaneous booking requests for identical seat: exactly one 201, exactly one 409', async () => {
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/bookings/transport')
          .set('Authorization', `Bearer ${tokenAlice}`)
          .send({ transport_id: sampleFlight.id, seat_no: raceSeatNo, passenger_name: 'Alice' }),
        request(app)
          .post('/api/bookings/transport')
          .set('Authorization', `Bearer ${tokenBob}`)
          .send({ transport_id: sampleFlight.id, seat_no: raceSeatNo, passenger_name: 'Bob' }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);

      const winningRes = res1.status === 201 ? res1 : res2;
      const losingRes = res1.status === 409 ? res1 : res2;

      expect(winningRes.body.data.booking.status).toBe('confirmed');
      expect(losingRes.body.error.message).toMatch(/already booked/i);

      // Verify DB lock assignment
      const dbCheck = await db.query(
        'SELECT booking_id FROM seats WHERE transport_id = $1 AND seat_no = $2',
        [sampleFlight.id, raceSeatNo]
      );
      expect(dbCheck.rows[0].booking_id).toBe(winningRes.body.data.booking.id);
    });

    test('Subsequent booking attempt for booked seat returns 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/bookings/transport')
        .set('Authorization', `Bearer ${tokenBob}`)
        .send({ transport_id: sampleFlight.id, seat_no: raceSeatNo, passenger_name: 'Bob Retry' });
      expect(res.status).toBe(409);
    });
  });

  describe('4. IDOR Security Tests: Unauthorized Access Controls (ADR-010)', () => {
    let tripAliceId, hotelBookingAliceId, expenseAliceId, notifAliceId;

    beforeAll(async () => {
      // Alice creates a private trip
      const tripRes = await request(app)
        .post('/api/trips')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          name: "Alice Private Trip",
          start_date: '2026-11-01',
          end_date: '2026-11-05',
          budget: 25000,
        });
      tripAliceId = tripRes.body.data.id;

      // Alice creates a hotel booking
      const hotelRes = await request(app).get('/api/hotels?limit=1');
      const h = hotelRes.body.data.hotels[0];
      const bookRes = await request(app)
        .post('/api/bookings/hotel')
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          hotel_id: h.id,
          trip_id: tripAliceId,
          check_in: '2026-11-01',
          check_out: '2026-11-03',
          rooms: 1,
        });
      hotelBookingAliceId = bookRes.body.data.booking.id;

      // Alice logs an expense
      const expRes = await request(app)
        .post(`/api/trips/${tripAliceId}/expenses`)
        .set('Authorization', `Bearer ${tokenAlice}`)
        .send({
          description: 'Spa Service',
          amount: 3000,
          currency: 'INR',
          category: 'Activity',
          date: '2026-11-02',
        });
      expenseAliceId = expRes.body.data.id;

      // Alice notification
      const nRes = await db.query(
        'INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3) RETURNING id',
        [userAlice.id, 'general', 'Secret Alert']
      );
      notifAliceId = nRes.rows[0].id;
    });

    test('IDOR: Bob cannot read Alice private trip', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripAliceId}`)
        .set('Authorization', `Bearer ${tokenBob}`);
      expect(res.status).toBe(404);
    });

    test('IDOR: Bob cannot update Alice trip settings', async () => {
      const res = await request(app)
        .put(`/api/trips/${tripAliceId}`)
        .set('Authorization', `Bearer ${tokenBob}`)
        .send({ name: 'Hacked by Bob' });
      expect([403, 404]).toContain(res.status);
    });

    test('IDOR: Bob cannot delete Alice trip', async () => {
      const res = await request(app)
        .delete(`/api/trips/${tripAliceId}`)
        .set('Authorization', `Bearer ${tokenBob}`);
      expect([403, 404]).toContain(res.status);
    });

    test('IDOR: Bob cannot access Alice trip balances', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripAliceId}/balances`)
        .set('Authorization', `Bearer ${tokenBob}`);
      expect(res.status).toBe(404);
    });

    test('IDOR: Bob cannot access Alice trip itinerary', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripAliceId}/itinerary`)
        .set('Authorization', `Bearer ${tokenBob}`);
      expect(res.status).toBe(404);
    });

    test('IDOR: Bob cannot add expenses to Alice trip', async () => {
      const res = await request(app)
        .post(`/api/trips/${tripAliceId}/expenses`)
        .set('Authorization', `Bearer ${tokenBob}`)
        .send({ description: 'Intruder Expense', amount: 100, currency: 'INR', category: 'Food' });
      expect(res.status).toBe(404);
    });

    test('IDOR: Bob cannot read or modify Alice booking', async () => {
      const getRes = await request(app)
        .get(`/api/bookings/${hotelBookingAliceId}`)
        .set('Authorization', `Bearer ${tokenBob}`);
      expect(getRes.status).toBe(404);

      const cancelRes = await request(app)
        .patch(`/api/bookings/${hotelBookingAliceId}/cancel`)
        .set('Authorization', `Bearer ${tokenBob}`);
      expect(cancelRes.status).toBe(404);
    });

    test('IDOR: Bob cannot read or delete Alice notification', async () => {
      const readRes = await request(app)
        .patch(`/api/notifications/${notifAliceId}/read`)
        .set('Authorization', `Bearer ${tokenBob}`);
      expect(readRes.status).toBe(404);

      const delRes = await request(app)
        .delete(`/api/notifications/${notifAliceId}`)
        .set('Authorization', `Bearer ${tokenBob}`);
      expect(delRes.status).toBe(404);
    });
  });

  describe('5. SQL Injection Resilience Tests', () => {
    test('Protects against SQL injection in hotel city filter', async () => {
      const res = await request(app).get("/api/hotels?city=' OR '1'='1");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.hotels)).toBe(true);
    });

    test('Protects against DROP TABLE injection in hotel search', async () => {
      const res = await request(app).get("/api/hotels?search='; DROP TABLE users; --");
      expect(res.status).toBe(200);

      const dbCheck = await db.query('SELECT COUNT(*) as count FROM users');
      expect(parseInt(dbCheck.rows[0].count, 10)).toBeGreaterThan(0);
    });

    test('Protects against SQL injection in transport origin/destination filters', async () => {
      const res = await request(app).get("/api/transport?origin=' OR 1=1 --&destination=DEL");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.transports)).toBe(true);
    });
  });

  describe('6. Currency Conversion & Stale-Rate Fallback (Money Tests)', () => {
    test('convertToBase correctly formats INR base currency without loss', async () => {
      const res = await convertToBase(2499.99, 'INR');
      expect(res.currency).toBe('INR');
      expect(res.rate_used).toBe(1.0);
      expect(res.amount_base).toBe(2499.99);
    });

    test('convertToBase rejects negative and non-numeric values', async () => {
      await expect(convertToBase(-50, 'INR')).rejects.toThrow();
      await expect(convertToBase('not_a_number', 'INR')).rejects.toThrow();
    });

    test('convertFromBase correctly converts base INR to target currency', async () => {
      const inrRes = await convertFromBase(5000, 'INR');
      expect(inrRes.amount).toBe(5000.0);
      expect(inrRes.rate_used).toBe(1.0);

      const usdRes = await convertFromBase(5000, 'USD');
      expect(usdRes.currency).toBe('USD');
      expect(usdRes.amount).toBeGreaterThan(0);
      expect(usdRes.rate_used).toBeGreaterThan(0);
    });

    test('Stale-rate fallback returns valid rate for foreign currencies', async () => {
      const eurRate = await getExchangeRate('EUR');
      expect(typeof eurRate).toBe('number');
      expect(eurRate).toBeGreaterThan(0);
    });

    test('Pegged AED rate computes as USD * 3.6725', async () => {
      const usdRate = await getExchangeRate('USD');
      const aedRate = await getExchangeRate('AED');
      expect(Math.abs(aedRate - (usdRate * 3.6725))).toBeLessThan(0.01);
    });

    test('syncExchangeRates executes and syncs rates successfully', async () => {
      const syncRes = await syncExchangeRates();
      expect(syncRes.success).toBe(true);
      expect(syncRes.insertedCount).toBeGreaterThan(0);
    });
  });
});

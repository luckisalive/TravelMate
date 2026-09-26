process.env.NODE_ENV = 'test';
require('dotenv').config();
const http = require('http');
const app = require('../server');
const db = require('../config/db');
const RecommenderService = require('../services/recommenderService');
const EstimatorService = require('../services/estimatorService');
const NotificationService = require('../services/notificationService');

const TEST_PORT = 5005;
let server;

function makeRequest(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'localhost',
      port: TEST_PORT,
      path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('============================================================');
  console.log('🧪 Running Phase 8 Additional Services & Intelligence Tests');
  console.log('============================================================\n');

  let passedAssertions = 0;
  const trackAssert = (cond, msg) => {
    assert(cond, msg);
    passedAssertions++;
  };

  try {
    // -------------------------------------------------------------
    // 1. Recommender Service Unit Tests (ADR-009 & PRD Section 10)
    // -------------------------------------------------------------
    console.log('Testing Recommender Scoring Formulas & Weights (ADR-009)...');

    const sampleHotels = [
      { id: 1, name: 'Budget Inn', city: 'Goa', stars: 2.0, rating: 3.5, price_per_night: 1000 },
      { id: 2, name: 'Comfort Resort', city: 'Goa', stars: 4.0, rating: 4.5, price_per_night: 3500 },
      { id: 3, name: 'Grand Luxury Villa', city: 'Goa', stars: 5.0, rating: 4.9, price_per_night: 5500 },
    ];

    const cheapestRanked = RecommenderService.scoreHotels(sampleHotels, 'cheapest');
    trackAssert(cheapestRanked[0].id === 1, 'Cheapest style ranks Budget Inn at #1');
    trackAssert(cheapestRanked[0].recommendation.rank === 1, 'Top pick has rank 1');
    trackAssert(cheapestRanked[0].recommendation.is_top_pick === true, 'Top pick marked as top pick');
    trackAssert(typeof cheapestRanked[0].recommendation.rationale === 'string', 'Top pick contains one-line rationale');

    const comfortRanked = RecommenderService.scoreHotels(sampleHotels, 'comfort');
    trackAssert(comfortRanked[0].id === 3, 'Comfort style ranks Grand Luxury Villa at #1');
    trackAssert(comfortRanked[0].recommendation.score > 0, 'Score is positive numeric value');

    const balancedRanked = RecommenderService.scoreHotels(sampleHotels, 'balanced');
    trackAssert(balancedRanked.length === 3, 'Balanced style returns all candidate options scored');

    // -------------------------------------------------------------
    // Setup Test Users & Trips
    // -------------------------------------------------------------
    console.log('\nSetting up test users...');
    const timestamp = Date.now();
    const userAEmail = `p8_alice_${timestamp}@test.com`;
    const userBEmail = `p8_bob_${timestamp}@test.com`;

    const regA = await makeRequest('/api/auth/register', { method: 'POST' }, {
      name: 'Alice P8',
      email: userAEmail,
      password: 'Password123!',
      currency_pref: 'INR',
      travel_style: 'balanced',
    });
    trackAssert(regA.status === 201, 'User A registered with 201 Created');
    const tokenA = regA.body.token;
    const userA = regA.body.user;

    const regB = await makeRequest('/api/auth/register', { method: 'POST' }, {
      name: 'Bob P8',
      email: userBEmail,
      password: 'Password123!',
      currency_pref: 'USD',
      travel_style: 'comfort',
    });
    trackAssert(regB.status === 201, 'User B registered with 201 Created');
    const tokenB = regB.body.token;
    const userB = regB.body.user;

    // -------------------------------------------------------------
    // 2. Recommender API Endpoints
    // -------------------------------------------------------------
    console.log('\nTesting Recommendation API Endpoints...');

    const recHotels = await makeRequest('/api/recommendations/hotels?city=Goa&style=cheapest');
    trackAssert(recHotels.status === 200, 'GET /api/recommendations/hotels returns 200 OK');
    trackAssert(recHotels.body.success === true, 'Response success is true');
    trackAssert(Array.isArray(recHotels.body.top_picks), 'top_picks is an array');
    trackAssert(recHotels.body.top_picks.length <= 3, 'top_picks returns at most 3 items');
    trackAssert(recHotels.body.travel_style === 'cheapest', 'Response confirms requested travel_style');

    const recTransport = await makeRequest('/api/recommendations/transport?destination=GOI&style=comfort');
    trackAssert(recTransport.status === 200, 'GET /api/recommendations/transport returns 200 OK');
    trackAssert(Array.isArray(recTransport.body.data), 'Transport recommendations data is array');

    // -------------------------------------------------------------
    // 3. Trip Cost Estimator
    // -------------------------------------------------------------
    console.log('\nTesting Trip Cost Estimator (PRD Section 10)...');

    const estReq = await makeRequest('/api/estimator/estimate', { method: 'POST' }, {
      city: 'Goa',
      days: 5,
      budget: 20000,
    });
    trackAssert(estReq.status === 200, 'POST /api/estimator/estimate returns 200 OK');
    trackAssert(estReq.body.data.packages.cheapest !== undefined, 'Cheapest package calculated');
    trackAssert(estReq.body.data.packages.balanced !== undefined, 'Balanced package calculated');
    trackAssert(estReq.body.data.packages.comfort !== undefined, 'Comfort package calculated');

    const cheapPkg = estReq.body.data.packages.cheapest;
    const balPkg = estReq.body.data.packages.balanced;
    const comfPkg = estReq.body.data.packages.comfort;

    trackAssert(cheapPkg.breakdown.total_estimate > 0, 'Cheapest total estimate is positive');
    trackAssert(balPkg.breakdown.total_estimate >= cheapPkg.breakdown.total_estimate, 'Balanced total >= Cheapest total');
    trackAssert(comfPkg.breakdown.total_estimate >= balPkg.breakdown.total_estimate, 'Comfort total >= Balanced total');
    trackAssert(typeof cheapPkg.budget_comparison.is_over_budget === 'boolean', 'Budget comparison is_over_budget is boolean');

    // Test with low budget to trigger warning
    const estLowBudget = await makeRequest('/api/estimator/estimate', { method: 'POST' }, {
      city: 'Goa',
      days: 7,
      budget: 1000, // unrealistically low budget
    });
    trackAssert(estLowBudget.body.data.packages.comfort.budget_comparison.is_over_budget === true, 'Underfunded trip flags is_over_budget: true');
    trackAssert(typeof estLowBudget.body.data.packages.comfort.budget_comparison.warning === 'string', 'Over-budget warning message provided');

    // -------------------------------------------------------------
    // 4. In-App Notification Center
    // -------------------------------------------------------------
    console.log('\nTesting In-App Notification Center...');

    const notifInit = await makeRequest('/api/notifications', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    trackAssert(notifInit.status === 200, 'GET /api/notifications returns 200 OK');
    trackAssert(Array.isArray(notifInit.body.data), 'Notifications is array');
    trackAssert(typeof notifInit.body.unread_count === 'number', 'Unread count is numeric');

    // Manually create a notification via service
    const createdNotif = await NotificationService.createNotification({
      userId: userA.id,
      type: 'trip',
      message: 'Test alert: Your vacation begins soon!',
    });
    trackAssert(createdNotif !== null, 'Notification created successfully via service');

    // Fetch notifications again
    const notifAfter = await makeRequest('/api/notifications', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    trackAssert(notifAfter.body.unread_count >= 1, 'Unread count reflects new notification');
    const targetNotif = notifAfter.body.data.find((n) => n.id === createdNotif.id);
    trackAssert(targetNotif !== undefined, 'Created notification found in user list');
    trackAssert(targetNotif.is_read === false, 'Notification is initially unread');

    // Mark single notification as read
    const markReadRes = await makeRequest(`/api/notifications/${targetNotif.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    trackAssert(markReadRes.status === 200, 'PATCH /api/notifications/:id/read returns 200 OK');
    trackAssert(markReadRes.body.data.is_read === true, 'Notification is marked read');

    // IDOR test: User B cannot mark or delete User A's notification
    const idorNotif = await makeRequest(`/api/notifications/${targetNotif.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    trackAssert(idorNotif.status === 404, 'User B modifying User A notification rejected with 404 (IDOR protected)');

    // Mark all as read
    const markAllRes = await makeRequest('/api/notifications/read-all', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    trackAssert(markAllRes.status === 200, 'PATCH /api/notifications/read-all returns 200 OK');
    trackAssert(markAllRes.body.unread_count === 0, 'Unread count is 0 after mark-all');

    // Delete notification
    const deleteNotifRes = await makeRequest(`/api/notifications/${targetNotif.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    trackAssert(deleteNotifRes.status === 200, 'DELETE /api/notifications/:id returns 200 OK');

    // -------------------------------------------------------------
    // 5. Day-wise Itinerary Planner & Auto-Linking Bookings
    // -------------------------------------------------------------
    console.log('\nTesting Day-Wise Itinerary Planner & Auto-Linking...');

    // Create a trip for User A
    const tripRes = await makeRequest('/api/trips', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    }, {
      name: 'Goa Phase 8 Adventure',
      start_date: '2026-11-10',
      end_date: '2026-11-14',
      budget: 40000,
    });
    trackAssert(tripRes.status === 201, 'Test trip created with 201 Created');
    const tripId = tripRes.body.data.id;

    // Fetch initial itinerary
    const initItin = await makeRequest(`/api/trips/${tripId}/itinerary`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    trackAssert(initItin.status === 200, 'GET /api/trips/:id/itinerary returns 200 OK');
    trackAssert(initItin.body.data.total_days === 5, 'Total days correctly computed as 5');
    trackAssert(initItin.body.data.items.length === 0, 'Initial itinerary items empty');

    // Add manual activity
    const addAct = await makeRequest(`/api/trips/${tripId}/itinerary`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    }, {
      day_number: 1,
      time: '18:30',
      title: 'Sunset at Anjuna Beach',
      notes: 'Watch sunset and visit night flea market',
    });
    trackAssert(addAct.status === 201, 'POST /api/trips/:id/itinerary creates activity with 201 Created');
    trackAssert(addAct.body.data.title === 'Sunset at Anjuna Beach', 'Activity title saved');
    trackAssert(addAct.body.data.time === '18:30', 'Activity time formatted as HH:MM');
    const actId = addAct.body.data.id;

    // Update activity
    const updateAct = await makeRequest(`/api/trips/${tripId}/itinerary/${actId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
    }, {
      day_number: 1,
      time: '19:00',
      title: 'Sunset & Dinner at Anjuna Beach',
      notes: 'Dinner at Curlies',
    });
    trackAssert(updateAct.status === 200, 'PUT /api/trips/:id/itinerary/:id returns 200 OK');
    trackAssert(updateAct.body.data.title === 'Sunset & Dinner at Anjuna Beach', 'Updated title reflected');
    trackAssert(updateAct.body.data.time === '19:00', 'Updated time reflected');

    // Book a hotel for this trip to test auto-linking
    const hotelList = await makeRequest('/api/hotels?city=Goa');
    const hotels = hotelList.body.data?.hotels || hotelList.body.data || [];
    trackAssert(hotels.length > 0, 'Hotels exist in Goa');
    const testHotel = hotels[0];

    const hotelBooking = await makeRequest('/api/bookings/hotel', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    }, {
      hotel_id: testHotel.id,
      trip_id: tripId,
      check_in: '2026-11-10',
      check_out: '2026-11-14',
      rooms: 1,
    });
    trackAssert(hotelBooking.status === 201, 'Hotel booking created for trip');
    const hotelBookingId = hotelBooking.body.data?.booking?.id || hotelBooking.body.data?.id;

    // Check that booking is auto-linked into itinerary
    const itinWithLinked = await makeRequest(`/api/trips/${tripId}/itinerary`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const autoLinkedItem = itinWithLinked.body.data.items.find((it) => it.booking_id === hotelBookingId);
    trackAssert(autoLinkedItem !== undefined, 'Booking is auto-linked into itinerary upon reservation');
    trackAssert(autoLinkedItem.day_number === 1, 'Check-in scheduled for Day 1');
    trackAssert(autoLinkedItem.title.includes(testHotel.name), 'Check-in title contains hotel name');

    // Delete the auto-linked item to test unlinked booking detection & sync recovery
    await makeRequest(`/api/trips/${tripId}/itinerary/${autoLinkedItem.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    // Check that itinerary detects unlinked booking
    const itinWithUnlinked = await makeRequest(`/api/trips/${tripId}/itinerary`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    trackAssert(itinWithUnlinked.body.data.unlinked_bookings.length >= 1, 'Itinerary detects unlinked booking after item removal');
    trackAssert(itinWithUnlinked.body.data.unlinked_bookings[0].id === hotelBookingId, 'Unlinked booking matches hotel booking ID');

    // Auto-sync bookings into itinerary
    const syncRes = await makeRequest(`/api/trips/${tripId}/itinerary/sync-bookings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    trackAssert(syncRes.status === 200, 'POST /api/trips/:id/itinerary/sync-bookings returns 200 OK');
    trackAssert(syncRes.body.synced_count >= 1, 'Synced at least 1 booking activity');

    // Verify itinerary now contains re-linked hotel check-in
    const itinAfterSync = await makeRequest(`/api/trips/${tripId}/itinerary`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    trackAssert(itinAfterSync.body.data.unlinked_bookings.length === 0, 'All bookings now auto-linked');
    const checkInItem = itinAfterSync.body.data.items.find((it) => it.booking_id === hotelBookingId);
    trackAssert(checkInItem !== undefined, 'Auto-generated check-in item found with booking_id linked');
    trackAssert(checkInItem.day_number === 1, 'Check-in scheduled for Day 1');
    trackAssert(checkInItem.title.includes(testHotel.name), 'Check-in title contains hotel name');

    // Reorder itinerary items
    const reorderRes = await makeRequest(`/api/trips/${tripId}/itinerary/reorder`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    }, {
      items: [
        { id: actId, day_number: 2, position: 1 },
      ],
    });
    trackAssert(reorderRes.status === 200, 'POST /api/trips/:id/itinerary/reorder returns 200 OK');

    // IDOR test on itinerary
    const idorItin = await makeRequest(`/api/trips/${tripId}/itinerary`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    trackAssert(idorItin.status === 404, 'User B accessing User A trip itinerary rejected with 404 (IDOR protected)');

    // -------------------------------------------------------------
    // 6. Reviews & Ratings Restricted to Completed Bookings
    // -------------------------------------------------------------
    console.log('\nTesting Reviews & Ratings System (ADR-005)...');

    // Attempt review on non-existent booking
    const rev404 = await makeRequest('/api/reviews', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    }, {
      booking_id: 999999,
      rating: 5,
      comment: 'Great!',
    });
    trackAssert(rev404.status === 404, 'Review on invalid booking rejected with 404 Not Found');

    // Attempt review with invalid rating (0 or 6)
    const revInvalidRating = await makeRequest('/api/reviews', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    }, {
      booking_id: hotelBookingId,
      rating: 6,
      comment: 'Too high rating',
    });
    trackAssert(revInvalidRating.status === 400, 'Rating > 5 rejected with 400 Bad Request');

    // Attempt review by User B on User A booking (IDOR)
    const revIdor = await makeRequest('/api/reviews', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
    }, {
      booking_id: hotelBookingId,
      rating: 5,
      comment: 'Stealing review',
    });
    trackAssert(revIdor.status === 404, 'User B reviewing User A booking rejected with 404 (IDOR protected)');

    // Mark booking completed via endpoint
    const completeRes = await makeRequest(`/api/bookings/${hotelBookingId}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    trackAssert(completeRes.status === 200, 'PATCH /api/bookings/:id/complete marks booking completed');
    trackAssert(completeRes.body.data.status === 'completed', 'Booking status is now completed');

    // Submit valid review for completed booking
    const revSuccess = await makeRequest('/api/reviews', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    }, {
      booking_id: hotelBookingId,
      rating: 5,
      comment: 'Stunning property with clean rooms and beautiful pool views!',
    });
    trackAssert(revSuccess.status === 201, 'POST /api/reviews creates review with 201 Created');
    trackAssert(revSuccess.body.data.rating === 5, 'Rating recorded as 5');
    trackAssert(revSuccess.body.data.comment.includes('Stunning property'), 'Review comment recorded');

    // Attempt duplicate review on same booking (should fail with 409 Conflict)
    const revDup = await makeRequest('/api/reviews', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    }, {
      booking_id: hotelBookingId,
      rating: 4,
      comment: 'Second review attempt',
    });
    trackAssert(revDup.status === 409, 'Duplicate review on same booking rejected with 409 Conflict');

    // Check hotel reviews public endpoint
    const hotelRevs = await makeRequest(`/api/reviews/hotel/${testHotel.id}`);
    trackAssert(hotelRevs.status === 200, 'GET /api/reviews/hotel/:id returns 200 OK');
    trackAssert(hotelRevs.body.data.review_count >= 1, 'Hotel review count incremented');
    trackAssert(hotelRevs.body.data.average_rating !== null, 'Hotel has calculated average rating');
    const postedRev = hotelRevs.body.data.reviews.find((r) => r.comment.includes('Stunning property'));
    trackAssert(postedRev !== undefined, 'Posted review visible in hotel review list');
    trackAssert(postedRev.user.name === 'Alice P8', 'Review includes reviewer name');

    // Check current user's reviews
    const myRevs = await makeRequest('/api/reviews/my', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    trackAssert(myRevs.status === 200, 'GET /api/reviews/my returns 200 OK');
    trackAssert(myRevs.body.data.length >= 1, 'Current user has recorded reviews');

    // Clean up test trip
    await makeRequest(`/api/trips/${tripId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    console.log('\n============================================================');
    console.log(`Test Results: ${passedAssertions} Passed, 0 Failed`);
    console.log('============================================================\n');

  } finally {
    if (server) {
      server.close();
    }
  }
}

// Start test server and run
server = app.listen(TEST_PORT, async () => {
  try {
    await runTests();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test suite encountered an error:', err);
    process.exit(1);
  }
});

-- ============================================================
-- TravelMate Performance Indexes Migration
-- Version: 1.1 (Safe, Non-Destructive Incremental Migration)
-- ============================================================

-- 1. Index on bookings(trip_id) for rapid trip-level booking aggregation
CREATE INDEX IF NOT EXISTS idx_bookings_trip_id ON bookings(trip_id);

-- 2. Composite index on bookings(user_id, created_at DESC) for getMyBookings pagination
CREATE INDEX IF NOT EXISTS idx_bookings_user_created ON bookings(user_id, created_at DESC);

-- 3. Index on seats(booking_id) for rapid seat unlock during cancellation
CREATE INDEX IF NOT EXISTS idx_seats_booking_id ON seats(booking_id);

-- 4. Index on transport_options(destination_code, departs_at) for destination-only searches
CREATE INDEX IF NOT EXISTS idx_transport_dest ON transport_options(destination_code, departs_at);

-- 5. Index on exchange_rates(currency, rate_date DESC) for fast single-currency historical lookup
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency ON exchange_rates(currency, rate_date DESC);

-- 6. Index on hotels(city, price_per_night) for hotel price filtering
CREATE INDEX IF NOT EXISTS idx_hotels_city_price ON hotels(city, price_per_night);

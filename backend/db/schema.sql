-- ============================================================
-- TravelMate PostgreSQL Database Schema
-- Version: 1.2
-- ============================================================

-- Drop tables in reverse dependency order if migrating cleanly
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS itinerary_items CASCADE;
DROP TABLE IF EXISTS settlements CASCADE;
DROP TABLE IF EXISTS expense_splits CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS seats CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS transport_options CASCADE;
DROP TABLE IF EXISTS hotels CASCADE;
DROP TABLE IF EXISTS trip_members CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS stations CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    currency_pref VARCHAR(10) NOT NULL DEFAULT 'INR',     -- User's home currency
    display_currency VARCHAR(10) NOT NULL DEFAULT 'INR',  -- Currently selected UI currency
    travel_style VARCHAR(20) NOT NULL DEFAULT 'balanced' 
        CHECK (travel_style IN ('cheapest', 'balanced', 'comfort')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Stations / Transit Hubs Table (Airports, Railway Stations, Bus Terminals)
CREATE TABLE stations (
    code VARCHAR(20) PRIMARY KEY,                         -- IATA for airports, code for rail/bus
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    type VARCHAR(20) NOT NULL CHECK (type IN ('airport', 'rail', 'bus')),
    lat NUMERIC(9, 6),
    lon NUMERIC(9, 6)
);

-- 3. Trips Table (Core object linking bookings, itinerary, and expenses)
CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    base_currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_trip_dates CHECK (end_date >= start_date)
);

-- 4. Trip Members Table (Many-to-Many for collaborative group trips)
CREATE TABLE trip_members (
    trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (trip_id, user_id)
);

-- 5. Hotels Table
CREATE TABLE hotels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    stars NUMERIC(2, 1) DEFAULT 3.0,
    price_per_night NUMERIC(12, 2) NOT NULL,
    rating NUMERIC(3, 2) DEFAULT 4.00,                     -- Cached average rating (1.00 - 5.00)
    image_url TEXT,
    lat NUMERIC(9, 6),
    lon NUMERIC(9, 6),
    osm_id VARCHAR(50)
);

-- 6. Transport Options Table (Flights, Trains, Buses)
CREATE TABLE transport_options (
    id SERIAL PRIMARY KEY,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('flight', 'train', 'bus')),
    operator VARCHAR(100) NOT NULL,
    number VARCHAR(50) NOT NULL,                           -- Flight/train number or bus license
    origin_code VARCHAR(20) NOT NULL REFERENCES stations(code) ON DELETE RESTRICT,
    destination_code VARCHAR(20) NOT NULL REFERENCES stations(code) ON DELETE RESTRICT,
    departs_at TIMESTAMP WITH TIME ZONE NOT NULL,
    arrives_at TIMESTAMP WITH TIME ZONE NOT NULL,
    class VARCHAR(50) NOT NULL,                            -- e.g. Economy, 3AC, Sleeper, AC Volvo
    price NUMERIC(12, 2) NOT NULL,
    CONSTRAINT chk_travel_times CHECK (arrives_at > departs_at)
);

-- 7. Bookings Table (Hotel and Transport bookings)
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    hotel_id INT REFERENCES hotels(id) ON DELETE SET NULL,
    transport_id INT REFERENCES transport_options(id) ON DELETE SET NULL,
    check_in DATE,                                         -- For hotel stays
    check_out DATE,                                        -- For hotel stays
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' 
        CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    amount NUMERIC(12, 2) NOT NULL,                        -- Original amount charged
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',           -- Original currency
    amount_base NUMERIC(12, 2) NOT NULL,                   -- Converted value in base currency (INR)
    rate_used NUMERIC(14, 6) NOT NULL DEFAULT 1.000000,    -- Exchange rate applied at save time
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_booking_target CHECK (
        (hotel_id IS NOT NULL AND transport_id IS NULL) OR 
        (hotel_id IS NULL AND transport_id IS NOT NULL)
    )
);

-- 8. Seats Table (Atomic flight seat reservations)
CREATE TABLE seats (
    id SERIAL PRIMARY KEY,
    transport_id INT NOT NULL REFERENCES transport_options(id) ON DELETE CASCADE,
    seat_no VARCHAR(10) NOT NULL,                          -- e.g. '14A', '14B'
    booking_id INT REFERENCES bookings(id) ON DELETE SET NULL,
    CONSTRAINT uq_seat_per_transport UNIQUE (transport_id, seat_no)
);

-- 9. Expenses Table
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    paid_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,                         -- 'Food', 'Transport', 'Stay', 'Activity', 'Shopping', 'Other'
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    amount_base NUMERIC(12, 2) NOT NULL,                   -- Immutable historical base value
    rate_used NUMERIC(14, 6) NOT NULL DEFAULT 1.000000,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Expense Splits Table (Per-person owed amounts for group split)
CREATE TABLE expense_splits (
    id SERIAL PRIMARY KEY,
    expense_id INT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_owed NUMERIC(12, 2) NOT NULL,
    amount_owed_base NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- 11. Settlements Table (Tracking debt repayment between trip members)
CREATE TABLE settlements (
    id SERIAL PRIMARY KEY,
    trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    from_user INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    settled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_diff_users CHECK (from_user <> to_user)
);

-- 12. Itinerary Items Table (Day-wise activities)
CREATE TABLE itinerary_items (
    id SERIAL PRIMARY KEY,
    trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    time TIME,
    title VARCHAR(255) NOT NULL,
    notes TEXT,
    booking_id INT REFERENCES bookings(id) ON DELETE SET NULL
);

-- 13. Reviews Table (Post-booking star ratings and comments)
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id INT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Notifications Table (In-app alerts)
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,                             -- 'booking', 'settlement', 'itinerary', 'budget'
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Exchange Rates Cache Table (Frankfurter daily sync)
CREATE TABLE exchange_rates (
    base VARCHAR(10) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    rate NUMERIC(14, 6) NOT NULL,
    rate_date DATE NOT NULL,
    PRIMARY KEY (base, currency, rate_date)
);

-- ============================================================
-- Indexes for High Performance Queries
-- ============================================================
CREATE INDEX idx_stations_city ON stations(city);
CREATE INDEX idx_stations_type ON stations(type);
CREATE INDEX idx_hotels_city ON hotels(city);
CREATE INDEX idx_transport_search ON transport_options(origin_code, destination_code, departs_at);
CREATE INDEX idx_seats_transport ON seats(transport_id, booking_id);
CREATE INDEX idx_bookings_user_trip ON bookings(user_id, trip_id);
CREATE INDEX idx_expenses_trip ON expenses(trip_id);
CREATE INDEX idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX idx_settlements_trip ON settlements(trip_id);
CREATE INDEX idx_itinerary_trip ON itinerary_items(trip_id, day_number, position);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_exchange_rates_lookup ON exchange_rates(base, currency, rate_date DESC);

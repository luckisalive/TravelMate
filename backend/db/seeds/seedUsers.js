const bcrypt = require('bcryptjs');
const db = require('../../config/db');

/**
 * Seed Demo Users for Viva Presentation & Live Evaluation
 * Alice (Organizer), Bob (Companion), Charlie (Solo)
 */
async function seedUsers() {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  const demoUsers = [
    {
      name: 'Alice Wonder',
      email: 'alice@example.com',
      password_hash: passwordHash,
      currency_pref: 'INR',
      display_currency: 'INR',
      travel_style: 'comfort',
    },
    {
      name: 'Bob Miller',
      email: 'bob@example.com',
      password_hash: passwordHash,
      currency_pref: 'INR',
      display_currency: 'INR',
      travel_style: 'balanced',
    },
    {
      name: 'Charlie Davis',
      email: 'charlie@example.com',
      password_hash: passwordHash,
      currency_pref: 'USD',
      display_currency: 'USD',
      travel_style: 'cheapest',
    },
  ];

  for (const user of demoUsers) {
    await db.query(
      `INSERT INTO users (name, email, password_hash, currency_pref, display_currency, travel_style)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE 
       SET name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           currency_pref = EXCLUDED.currency_pref,
           display_currency = EXCLUDED.display_currency,
           travel_style = EXCLUDED.travel_style`,
      [
        user.name,
        user.email.toLowerCase(),
        user.password_hash,
        user.currency_pref,
        user.display_currency,
        user.travel_style,
      ]
    );
  }

  console.log(`✅ Successfully seeded/updated ${demoUsers.length} demo users (alice@example.com, bob@example.com, charlie@example.com).`);
}

if (require.main === module) {
  seedUsers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Failed to seed demo users:', err);
      process.exit(1);
    });
}

module.exports = seedUsers;

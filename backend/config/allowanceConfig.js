/**
 * Default daily allowances (food, local transit, activities) per travel style.
 * PRD Section 10: Daily allowance defaults in a config file, editable by the user.
 */
module.exports = {
  cheapest: {
    daily_allowance: 800,
    label: 'Budget / Backpacker',
    description: 'Hostels, local transit/metros, street eateries, free walking tours',
  },
  balanced: {
    daily_allowance: 2000,
    label: 'Balanced Explorer',
    description: 'Mid-range dining, app cabs, ticketed monuments, local experiences',
  },
  comfort: {
    daily_allowance: 5000,
    label: 'Premium / Comfort',
    description: 'Fine dining, private chauffeur/rental cars, premium guided tours',
  },
};

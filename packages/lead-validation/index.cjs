const LEAD_LIMITS = Object.freeze({
  minDateOfBirthYear: 1940,
  firstName: 100,
  lastName: 100,
  phone: 32,
  country: 100,
  nationality: 100,
  gender: 32,
  sport: 64,
  position: 60,
  maxPositions: 20,
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 30, max: 200 },
  verticalJumpCm: { max: 200 },
  league: 120,
  currentClub: 120,
  maxHighlightLinks: 10,
  highlightLink: 500,
  messageToUs: 2000,
  guardianName: 100,
  guardianPhone: 32,
  guardianRelationship: 60,
  minorAge: 18,
});

const LEAD_SOURCE_VALUES = Object.freeze([
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "YOUTUBE",
  "GOOGLE_SEARCH",
  "REFERRAL",
  "COACH",
  "AGENT",
  "EVENT",
  "OTHER",
]);

const LOCALE_VALUES = Object.freeze(["EN", "FR", "ES", "AR"]);

module.exports = { LEAD_LIMITS, LEAD_SOURCE_VALUES, LOCALE_VALUES };

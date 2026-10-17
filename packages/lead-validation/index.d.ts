export declare const LEAD_LIMITS: {
  readonly minDateOfBirthYear: 1940;
  readonly firstName: 100;
  readonly lastName: 100;
  readonly phone: 32;
  readonly country: 100;
  readonly nationality: 100;
  readonly gender: 32;
  readonly sport: 64;
  readonly position: 60;
  readonly maxPositions: 20;
  readonly heightCm: { readonly min: 100; readonly max: 250 };
  readonly weightKg: { readonly min: 30; readonly max: 200 };
  readonly verticalJumpCm: { readonly max: 200 };
  readonly league: 120;
  readonly currentClub: 120;
  readonly maxHighlightLinks: 10;
  readonly highlightLink: 500;
  readonly messageToUs: 2000;
  readonly guardianName: 100;
  readonly guardianPhone: 32;
  readonly guardianRelationship: 60;
  readonly minorAge: 18;
};

export declare const LEAD_SOURCE_VALUES: readonly [
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
];

export declare const LOCALE_VALUES: readonly ["EN", "FR", "ES", "AR"];

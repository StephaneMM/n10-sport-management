import { z } from 'zod';
import { LeadStatus, LeadSource, Locale } from '@prisma/client';
import { LEAD_LIMITS } from '@n10/lead-validation';
import { httpUrl } from '../../lib/urlSchema';

/** Whole years between `dob` and `on`. */
export function ageInYears(dob: Date, on: Date = new Date()): number {
  let age = on.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = on.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && on.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export const MINOR_AGE = LEAD_LIMITS.minorAge;

const shortText = (label: string, max = 120) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() || undefined : value),
    z.string().max(max).optional(),
  );

const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() || undefined : value),
  z.string().email('Invalid guardian email').max(254).optional(),
);

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE_OF_BIRTH = new Date(Date.UTC(LEAD_LIMITS.minDateOfBirthYear, 0, 1));

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isoDateToUtcDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

const dateOfBirth = z
  .string()
  .regex(ISO_DATE_PATTERN, 'Date of birth must use the YYYY-MM-DD format')
  .refine(isValidIsoDate, 'Date of birth is not valid')
  .transform(isoDateToUtcDate)
  .refine((value) => value >= MIN_DATE_OF_BIRTH, 'Date of birth is not valid')
  .refine((value) => value <= new Date(), 'Date of birth must be in the past');

const normalizedHttpUrl = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  httpUrl,
);

const createLeadBody = z
  .object({
    firstName: shortText('First name', LEAD_LIMITS.firstName),
    lastName: shortText('Last name', LEAD_LIMITS.lastName),
    email: z.string().trim().toLowerCase().email("Invalid email address").max(254),
    phone: shortText('Phone number', LEAD_LIMITS.phone),
    country: shortText('Country', LEAD_LIMITS.country),

    dateOfBirth,
    nationality: shortText('Nationality', LEAD_LIMITS.nationality),
    gender: shortText('Gender', LEAD_LIMITS.gender),
    sport: shortText('Sport', LEAD_LIMITS.sport),
    positions: z
      .array(z.string().trim().min(1).max(LEAD_LIMITS.position))
      .min(1, "At least one position is required")
      .max(LEAD_LIMITS.maxPositions, "Too many positions"),

    heightCm: z
      .number()
      .min(LEAD_LIMITS.heightCm.min, `Height must be at least ${LEAD_LIMITS.heightCm.min}cm`)
      .max(LEAD_LIMITS.heightCm.max, `Height must be under ${LEAD_LIMITS.heightCm.max}cm`),
    weightKg: z
      .number()
      .min(LEAD_LIMITS.weightKg.min, `Weight must be at least ${LEAD_LIMITS.weightKg.min}kg`)
      .max(LEAD_LIMITS.weightKg.max, `Weight must be under ${LEAD_LIMITS.weightKg.max}kg`),
    verticalJumpCm: z.number().positive().max(LEAD_LIMITS.verticalJumpCm.max).optional(),

    league: optionalText(LEAD_LIMITS.league),
    currentClub: optionalText(LEAD_LIMITS.currentClub),
    highlightLinks: z
      .array(normalizedHttpUrl)
      .max(LEAD_LIMITS.maxHighlightLinks, "Too many links")
      .optional()
      .default([]),

    messageToUs: optionalText(LEAD_LIMITS.messageToUs),
    source: z.nativeEnum(LeadSource),
    preferredLanguage: z.nativeEnum(Locale).optional(),
    consentToContact: z.literal(true, {
      errorMap: () => ({ message: "You must agree to be contacted" }),
    }),

    guardianName: optionalText(LEAD_LIMITS.guardianName),
    guardianEmail: optionalEmail,
    guardianPhone: optionalText(LEAD_LIMITS.guardianPhone),
    guardianRelationship: optionalText(LEAD_LIMITS.guardianRelationship),
    // NOTE: the request also carries `turnstileToken`, consumed by the
    // verifyTurnstile middleware before this schema runs and stripped here.
  })
  .superRefine((data, ctx) => {
    if (ageInYears(data.dateOfBirth) >= MINOR_AGE) return;
    // Applicant is a minor — a reachable guardian is mandatory.
    for (const field of ['guardianName', 'guardianEmail', 'guardianPhone'] as const) {
      if (!data[field]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: 'Required for applicants under 18',
        });
      }
    }
  });

export const createLeadSchema = z.object({ body: createLeadBody });

export const getLeadSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid Lead ID format"),
  }),
});

// Columns an admin may sort the lead list by.
export const LEAD_SORT_FIELDS = ['createdAt', 'lastName', 'firstName', 'sport', 'country'] as const;

// Parsed directly from req.query in the handler (Express 5 makes req.query
// read-only, so validateResource can't hand it back).
export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  // Capped: these become Postgres `ILIKE` / equality patterns, and the JSON
  // body limit does not apply to the query string.
  search: z.string().trim().min(1).max(100).optional(),
  sport: z.string().trim().min(1).max(64).optional(),
  nationality: z.string().trim().min(1).max(100).optional(),
  gender: z.string().trim().min(1).max(32).optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  source: z.nativeEnum(LeadSource).optional(),
  preferredLanguage: z.nativeEnum(Locale).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(LEAD_SORT_FIELDS).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
// Validate the update payload
export const updateLeadSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid Lead ID format"),
  }),
  body: z
    .object({
      adminComment: z.string().min(1, "Comment cannot be empty").optional(),
      status: z.nativeEnum(LeadStatus).optional(),
    })
    .refine((data) => data.adminComment !== undefined || data.status !== undefined, {
      message: "Provide adminComment and/or status to update",
    }),
});


export type UpdateLeadParams = z.infer<typeof updateLeadSchema>['params'];
export type UpdateLeadBody = z.infer<typeof updateLeadSchema>['body'];


export type GetLeadInput = z.infer<typeof getLeadSchema>['params'];
export type CreateLeadInput = z.infer<typeof createLeadSchema>['body'];

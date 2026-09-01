import { z } from 'zod';
import { LeadStatus, LeadSource, Locale } from '@prisma/client';
import { httpUrl } from '../../lib/urlSchema';

/** Whole years between `dob` and `on`. */
export function ageInYears(dob: Date, on: Date = new Date()): number {
  let age = on.getFullYear() - dob.getFullYear();
  const monthDelta = on.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && on.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export const MINOR_AGE = 18;

const shortText = (label: string, max = 120) =>
  z.string().min(1, `${label} is required`).max(max, `${label} is too long`);

const createLeadBody = z
  .object({
    firstName: shortText("First name", 100),
    lastName: shortText("Last name", 100),
    email: z.string().trim().toLowerCase().email("Invalid email address").max(254),
    phone: shortText("Phone number", 32),
    country: shortText("Country", 100),

    dateOfBirth: z.coerce
      .date()
      .min(new Date('1940-01-01'), "Date of birth is not valid")
      .max(new Date(), "Date of birth must be in the past"),
    nationality: shortText("Nationality", 100),
    gender: shortText("Gender", 32),
    sport: shortText("Sport", 64),
    positions: z
      .array(z.string().min(1).max(60))
      .min(1, "At least one position is required")
      .max(20, "Too many positions"),

    heightCm: z.number().positive("Height must be positive").max(300),
    weightKg: z.number().positive("Weight must be positive").max(500),
    verticalJumpCm: z.number().positive().max(200).optional(),

    league: z.string().max(120).optional(),
    currentClub: z.string().max(120).optional(),
    highlightLinks: z.array(httpUrl).max(10, "Too many links").optional().default([]),

    messageToUs: z.string().max(2000, "Message is too long").optional(),
    source: z.nativeEnum(LeadSource),
    preferredLanguage: z.nativeEnum(Locale).optional(),
    consentToContact: z.literal(true, {
      errorMap: () => ({ message: "You must agree to be contacted" }),
    }),

    guardianName: z.string().trim().min(1).max(100).optional(),
    guardianEmail: z.string().trim().toLowerCase().email("Invalid guardian email").max(254).optional(),
    guardianPhone: z.string().trim().min(1).max(32).optional(),
    guardianRelationship: z.string().trim().min(1).max(60).optional(),
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
  search: z.string().trim().min(1).optional(),
  sport: z.string().trim().min(1).optional(),
  nationality: z.string().trim().min(1).optional(),
  gender: z.string().trim().min(1).optional(),
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

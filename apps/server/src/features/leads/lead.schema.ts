import { z } from 'zod';
import { LeadStatus, LeadSource } from '@prisma/client';

export const createLeadSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    phone: z.string().min(1, "Phone number is required"),
    country: z.string().min(1, "Country is required"),
    
    dateOfBirth: z.coerce
      .date()
      .min(new Date('1940-01-01'), "Date of birth is not valid")
      .max(new Date(), "Date of birth must be in the past"),
    nationality: z.string().min(1, "Nationality is required"),
    gender: z.string().min(1, "Gender is required"),
    sport: z.string().min(1, "Sport is required"),
    positions: z.array(z.string()).min(1, "At least one position is required"),
    
    heightCm: z.number().positive("Height must be positive"),
    weightKg: z.number().positive("Weight must be positive"),
    verticalJumpCm: z.number().positive().optional(),
    
    league: z.string().optional(),
    currentClub: z.string().optional(),
    highlightLinks: z.array(z.string().url("Must be a valid URL")).optional().default([]),
    
    messageToUs: z.string().optional(),
    source: z.nativeEnum(LeadSource),
    consentToContact: z.literal(true, {
      errorMap: () => ({ message: "You must agree to be contacted" }),
    }),
  }),
});

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

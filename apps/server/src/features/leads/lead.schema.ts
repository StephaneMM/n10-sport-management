import { z } from 'zod';

export const createLeadSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone number is required"),
    country: z.string().min(1, "Country is required"),
    
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
  }),
});

export const getLeadSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid Lead ID format"),
  }),
});
// Validate the update payload
export const updateLeadSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid Lead ID format"),
  }),
  body: z.object({
    adminComment: z.string().min(1, "Comment cannot be empty"),
  }),
});


export type UpdateLeadParams = z.infer<typeof updateLeadSchema>['params'];
export type UpdateLeadBody = z.infer<typeof updateLeadSchema>['body'];


export type GetLeadInput = z.infer<typeof getLeadSchema>['params'];
export type CreateLeadInput = z.infer<typeof createLeadSchema>['body'];

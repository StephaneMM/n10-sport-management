import { z } from 'zod';

export const createProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    
    // z.coerce.date() is a magic trick! It takes a string from the JSON request 
    // and automatically turns it into a real JavaScript Date object for Prisma.
    dob: z.coerce.date(), 
    
    nationality: z.string().min(1, "Nationality is required"),
    gender: z.string().min(1, "Gender is required"),
    
    heightCm: z.number().positive("Height must be positive"),
    weightKg: z.number().positive("Weight must be positive"),
    verticalJumpCm: z.number().positive().optional(),
    
    sport: z.string().min(1, "Sport is required"),
    
    // We enforce that this is an array of strings
    positions: z.array(z.string()).min(1, "At least one position is required"),
    
    // We can even tell Zod to ensure every item in the array is a valid URL!
    highlightLinks: z.array(z.string().url("Must be a valid URL")).optional().default([]),
  }),
});

// Export the TypeScript type so our handler knows exactly what data to expect
export type CreateProfileInput = z.infer<typeof createProfileSchema>['body'];
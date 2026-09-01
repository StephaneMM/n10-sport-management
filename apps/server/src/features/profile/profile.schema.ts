import { z } from 'zod';
import { httpUrl, httpUrlFrom } from '../../lib/urlSchema';

const TRUSTED_BASE_DOMAINS = [
  'youtube.com', 
  'youtu.be', 
  'youtube-nocookie.com',
  'hudl.com', 
  'vimeo.com',
  'instagram.com', 
  'twitter.com', 
  'x.com',
  'facebook.com', 
  'tiktok.com'
];

export const createProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    
    // z.coerce.date() takes a string from the JSON request
    // and automatically turns it into a real JavaScript Date object for Prisma.
    dob: z.coerce.date(),

    phoneNumber: z.string().min(1, "Phone number is required"),
    country: z.string().min(1, "Country is required"),
    nationality: z.string().min(1, "Nationality is required"),
    gender: z.string().min(1, "Gender is required"),

    heightCm: z.number().positive("Height must be positive"),
    weightKg: z.number().positive("Weight must be positive"),
    verticalJumpCm: z.number().positive().optional(),

    sport: z.string().min(1, "Sport is required"),
    league: z.string().optional(),
    currentClub: z.string().optional(),

    // We enforce that this is an array of strings
    positions: z.array(z.string()).min(1, "At least one position is required"),
    
    // Each link must be an http(s) URL on an approved platform.
    highlightLinks: z
      .array(
        httpUrlFrom(
          TRUSTED_BASE_DOMAINS,
          "Only approved video, sports and social media platforms are allowed.",
        ),
      )
      .max(10, "Too many links")
      .optional()
      .default([]),
  }),
});


export const addDocumentSchema = z.object({
  body: z.object({
    url: httpUrl,
    type: z.enum([
      'GOVERNMENT_ID', 
      'HS_TRANSCRIPT', 
      'HS_DIPLOMA', 
      'BACHELOR_TRANSCRIPT', 
      'BACHELOR_DIPLOMA', 
      'MASTER_TRANSCRIPT', 
      'MASTER_DIPLOMA', 
      'DOCTORATE_TRANSCRIPT', 
      'DOCTORATE_DIPLOMA', 
      'OTHER'
    ]),
  }),
});


// .partial() Zod making every field optional
export const updateProfileSchema = z.object({
  body: createProfileSchema.shape.body.partial(),
});

// Export the TypeScript type so our handler knows exactly what data to expect
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type CreateProfileInput = z.infer<typeof createProfileSchema>['body'];
export type AddDocumentInput = z.infer<typeof addDocumentSchema>['body'];
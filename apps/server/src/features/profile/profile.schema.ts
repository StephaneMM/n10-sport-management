import { z } from 'zod';
import { DocumentType } from '@prisma/client';

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
    
    // We can even tell Zod to ensure every item in the array is a valid URL!
highlightLinks: z.array(
      z.string()
        .url("Must be a valid URL")
        .refine((val) => {
          try {
            // 2. This rips the URL apart. 
            // 'https://www.youtube.com/watch' becomes hostname: 'www.youtube.com'
            const parsedUrl = new URL(val);
            
            // 3. Check if the exact hostname IS the domain, or ENDS WITH ".domain"
            return TRUSTED_BASE_DOMAINS.some(domain => 
              parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
            );
          } catch {
            return false; // If Node can't parse it, block it!
          }
        }, {
          message: "Only approved video, sports and social media platforms are allowed."
        })
    ).optional().default([]),
  }),
});


// The file arrives as multipart form-data; `type` is the accompanying text field.
export const addDocumentSchema = z.object({
  body: z.object({
    type: z.nativeEnum(DocumentType),
  }),
});

export const documentIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid document id'),
  }),
});

export type DocumentIdParam = z.infer<typeof documentIdParamSchema>['params'];


// .partial() Zod making every field optional
export const updateProfileSchema = z.object({
  body: createProfileSchema.shape.body.partial(),
});

// Export the TypeScript type so our handler knows exactly what data to expect
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type CreateProfileInput = z.infer<typeof createProfileSchema>['body'];
export type AddDocumentInput = z.infer<typeof addDocumentSchema>['body'];
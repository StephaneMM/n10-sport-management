import { z } from 'zod';

const TRUSTED_BASE_DOMAINS = [
  'youtube.com', 
  'youtu.be', 
  'youtube-nocookie.com',
  'hudl.com', 
  'vimeo.com',
  'instagram.com', 
  'twitter.com', 
  'x.com', // Don't forget Twitter's new domain!
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
    
    nationality: z.string().min(1, "Nationality is required"),
    gender: z.string().min(1, "Gender is required"),
    
    heightCm: z.number().positive("Height must be positive"),
    weightKg: z.number().positive("Weight must be positive"),
    verticalJumpCm: z.number().positive().optional(),
    
    sport: z.string().min(1, "Sport is required"),
    
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

// 1. Zod takes your entire creation schema and magically makes every field optional!
export const updateProfileSchema = z.object({
  body: createProfileSchema.shape.body.partial(),
});

// 2. Export the TypeScript type for our handler
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];

// Export the TypeScript type so our handler knows exactly what data to expect
export type CreateProfileInput = z.infer<typeof createProfileSchema>['body'];
import { z } from 'zod';

// Email is stored and compared case-insensitively: trim surrounding whitespace
// and lowercase before it ever reaches the database or a `findUnique`.
const email = z.string().trim().toLowerCase().email("Invalid email address");

export const registerSchema = z.object({
  body: z
    .object({
      email,
      password: z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[0-9]/, "Password must contain at least one number").regex(/[@$!%*?&]/, "Password must contain at least one special character (@, $, !, %, *, ?, &)"),
    })
    // Reject any unexpected field. In particular this blocks `role`: public
    // sign-up must never let the caller pick their own role. Non-PROSPECT
    // accounts (ADMIN, SALES_REP, COACH) are provisioned server-side only.
    .strict(),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];

export const loginSchema = z.object({
  body: z.object({
    email,
    // We don't need regex here; we just need to make sure they typed *something*
    password: z.string().min(1, "Password is required"),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];

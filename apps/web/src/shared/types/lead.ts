import { z } from "zod";

// ─── Lead Form Schema ────────────────────────────────────

export const leadFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  country: z.string().min(1, "Country is required"),
  nationality: z.string().min(1, "Nationality is required"),
  gender: z.string().min(1, "Gender is required"),
  sport: z.string().min(1, "Sport is required"),
  positions: z.string().min(1, "At least one position is required"),
  heightCm: z.coerce.number().min(100, "Height must be at least 100cm").max(250, "Height must be under 250cm"),
  weightKg: z.coerce.number().min(30, "Weight must be at least 30kg").max(200, "Weight must be under 200kg"),
  verticalJumpCm: z.coerce.number().min(0).optional().or(z.literal("")),
  league: z.string().optional(),
  currentClub: z.string().optional(),
  highlightLinks: z.string().optional(),
  messageToUs: z.string().optional(),
  adminComment: z.string().optional(),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

// ─── Lead Model (as returned by the API) ─────────────────

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  nationality: string;
  gender: string;
  sport: string;
  positions: string[];
  heightCm: number;
  weightKg: number;
  verticalJumpCm?: number;
  league?: string;
  currentClub?: string;
  highlightLinks: string[];
  messageToUs?: string;
  adminComment?: string;
  createdAt: string;
  updatedAt: string;
}

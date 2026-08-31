import { z } from "zod";

// ─── Date of birth (DD/MM/YYYY) ──────────────────────────

export const DOB_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** True when `value` is a real calendar date, in the past, not absurdly old. */
export function isValidDateOfBirth(value: string): boolean {
  const match = DOB_PATTERN.exec(value);
  if (!match) return false;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    year >= 1940 &&
    date.getTime() <= Date.now()
  );
}

/** "14/05/2008" → "2008-05-14" for the API (which expects an ISO date). */
export function dateOfBirthToIso(value: string): string {
  const [dd, mm, yyyy] = value.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

// ─── Lead Form Schema ────────────────────────────────────

export const leadFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  country: z.string().min(1, "Country is required"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .regex(DOB_PATTERN, "Use the format DD/MM/YYYY")
    .refine(isValidDateOfBirth, "Enter a valid past date"),
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
  source: z.string().min(1, "Please tell us how you heard about us"),
  consentToContact: z
    .boolean()
    .refine((agreed) => agreed === true, "You must agree to be contacted"),
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
  dateOfBirth: string;
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
  source?: string;
  consentToContact: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Admin list: filters & paginated response ────────────

export type LeadSortField = "createdAt" | "lastName" | "firstName" | "sport" | "country";

export interface LeadListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  sport?: string;
  nationality?: string;
  gender?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: LeadSortField;
  sortOrder?: "asc" | "desc";
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface LeadListResponse {
  leads: Lead[];
  pagination: Pagination;
}

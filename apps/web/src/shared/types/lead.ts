import { z } from "zod";
import { LEAD_SOURCES } from "@/shared/constants";

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

export const MINOR_AGE = 18;

const commaSeparatedItems = (value: string | undefined) =>
  value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/** Whole years between `dob` and now. */
export function ageInYears(dob: Date, on: Date = new Date()): number {
  let age = on.getFullYear() - dob.getFullYear();
  const monthDelta = on.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && on.getDate() < dob.getDate())) age -= 1;
  return age;
}

/** True when a valid DD/MM/YYYY date of birth makes the applicant under 18. */
export function isApplicantMinor(dateOfBirth: string): boolean {
  if (!isValidDateOfBirth(dateOfBirth)) return false;
  return ageInYears(new Date(dateOfBirthToIso(dateOfBirth))) < MINOR_AGE;
}

// ─── Lead Form Schema ────────────────────────────────────

export const leadFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(254),
  phone: z.string().trim().min(1, "Phone number is required").max(32),
  country: z.string().trim().min(1, "Country is required").max(100),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .regex(DOB_PATTERN, "Use the format DD/MM/YYYY")
    .refine(isValidDateOfBirth, "Enter a valid past date"),
  nationality: z.string().trim().min(1, "Nationality is required").max(100),
  gender: z.string().trim().min(1, "Gender is required").max(32),
  sport: z.string().trim().min(1, "Sport is required").max(64),
  positions: z.string().min(1, "At least one position is required"),
  heightCm: z.coerce.number().min(100, "Height must be at least 100cm").max(250, "Height must be under 250cm"),
  weightKg: z.coerce.number().min(30, "Weight must be at least 30kg").max(200, "Weight must be under 200kg"),
  verticalJumpCm: z.coerce.number().min(0).max(200).optional().or(z.literal("")),
  league: z.string().max(120).optional(),
  currentClub: z.string().max(120).optional(),
  highlightLinks: z.string().optional(),
  messageToUs: z.string().max(2000).optional(),
  adminComment: z.string().optional(),
  source: z.string().refine(
    (value) => LEAD_SOURCES.some((source) => source.value === value),
    "Please choose a valid source",
  ),
  consentToContact: z
    .boolean()
    .refine((agreed) => agreed === true, "You must agree to be contacted"),
  turnstileToken: z.string().optional(),
  guardianName: z.string().max(100).optional(),
  guardianEmail: z.string().max(254).optional(),
  guardianPhone: z.string().max(32).optional(),
  guardianRelationship: z.string().max(60).optional(),
}).superRefine((data, ctx) => {
  const positions = commaSeparatedItems(data.positions);
  if (positions.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["positions"], message: "At least one position is required" });
  }
  if (positions.length > 20) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["positions"], message: "Too many positions" });
  }
  if (positions.some((position) => position.length > 60)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["positions"], message: "Position is too long" });
  }

  const highlightLinks = commaSeparatedItems(data.highlightLinks);
  if (highlightLinks.length > 10) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["highlightLinks"], message: "Too many links" });
  }
  if (highlightLinks.some((link) => link.length > 500 || !isHttpUrl(link))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["highlightLinks"], message: "Enter valid http or https links" });
  }

  if (!isApplicantMinor(data.dateOfBirth)) return;
  for (const field of ["guardianName", "guardianEmail", "guardianPhone"] as const) {
    if (!data[field]?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: "Required for applicants under 18" });
    }
  }
  if (data.guardianEmail?.trim() && !z.string().email().safeParse(data.guardianEmail.trim()).success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["guardianEmail"], message: "Invalid email address" });
  }
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
  status: string;
  source?: string;
  preferredLanguage?: string;
  consentToContact: boolean;
  guardianName?: string;
  guardianEmail?: string;
  guardianPhone?: string;
  guardianRelationship?: string;
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
  status?: string;
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

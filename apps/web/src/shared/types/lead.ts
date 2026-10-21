import { z } from "zod";
import { LEAD_LIMITS } from "@n10/lead-validation";
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
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    year >= LEAD_LIMITS.minDateOfBirthYear &&
    date.getTime() <= Date.now()
  );
}

/** "14/05/2008" → "2008-05-14" for the API (which expects an ISO date). */
export function dateOfBirthToIso(value: string): string {
  const [dd, mm, yyyy] = value.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

export const MINOR_AGE = LEAD_LIMITS.minorAge;

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
  let age = on.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = on.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && on.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

/** True when a valid DD/MM/YYYY date of birth makes the applicant under 18. */
export function isApplicantMinor(dateOfBirth: string): boolean {
  if (!isValidDateOfBirth(dateOfBirth)) return false;
  return ageInYears(new Date(`${dateOfBirthToIso(dateOfBirth)}T00:00:00.000Z`)) < MINOR_AGE;
}

// ─── Lead Form Schema ────────────────────────────────────

export const leadFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(LEAD_LIMITS.firstName),
  lastName: z.string().trim().min(1, "Last name is required").max(LEAD_LIMITS.lastName),
  email: z.string().trim().email("Invalid email address").max(254),
  phone: z.string().trim().min(1, "Phone number is required").max(LEAD_LIMITS.phone),
  country: z.string().trim().min(1, "Country is required").max(LEAD_LIMITS.country),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .regex(DOB_PATTERN, "Use the format DD/MM/YYYY")
    .refine(isValidDateOfBirth, "Enter a valid past date"),
  nationality: z.string().trim().min(1, "Nationality is required").max(LEAD_LIMITS.nationality),
  gender: z.string().trim().min(1, "Gender is required").max(LEAD_LIMITS.gender),
  sport: z.string().trim().min(1, "Sport is required").max(LEAD_LIMITS.sport),
  positions: z.string().trim().min(1, "At least one position is required"),
  heightCm: z.coerce.number()
    .min(LEAD_LIMITS.heightCm.min, `Height must be at least ${LEAD_LIMITS.heightCm.min}cm`)
    .max(LEAD_LIMITS.heightCm.max, `Height must be under ${LEAD_LIMITS.heightCm.max}cm`),
  weightKg: z.coerce.number()
    .min(LEAD_LIMITS.weightKg.min, `Weight must be at least ${LEAD_LIMITS.weightKg.min}kg`)
    .max(LEAD_LIMITS.weightKg.max, `Weight must be under ${LEAD_LIMITS.weightKg.max}kg`),
  verticalJumpCm: z.string().trim().length(0).or(z.coerce.number().positive().max(LEAD_LIMITS.verticalJumpCm.max)).optional(),
  league: z.string().trim().max(LEAD_LIMITS.league).optional(),
  currentClub: z.string().trim().max(LEAD_LIMITS.currentClub).optional(),
  highlightLinks: z.string().optional(),
  messageToUs: z.string().trim().max(LEAD_LIMITS.messageToUs).optional(),
  adminComment: z.string().optional(),
  source: z.string().refine(
    (value) => LEAD_SOURCES.some((source) => source.value === value),
    "Please choose a valid source",
  ),
  consentToContact: z
    .boolean()
    .refine((agreed) => agreed === true, "You must agree to be contacted"),
  turnstileToken: z.string().optional(),
  guardianName: z.string().trim().max(LEAD_LIMITS.guardianName).optional(),
  guardianEmail: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() || undefined : value),
    z.string().email("Invalid email address").max(254).optional(),
  ),
  guardianPhone: z.string().trim().max(LEAD_LIMITS.guardianPhone).optional(),
  guardianRelationship: z.string().trim().max(LEAD_LIMITS.guardianRelationship).optional(),
}).superRefine((data, ctx) => {
  const positions = commaSeparatedItems(data.positions);
  if (positions.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["positions"], message: "At least one position is required" });
  }
  if (positions.length > LEAD_LIMITS.maxPositions) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["positions"], message: "Too many positions" });
  }
  if (positions.some((position) => position.length > LEAD_LIMITS.position)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["positions"], message: "Position is too long" });
  }

  const highlightLinks = commaSeparatedItems(data.highlightLinks);
  if (highlightLinks.length > LEAD_LIMITS.maxHighlightLinks) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["highlightLinks"], message: "Too many links" });
  }
  if (highlightLinks.some((link) => link.length > LEAD_LIMITS.highlightLink || !isHttpUrl(link))) {
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

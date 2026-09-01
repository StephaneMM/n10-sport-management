import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiClient } from "./client";
import {
  Lead,
  LeadFormValues,
  LeadListFilters,
  LeadListResponse,
  dateOfBirthToIso,
} from "@/shared/types/lead";
import { toast } from "@/hooks/use-toast";

// ─── Submit Lead (Public) ────────────────────────────────

const LOCALES = ["EN", "FR", "ES", "AR"] as const;

/** "fr-FR" / "fr" → "FR", anything unsupported → "EN". */
export function toLocaleEnum(language: string): (typeof LOCALES)[number] {
  const code = language.split("-")[0].toUpperCase();
  return (LOCALES as readonly string[]).includes(code)
    ? (code as (typeof LOCALES)[number])
    : "EN";
}

export function useSubmitLead() {
  const { i18n } = useTranslation();
  return useMutation({
    mutationFn: (data: LeadFormValues) => {
      const payload = {
        ...data,
        // The form collects DD/MM/YYYY; the API expects an ISO date.
        dateOfBirth: dateOfBirthToIso(data.dateOfBirth),
        // Force these to be actual numbers for the Zod Bouncer
        heightCm: Number(data.heightCm),
        weightKg: Number(data.weightKg),

        positions:
          typeof data.positions === "string"
            ? data.positions.split(",").map((p) => p.trim())
            : data.positions,
        highlightLinks: data.highlightLinks
          ? data.highlightLinks
              .split(",")
              .map((l) => l.trim())
              .filter(Boolean)
          : [],
        verticalJumpCm:
          data.verticalJumpCm === 0 ? undefined : data.verticalJumpCm,
        // Captured automatically from the site language the applicant used.
        preferredLanguage: toLocaleEnum(i18n.language),
        // Drop empty guardian fields so the API sees them as absent, not "".
        guardianName: data.guardianName?.trim() || undefined,
        guardianEmail: data.guardianEmail?.trim() || undefined,
        guardianPhone: data.guardianPhone?.trim() || undefined,
        guardianRelationship: data.guardianRelationship?.trim() || undefined,
      };
      return apiClient<Lead>("/leads", { method: "POST", body: payload });
    },
    onSuccess: () => {
      toast({
        title: "Application submitted successfully!",
        description: "We'll be in touch soon.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ─── Fetch Leads (Admin) ─────────────────────────────────

export function useLeads(filters: LeadListFilters = {}) {
  return useQuery<LeadListResponse>({
    queryKey: ["leads", filters],
    queryFn: () => apiClient<LeadListResponse>("/leads", { params: { ...filters } }),
    // Keep the current page visible while the next one loads.
    placeholderData: keepPreviousData,
  });
}

// ─── Fetch Single Lead (Admin) ───────────────────────────

export function useLead(id: string) {
  return useQuery<Lead>({
    queryKey: ["leads", id],
    queryFn: () => apiClient<Lead>(`/leads/${id}`),
    enabled: !!id,
  });
}

// ─── Update a Lead (Admin) ───────────────────────────────

/** Admin comment and/or triage status. At least one field is required. */
export type LeadUpdate = { adminComment?: string; status?: string };

export function useUpdateLead(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: LeadUpdate) =>
      apiClient<Lead>(`/leads/${id}`, { method: "PATCH", body: patch }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

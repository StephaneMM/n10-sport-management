import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
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

export function useSubmitLead() {
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

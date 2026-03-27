import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import { Lead, LeadFormValues, MOCK_LEADS } from "@/shared/types/lead";
import { toast } from "@/hooks/use-toast";

// ─── Submit Lead (Public) ────────────────────────────────

export function useSubmitLead() {
  return useMutation({
    mutationFn: (data: LeadFormValues) => {
      const payload = {
        ...data,
        positions: data.positions.split(",").map((p) => p.trim()),
        highlightLinks: data.highlightLinks
          ? data.highlightLinks.split(",").map((l) => l.trim()).filter(Boolean)
          : [],
        verticalJumpCm: data.verticalJumpCm === "" ? undefined : data.verticalJumpCm,
      };
      return apiClient<Lead>("/leads", { method: "POST", body: payload });
    },
    onSuccess: () => {
      toast({ title: "Application submitted successfully!", description: "We'll be in touch soon." });
    },
    onError: (error: Error) => {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    },
  });
}

// ─── Fetch Leads (Admin) ─────────────────────────────────

export function useLeads() {
  return useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: async () => {
      try {
        return await apiClient<Lead[]>("/leads");
      } catch {
        // Fallback to mock data for preview
        return MOCK_LEADS;
      }
    },
  });
}

// ─── Fetch Single Lead (Admin) ───────────────────────────

export function useLead(id: string) {
  return useQuery<Lead>({
    queryKey: ["leads", id],
    queryFn: async () => {
      try {
        return await apiClient<Lead>(`/leads/${id}`);
      } catch {
        // Fallback to mock
        const lead = MOCK_LEADS.find((l) => l.id === id);
        if (!lead) throw new Error("Lead not found");
        return lead;
      }
    },
    enabled: !!id,
  });
}
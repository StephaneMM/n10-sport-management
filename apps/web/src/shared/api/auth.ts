import { useMutation } from "@tanstack/react-query";
import { apiClient } from "./client";
import { toast } from "@/hooks/use-toast";

interface LoginResponse {
  token: string;
  user: { id: string; email: string; role: string };
}

export function useAdminLogin() {
  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      apiClient<LoginResponse>("/auth/login", { method: "POST", body: credentials }),
    onSuccess: (data) => {
      localStorage.setItem("n10_token", data.token);
    },
    onError: (error: Error) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    },
  });
}

export function logout() {
  localStorage.removeItem("n10_token");
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("n10_token");
}

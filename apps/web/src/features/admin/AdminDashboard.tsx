import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, LogOut, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useLeads } from "@/shared/api/leads";
import { logout } from "@/shared/api/auth";
import { ApiError } from "@/shared/api/client";
import type { LeadListFilters, LeadSortField } from "@/shared/types/lead";
import { LEAD_STATUS_LABELS } from "@/shared/constants";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LeadFilters from "./LeadFilters";

const STATUS_BADGE_CLASS: Record<string, string> = {
  NEW: "bg-primary-foreground/10 text-primary-foreground/70",
  CONTACTED: "bg-blue-500/15 text-blue-300",
  QUALIFIED: "bg-gold/15 text-gold",
  REJECTED: "bg-destructive/15 text-destructive",
  CONVERTED: "bg-emerald-500/15 text-emerald-300",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-body ${
        STATUS_BADGE_CLASS[status] ?? STATUS_BADGE_CLASS.NEW
      }`}
    >
      {LEAD_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function readFilters(params: URLSearchParams): LeadListFilters {
  const value = (key: string) => params.get(key) || undefined;
  return {
    page: Number(params.get("page")) || undefined,
    search: value("search"),
    sport: value("sport"),
    nationality: value("nationality"),
    gender: value("gender"),
    status: value("status"),
    dateFrom: value("dateFrom"),
    dateTo: value("dateTo"),
    sortBy: value("sortBy") as LeadSortField | undefined,
    sortOrder: (value("sortOrder") as "asc" | "desc" | undefined) ?? undefined,
  };
}

const AdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = readFilters(searchParams);
  const { data, isLoading, isError, error, refetch, isPlaceholderData } = useLeads(filters);
  const leads = data?.leads;
  const pagination = data?.pagination;

  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const updateFilters = (patch: Partial<LeadListFilters>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, raw] of Object.entries(patch)) {
          if (raw === undefined || raw === null || raw === "") next.delete(key);
          else next.set(key, String(raw));
        }
        // Any change other than paging itself returns to the first page.
        if (!("page" in patch)) next.delete("page");
        return next;
      },
      { replace: true },
    );
  };

  const toggleSort = (field: LeadSortField) => {
    const active = filters.sortBy === field;
    updateFilters({
      sortBy: field,
      sortOrder: active && filters.sortOrder === "asc" ? "desc" : "asc",
    });
  };

  const sortIndicator = (field: LeadSortField) =>
    filters.sortBy === field ? (filters.sortOrder === "asc" ? " ▲" : " ▼") : "";

  const headClass = "text-primary-foreground/50 font-body text-xs tracking-wider uppercase";

  const SortableHead = ({ field, label }: { field: LeadSortField; label: string }) => (
    <TableHead
      onClick={() => toggleSort(field)}
      className={`${headClass} cursor-pointer select-none hover:text-primary-foreground`}
    >
      {label}
      {sortIndicator(field)}
    </TableHead>
  );

  return (
    <div className="min-h-screen bg-primary">
      <header className="border-b border-primary-foreground/10">
        <div className="container px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-display text-2xl font-bold text-primary-foreground">
              N10<span className="text-gold">.</span>
            </Link>
            <span className="font-body text-xs tracking-widest uppercase text-primary-foreground/40 ms-2">
              {t("nav.admin")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="dark" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-primary-foreground/50 hover:text-primary-foreground font-body"
            >
              <LogOut className="h-4 w-4 me-2" />
              {t("admin.logout")}
            </Button>
          </div>
        </div>
      </header>

      <div className="container px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <Users className="h-6 w-6 text-gold" />
            <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">
              {t("admin.leads")}
            </h1>
            {pagination && (
              <span className="font-body text-sm text-primary-foreground/40 ms-2">
                ({pagination.total})
              </span>
            )}
          </div>

          <LeadFilters filters={filters} onChange={updateFilters} />

          {isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6">
              <p className="font-body text-primary-foreground/90 mb-1">{t("admin.error_title")}</p>
              <p className="font-body text-sm text-primary-foreground/60 mb-4">
                {error instanceof Error ? error.message : t("admin.error_leads")}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="font-body border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
              >
                {t("admin.retry")}
              </Button>
            </div>
          ) : isLoading ? (
            <p className="font-body text-primary-foreground/50">{t("admin.loading")}</p>
          ) : !leads?.length ? (
            <p className="font-body text-primary-foreground/50">{t("admin.no_leads")}</p>
          ) : (
            <>
              <div
                className={`rounded-lg border border-primary-foreground/10 overflow-hidden transition-opacity ${
                  isPlaceholderData ? "opacity-60" : ""
                }`}
              >
                <Table>
                  <TableHeader>
                    <TableRow className="border-primary-foreground/10 hover:bg-transparent">
                      <SortableHead field="firstName" label={t("admin.first_name")} />
                      <SortableHead field="lastName" label={t("admin.last_name")} />
                      <SortableHead field="sport" label={t("admin.sport")} />
                      <SortableHead field="country" label={t("admin.country")} />
                      <TableHead className={headClass}>{t("admin.status")}</TableHead>
                      <TableHead className={headClass}>{t("admin.email_col")}</TableHead>
                      <TableHead className={`${headClass} text-end`}>{t("admin.action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id} className="border-primary-foreground/5 hover:bg-navy-light/50">
                        <TableCell className="text-primary-foreground font-body">{lead.firstName}</TableCell>
                        <TableCell className="text-primary-foreground font-body">{lead.lastName}</TableCell>
                        <TableCell className="text-primary-foreground/70 font-body">{lead.sport}</TableCell>
                        <TableCell className="text-primary-foreground/70 font-body">{lead.country}</TableCell>
                        <TableCell><StatusBadge status={lead.status} /></TableCell>
                        <TableCell className="text-primary-foreground/70 font-body text-sm">{lead.email}</TableCell>
                        <TableCell className="text-end">
                          <Button asChild variant="ghost" size="sm" className="text-gold hover:text-gold-light font-body text-sm">
                            <Link to={`/admin/leads/${lead.id}`}>{t("admin.view_details")}</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between font-body text-sm text-primary-foreground/60">
                  <span>
                    {t("admin.page_of", { page: pagination.page, total: pagination.totalPages })}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => updateFilters({ page: pagination.page - 1 })}
                      className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                    >
                      <ChevronLeft className="h-4 w-4 me-1" />
                      {t("admin.prev")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => updateFilters({ page: pagination.page + 1 })}
                      className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                    >
                      {t("admin.next")}
                      <ChevronRight className="h-4 w-4 ms-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;

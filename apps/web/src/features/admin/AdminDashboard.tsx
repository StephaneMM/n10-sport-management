import { Link, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { LogOut, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useLeads } from "@/shared/api/leads";
import { logout } from "@/shared/api/auth";
import { ApiError } from "@/shared/api/client";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const AdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useLeads();
  const leads = data?.leads;
  const total = data?.pagination.total;

  // An expired or rejected session: bounce to the login screen.
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
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

      {/* Content */}
      <div className="container px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <Users className="h-6 w-6 text-gold" />
            <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">
              {t("admin.leads")}
            </h1>
            {total !== undefined && (
              <span className="font-body text-sm text-primary-foreground/40 ms-2">
                ({total})
              </span>
            )}
          </div>

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
            <div className="rounded-lg border border-primary-foreground/10 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-primary-foreground/10 hover:bg-transparent">
                    <TableHead className="text-primary-foreground/50 font-body text-xs tracking-wider uppercase">{t("admin.first_name")}</TableHead>
                    <TableHead className="text-primary-foreground/50 font-body text-xs tracking-wider uppercase">{t("admin.last_name")}</TableHead>
                    <TableHead className="text-primary-foreground/50 font-body text-xs tracking-wider uppercase">{t("admin.sport")}</TableHead>
                    <TableHead className="text-primary-foreground/50 font-body text-xs tracking-wider uppercase">{t("admin.country")}</TableHead>
                    <TableHead className="text-primary-foreground/50 font-body text-xs tracking-wider uppercase">{t("admin.email_col")}</TableHead>
                    <TableHead className="text-primary-foreground/50 font-body text-xs tracking-wider uppercase text-end">{t("admin.action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id} className="border-primary-foreground/5 hover:bg-navy-light/50">
                      <TableCell className="text-primary-foreground font-body">{lead.firstName}</TableCell>
                      <TableCell className="text-primary-foreground font-body">{lead.lastName}</TableCell>
                      <TableCell className="text-primary-foreground/70 font-body">{lead.sport}</TableCell>
                      <TableCell className="text-primary-foreground/70 font-body">{lead.country}</TableCell>
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
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;

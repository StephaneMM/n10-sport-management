import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { useLead } from "@/shared/api/leads";
import { toast } from "@/hooks/use-toast";
import { apiClient, ApiError } from "@/shared/api/client";

const AdminLeadDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: lead, isLoading, isError, error, refetch } = useLead(id!);
  const [comments, setComments] = useState("");

  // Seed the comment box once the lead arrives (data is undefined while loading).
  useEffect(() => {
    if (lead) setComments(lead.adminComment ?? "");
  }, [lead]);

  const handleSaveComments = async () => {
    try {
      await apiClient(`/leads/${id}`, { method: "PATCH", body: { adminComment: comments } });
      toast({ title: t("admin.comments_updated"), description: t("admin.comments_saved") });
    } catch {
      toast({ title: t("admin.update_failed"), description: t("admin.update_error"), variant: "destructive" });
    }
  };

  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return <Navigate to="/admin/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <p className="font-body text-primary-foreground/50">{t("admin.loading")}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-body text-primary-foreground/90">{t("admin.error_title")}</p>
        <p className="font-body text-sm text-primary-foreground/60">
          {error instanceof Error ? error.message : t("admin.error_lead")}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="font-body border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
          >
            {t("admin.retry")}
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-primary-foreground/50">
            <Link to="/admin/dashboard"><ArrowLeft className="h-4 w-4 me-1" /> {t("admin.back")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <p className="font-body text-primary-foreground/50">{t("admin.lead_not_found")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="border-b border-primary-foreground/10">
        <div className="container px-6 py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="text-primary-foreground/50 hover:text-primary-foreground">
            <Link to="/admin/dashboard"><ArrowLeft className="h-4 w-4 me-1" /> {t("admin.back")}</Link>
          </Button>
          <span className="font-display text-xl font-bold text-primary-foreground">
            {lead.firstName} {lead.lastName}
          </span>
        </div>
      </header>

      <div className="container px-6 py-10 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* Personal */}
          <DetailSection title={t("admin.personal_info")}>
            <DetailGrid>
              <DetailItem label={t("admin.email")} value={lead.email} />
              <DetailItem label={t("admin.phone")} value={lead.phone} />
              <DetailItem label={t("admin.country")} value={lead.country} />
              <DetailItem label={t("admin.nationality")} value={lead.nationality} />
              <DetailItem label={t("apply.gender")} value={lead.gender} />
            </DetailGrid>
          </DetailSection>

          {/* Athletic */}
          <DetailSection title={t("admin.athletic_profile")}>
            <DetailGrid>
              <DetailItem label={t("admin.sport")} value={lead.sport} />
              <DetailItem label={t("admin.positions")} value={lead.positions.join(", ")} />
              <DetailItem label={t("admin.height")} value={`${lead.heightCm} cm`} />
              <DetailItem label={t("admin.weight")} value={`${lead.weightKg} kg`} />
              {lead.verticalJumpCm && <DetailItem label={t("admin.vertical_jump")} value={`${lead.verticalJumpCm} cm`} />}
              {lead.league && <DetailItem label={t("admin.league")} value={lead.league} />}
              {lead.currentClub && <DetailItem label={t("admin.current_club")} value={lead.currentClub} />}
            </DetailGrid>
          </DetailSection>

          {/* Highlights */}
          {lead.highlightLinks.length > 0 && (
            <DetailSection title={t("admin.highlight_links")}>
              <ul className="space-y-2">
                {lead.highlightLinks.map((link, i) => (
                  <li key={i}>
                    <a href={link} target="_blank" rel="noopener noreferrer" className="font-body text-sm text-gold hover:text-gold-light underline break-all">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          {/* Message */}
          {lead.messageToUs && (
            <DetailSection title={t("admin.message_from_athlete")}>
              <p className="font-body text-primary-foreground/80 leading-relaxed whitespace-pre-wrap">
                {lead.messageToUs}
              </p>
            </DetailSection>
          )}

          {/* Admin Comments */}
          <DetailSection title={t("admin.admin_comments")}>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={t("admin.comments_placeholder")}
              className="bg-navy-light border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 min-h-[120px]"
            />
            <Button onClick={handleSaveComments} className="mt-4 bg-gold text-primary hover:bg-gold-light font-body">
              {t("admin.update_comments")}
            </Button>
          </DetailSection>

          {/* Meta */}
          <p className="font-body text-xs text-primary-foreground/30">
            {t("admin.submitted")}: {new Date(lead.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-navy-light rounded-lg border border-primary-foreground/10 p-6">
      <h2 className="font-display text-lg font-semibold text-gold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">{children}</div>;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-body text-xs text-primary-foreground/40 uppercase tracking-wider mb-1">{label}</p>
      <p className="font-body text-sm text-primary-foreground">{value}</p>
    </div>
  );
}

export default AdminLeadDetail;

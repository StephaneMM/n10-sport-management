import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

import { leadFormSchema, isApplicantMinor, type LeadFormValues } from "@/shared/types/lead";
import { useSubmitLead } from "@/shared/api/leads";
import { SPORTS, GENDERS, LEAD_SOURCES } from "@/shared/constants";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const ApplyPage = () => {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const mutation = useSubmitLead();

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", phone: "",
      country: "", dateOfBirth: "", nationality: "", gender: "", sport: "",
      positions: "", heightCm: undefined as unknown as number, weightKg: undefined as unknown as number,
      verticalJumpCm: "", league: "", currentClub: "",
      highlightLinks: "", messageToUs: "", source: "",
      consentToContact: false,
      guardianName: "", guardianEmail: "", guardianPhone: "", guardianRelationship: "",
    },
  });

  const showGuardian = isApplicantMinor(form.watch("dateOfBirth"));

  const onSubmit = (data: LeadFormValues) => {
    mutation.mutate(data, {
      onSuccess: () => {
        form.reset();
        setSubmitted(true);
      },
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-lg"
        >
          <CheckCircle className="mx-auto h-16 w-16 text-gold mb-6" />
          <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            {t("apply.thank_you_title")}
          </h1>
          <p className="font-body text-primary-foreground/70 text-lg mb-8">
            {t("apply.thank_you_message")}
          </p>
          <Button asChild className="bg-gold text-primary hover:bg-gold-light font-body">
            <Link to="/">{t("apply.back_home")}</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="border-b border-primary-foreground/10">
        <div className="container px-6 py-6 flex items-center justify-between">
          <Link to="/" className="font-display text-2xl font-bold text-primary-foreground">
            N10<span className="text-gold">.</span>
          </Link>
          <LanguageSwitcher variant="dark" />
        </div>
      </div>

      {/* Form */}
      <div className="container px-6 py-12 md:py-20 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
            {t("apply.page_title")}
          </h1>
          <p className="font-body text-primary-foreground/60 mb-10">
            {t("apply.page_subtitle")}
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Personal Info */}
              <Section title={t("apply.personal_info")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field form={form} name="firstName" label={t("apply.first_name")} />
                  <Field form={form} name="lastName" label={t("apply.last_name")} />
                  <Field form={form} name="email" label={t("apply.email")} type="email" />
                  <Field form={form} name="phone" label={t("apply.phone")} type="tel" />
                  <Field form={form} name="country" label={t("apply.country")} />
                  <DateOfBirthField form={form} label={t("apply.date_of_birth")} placeholder={t("apply.date_of_birth_placeholder")} />
                  <Field form={form} name="nationality" label={t("apply.nationality")} />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-primary-foreground/80 font-body text-sm">{t("apply.gender")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-navy-light border-primary-foreground/10 text-primary-foreground">
                              <SelectValue placeholder={t("apply.select_gender")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Section>

              {/* Guardian — only when the applicant is under 18 */}
              {showGuardian && (
                <Section title={t("apply.guardian_info")}>
                  <p className="font-body text-primary-foreground/50 text-sm mb-4 -mt-2">
                    {t("apply.guardian_hint")}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field form={form} name="guardianName" label={t("apply.guardian_name")} />
                    <Field form={form} name="guardianRelationship" label={t("apply.guardian_relationship")} placeholder={t("apply.guardian_relationship_placeholder")} />
                    <Field form={form} name="guardianEmail" label={t("apply.guardian_email")} type="email" />
                    <Field form={form} name="guardianPhone" label={t("apply.guardian_phone")} type="tel" />
                  </div>
                </Section>
              )}

              {/* Sport Info */}
              <Section title={t("apply.athletic_profile")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sport"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-primary-foreground/80 font-body text-sm">{t("apply.sport")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-navy-light border-primary-foreground/10 text-primary-foreground">
                              <SelectValue placeholder={t("apply.select_sport")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SPORTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Field form={form} name="positions" label={t("apply.positions")} placeholder={t("apply.positions_placeholder")} />
                  <Field form={form} name="heightCm" label={t("apply.height")} type="number" />
                  <Field form={form} name="weightKg" label={t("apply.weight")} type="number" />
                  <Field form={form} name="verticalJumpCm" label={t("apply.vertical_jump")} type="number" placeholder={t("apply.optional")} />
                  <Field form={form} name="league" label={t("apply.league")} placeholder={t("apply.optional")} />
                  <Field form={form} name="currentClub" label={t("apply.current_club")} placeholder={t("apply.optional")} className="md:col-span-2" />
                </div>
              </Section>

              {/* Highlights */}
              <Section title={t("apply.highlights_message")}>
                <Field form={form} name="highlightLinks" label={t("apply.highlight_links")} placeholder={t("apply.highlight_placeholder")} />
                <FormField
                  control={form.control}
                  name="messageToUs"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel className="text-primary-foreground/80 font-body text-sm">{t("apply.message_to_us")}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t("apply.message_placeholder")}
                          className="bg-navy-light border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 min-h-[120px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Section>

              <Section title={t("apply.how_heard")}>
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary-foreground/80 font-body text-sm">{t("apply.how_heard")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-navy-light border-primary-foreground/10 text-primary-foreground">
                            <SelectValue placeholder={t("apply.select_source")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LEAD_SOURCES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Section>

              <FormField
                control={form.control}
                name="consentToContact"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 rounded-md border border-primary-foreground/10 bg-navy-light p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-0.5 border-primary-foreground/30 data-[state=checked]:bg-gold data-[state=checked]:text-primary"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-snug">
                      <FormLabel className="text-primary-foreground/80 font-body text-sm font-normal">
                        {t("apply.consent_label")}
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                size="lg"
                disabled={mutation.isPending}
                className="w-full bg-gold text-primary hover:bg-gold-light font-body text-base py-6 tracking-wide"
              >
                {mutation.isPending ? t("apply.submitting") : t("apply.submit")}
              </Button>
            </form>
          </Form>
        </motion.div>
      </div>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-gold mb-4">{title}</h2>
      {children}
    </div>
  );
}

/** Digits only, auto-inserting slashes so the value can only ever be DD/MM/YYYY. */
function formatDateOfBirthInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
    .filter((part) => part.length > 0)
    .join("/");
}

function DateOfBirthField({
  form, label, placeholder,
}: {
  form: ReturnType<typeof useForm<LeadFormValues>>;
  label: string;
  placeholder: string;
}) {
  return (
    <FormField
      control={form.control}
      name="dateOfBirth"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-primary-foreground/80 font-body text-sm">{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              inputMode="numeric"
              placeholder={placeholder}
              value={field.value ?? ""}
              onChange={(e) => field.onChange(formatDateOfBirthInput(e.target.value))}
              className="bg-navy-light border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function Field({
  form, name, label, type = "text", placeholder, className,
}: {
  form: ReturnType<typeof useForm<LeadFormValues>>;
  name: keyof LeadFormValues;
  label: string;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className="text-primary-foreground/80 font-body text-sm">{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              type={type}
              placeholder={placeholder}
              value={field.value ?? ""}
              className="bg-navy-light border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default ApplyPage;

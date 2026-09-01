import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SPORTS, GENDERS, LEAD_STATUSES } from "@/shared/constants";
import type { LeadListFilters } from "@/shared/types/lead";

// Radix Select can't use "" as a value, so the "all" option needs a sentinel.
const ALL = "__all";

const INPUT_CLASS = "bg-navy-light border-primary-foreground/10 text-primary-foreground";

interface LeadFiltersProps {
  filters: LeadListFilters;
  onChange: (patch: Partial<LeadListFilters>) => void;
}

/** Free-text input that only reports its value once typing pauses. */
function DebouncedTextFilter({
  value,
  onCommit,
  label,
}: {
  value: string | undefined;
  onCommit: (value: string | undefined) => void;
  label: string;
}) {
  const [local, setLocal] = useState(value ?? "");
  const debounced = useDebouncedValue(local, 300);

  useEffect(() => {
    if (debounced !== (value ?? "")) onCommit(debounced || undefined);
    // Only react to the debounced local value, not to external `value` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    setLocal(value ?? "");
  }, [value]);

  return (
    <Input
      aria-label={label}
      placeholder={label}
      value={local}
      onChange={(event) => setLocal(event.target.value)}
      className={INPUT_CLASS}
    />
  );
}

const LeadFilters = ({ filters, onChange }: LeadFiltersProps) => {
  const { t } = useTranslation();

  const hasActiveFilter = Boolean(
    filters.search ||
      filters.sport ||
      filters.nationality ||
      filters.gender ||
      filters.status ||
      filters.dateFrom ||
      filters.dateTo,
  );

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <DebouncedTextFilter
        value={filters.search}
        onCommit={(value) => onChange({ search: value })}
        label={t("admin.search_placeholder")}
      />

      <Select
        value={filters.sport ?? ALL}
        onValueChange={(value) => onChange({ sport: value === ALL ? undefined : value })}
      >
        <SelectTrigger className={INPUT_CLASS} aria-label={t("admin.filter_sport")}>
          <SelectValue placeholder={t("admin.filter_sport")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.filter_all_sports")}</SelectItem>
          {SPORTS.map((sport) => (
            <SelectItem key={sport} value={sport}>
              {sport}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.gender ?? ALL}
        onValueChange={(value) => onChange({ gender: value === ALL ? undefined : value })}
      >
        <SelectTrigger className={INPUT_CLASS} aria-label={t("admin.filter_gender")}>
          <SelectValue placeholder={t("admin.filter_gender")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.filter_all_genders")}</SelectItem>
          {GENDERS.map((gender) => (
            <SelectItem key={gender} value={gender}>
              {gender}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DebouncedTextFilter
        value={filters.nationality}
        onCommit={(value) => onChange({ nationality: value })}
        label={t("admin.filter_nationality")}
      />

      <Select
        value={filters.status ?? ALL}
        onValueChange={(value) => onChange({ status: value === ALL ? undefined : value })}
      >
        <SelectTrigger className={INPUT_CLASS} aria-label={t("admin.filter_status")}>
          <SelectValue placeholder={t("admin.filter_status")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.filter_all_statuses")}</SelectItem>
          {LEAD_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label={t("admin.date_from")}
          value={filters.dateFrom ?? ""}
          onChange={(event) => onChange({ dateFrom: event.target.value || undefined })}
          className={INPUT_CLASS}
        />
        <span className="text-primary-foreground/40">–</span>
        <Input
          type="date"
          aria-label={t("admin.date_to")}
          value={filters.dateTo ?? ""}
          onChange={(event) => onChange({ dateTo: event.target.value || undefined })}
          className={INPUT_CLASS}
        />
      </div>

      {hasActiveFilter && (
        <Button
          variant="ghost"
          onClick={() =>
            onChange({
              search: undefined,
              sport: undefined,
              nationality: undefined,
              gender: undefined,
              status: undefined,
              dateFrom: undefined,
              dateTo: undefined,
            })
          }
          className="justify-self-start text-primary-foreground/60 hover:text-primary-foreground font-body"
        >
          {t("admin.clear_filters")}
        </Button>
      )}
    </div>
  );
};

export default LeadFilters;

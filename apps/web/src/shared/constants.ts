/** Options shared by the public application form and the admin lead filters. */

export const SPORTS = [
  "Soccer",
  "Basketball",
  "Tennis",
  "Track & Field",
  "Swimming",
  "Volleyball",
  "Baseball",
  "Golf",
  "Football",
  "Cheerleading",
  "Other",
] as const;

export const GENDERS = ["Male", "Female", "Other"] as const;

/** Lead triage states. `value` must match the server's LeadStatus enum. */
export const LEAD_STATUSES = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CONVERTED", label: "Converted" },
] as const;

export const LEAD_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  LEAD_STATUSES.map((s) => [s.value, s.label]),
);

/** How a lead found us. `value` must match the server's LeadSource enum. */
export const LEAD_SOURCES = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "GOOGLE_SEARCH", label: "Google / web search" },
  { value: "REFERRAL", label: "Friend or family" },
  { value: "COACH", label: "My coach" },
  { value: "AGENT", label: "An agent" },
  { value: "EVENT", label: "An event or showcase" },
  { value: "OTHER", label: "Other" },
] as const;

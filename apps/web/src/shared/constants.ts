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

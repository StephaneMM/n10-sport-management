export * from "./lead";

export enum UserRole {
  ADMIN = "ADMIN",
  SALES_REP = "SALES_REP",
  PROSPECT = "PROSPECT",
  COACH = "COACH",
}

export enum FunnelStage {
  INITIAL_SUBMISSION = "INITIAL_SUBMISSION",
  FIRST_CALL_COMPLETED = "FIRST_CALL_COMPLETED",
  SECOND_CALL_OWNER = "SECOND_CALL_OWNER",
  HIGHLIGHTS_RECEIVED = "HIGHLIGHTS_RECEIVED",
  CONTRACT_SIGNED = "CONTRACT_SIGNED",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  TRANSCRIPT_UPLOADED = "TRANSCRIPT_UPLOADED",
  OFFER_RECEIVED = "OFFER_RECEIVED",
  COMPLETED = "COMPLETED",
}

export enum EducationStage {
  SECONDARY = "SECONDARY",
  POST_SECONDARY_UNDERGRADUATE = "POST_SECONDARY_UNDERGRADUATE",
  POST_SECONDARY_GRADUATE = "POST_SECONDARY_GRADUATE",
  PREP_ACADEMY = "PREP_ACADEMY",
  GAP_YEAR = "GAP_YEAR",
  OTHER = "OTHER",
}

export enum EducationSystem {
  US = "US",
  EUROPE = "EUROPE",
  UK = "UK",
  OTHER = "OTHER",
}

export enum EligibilityStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  CLEARED = "CLEARED",
  NEEDS_REVIEW = "NEEDS_REVIEW",
  DENIED = "DENIED",
}

export enum PriorityLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  VIP = "VIP",
}

export enum PaymentStatus {
  NOT_PAID = "NOT_PAID",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  REFUNDED = "REFUNDED",
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface ProspectProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dob: string;
  nationality: string;
  gender: string;
  educationStage: EducationStage;
  educationYearNumber: number;
  expectedGraduationYear: number;
  educationSystem: EducationSystem;
  heightCm: number;
  weightKg: number;
  verticalJumpCm?: number;
  sport: string;
  positions: string[];
  yearsExperience?: number;
  highlightLinks: string[];
  funnelStage: FunnelStage;
  lastStageUpdate: string;
  inactiveFlag: boolean;
  athleticRating?: number;
  academicRating?: number;
  coachabilityRating?: number;
  priorityLevel?: PriorityLevel;
  paymentStatus: PaymentStatus;
  paymentAmount?: number;
  paymentDate?: string;
  yearsOfEligibilityRemaining?: number;
  ncaaEligibilityStatus: EligibilityStatus;
  naiaEligibilityStatus: EligibilityStatus;
  transcriptDriveFileId?: string;
  transcriptFileName?: string;
  transcriptUploadedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClubHistory {
  id: string;
  prospectId: string;
  clubName: string;
  seasonStartYear: number;
  seasonEndYear: number;
  leagueLevel: string;
  achievements?: string;
  createdAt: string;
}
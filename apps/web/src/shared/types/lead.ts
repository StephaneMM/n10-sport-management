import { z } from "zod";

// ─── Lead Form Schema ────────────────────────────────────

export const leadFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  country: z.string().min(1, "Country is required"),
  nationality: z.string().min(1, "Nationality is required"),
  gender: z.string().min(1, "Gender is required"),
  sport: z.string().min(1, "Sport is required"),
  positions: z.string().min(1, "At least one position is required"),
  heightCm: z.coerce.number().min(100, "Height must be at least 100cm").max(250, "Height must be under 250cm"),
  weightKg: z.coerce.number().min(30, "Weight must be at least 30kg").max(200, "Weight must be under 200kg"),
  verticalJumpCm: z.coerce.number().min(0).optional().or(z.literal("")),
  league: z.string().optional(),
  currentClub: z.string().optional(),
  highlightLinks: z.string().optional(),
  messageToUs: z.string().optional(),
  adminComment: z.string().optional(),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export type Lead = LeadFormValues & {
  id: string;
  createdAt: string;
};

// ─── Lead Model (from API) ──────────────────────────────

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  nationality: string;
  gender: string;
  sport: string;
  positions: string[];
  heightCm: number;
  weightKg: number;
  verticalJumpCm?: number;
  league?: string;
  currentClub?: string;
  highlightLinks: string[];
  messageToUs?: string;
  adminComment?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Mock Data ──────────────────────────────────────────

export const MOCK_LEADS: Lead[] = [
  {
    id: "1",
    firstName: "Lucas",
    lastName: "Mendes",
    email: "lucas.mendes@example.com",
    phone: "+55 11 9876-5432",
    country: "Brazil",
    nationality: "Brazilian",
    gender: "Male",
    sport: "Soccer",
    positions: ["Forward", "Winger"],
    heightCm: 178,
    weightKg: 72,
    verticalJumpCm: 65,
    league: "State U-20",
    currentClub: "São Paulo FC Youth",
    highlightLinks: ["https://youtube.com/watch?v=example1"],
    messageToUs: "I dream of playing D1 soccer in the US. I have been training since age 6.",
    createdAt: "2024-12-01T10:00:00Z",
    updatedAt: "2024-12-01T10:00:00Z",
  },
  {
    id: "2",
    firstName: "Amina",
    lastName: "Diallo",
    email: "amina.diallo@example.com",
    phone: "+221 77 123 4567",
    country: "Senegal",
    nationality: "Senegalese",
    gender: "Female",
    sport: "Basketball",
    positions: ["Point Guard"],
    heightCm: 170,
    weightKg: 62,
    league: "National Junior League",
    currentClub: "Dakar Stars",
    highlightLinks: [],
    createdAt: "2024-12-15T14:30:00Z",
    updatedAt: "2024-12-15T14:30:00Z",
  },
  {
    id: "3",
    firstName: "Yuki",
    lastName: "Tanaka",
    email: "yuki.tanaka@example.com",
    phone: "+81 90 1234 5678",
    country: "Japan",
    nationality: "Japanese",
    gender: "Female",
    sport: "Baseball",
    positions: ["Catcher"],
    heightCm: 180,
    weightKg: 75,
    league: "High School League",
    currentClub: "Tokyo High School",
    highlightLinks: ["https://youtube.com/watch?v=example2"],
    messageToUs: "I want to play college baseball in the US and improve my skills.",
    createdAt: "2024-12-20T09:15:00Z",
    updatedAt: "2024-12-20T09:15:00Z",
  },
  {
    id: "4",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1 555-123-4567",
    country: "USA",
    nationality: "American",
    gender: "Male",
    sport: "Soccer",
    positions: ["Forward", "Midfielder"],
    heightCm: 180,
    weightKg: 75,
    league: "High School League",
    currentClub: "Springfield High",
    highlightLinks: ["https://youtube.com/watch?v=example3"],
    messageToUs: "I want to play college soccer and eventually go pro.",
    createdAt: "2024-12-22T11:00:00Z",
    updatedAt: "2024-12-22T11:00:00Z",
  },
  {
    id: "5",
    firstName: "Maria",
    lastName: "Gonzalez",
    email: "maria.gonzalez@example.com",
    phone: "+34 912 34 56 78",
    country: "Spain",
    nationality: "Spanish",
    gender: "Female",
    sport: "Basketball",
    positions: ["Guard"],
    heightCm: 175,
    weightKg: 68,
    league: "National Junior League",
    currentClub: "Barcelona FC",
    highlightLinks: [],
    createdAt: "2024-12-25T15:45:00Z",
    updatedAt: "2024-12-25T15:45:00Z",
  },
  {
    id: "6",
    firstName: "Ahmed",
    lastName: "Hassan",
    email: "ahmed.hassan@example.com",
    phone: "+966 50 123 456",
    country: "Saudi Arabia",
    nationality: "Saudi Arabian",
    gender: "Male",
    sport: "Tennis",
    positions: ["Singles"],
    heightCm: 185,
    weightKg: 80,
    league: "National Junior League",
    currentClub: "Riyadh Tennis Club",
    highlightLinks: ["https://youtube.com/watch?v=example4"],
    messageToUs: "I want to play college tennis in the US and improve my ranking.",
    createdAt: "2024-12-28T10:30:00Z",
    updatedAt: "2024-12-28T10:30:00Z",
  },
  {
    id: "7",
    firstName: "Sofia",
    lastName: "Martinez",
    email: "sofia.martinez@example.com",
    phone: "+52 55 1234 5678",
    country: "Mexico",
    nationality: "Mexican",
    gender: "Female",
    sport: "Volleyball",
    positions: ["Forward"],
    heightCm: 170,
    weightKg: 65,
    league: "High School League",
    currentClub: "Mexico City High",
    highlightLinks: ["https://youtube.com/watch?v=example5"],
    messageToUs: "I want to play college volleyball and improve my skills.",
    createdAt: "2024-12-30T14:00:00Z",
    updatedAt: "2024-12-30T14:00:00Z",
  },
  {
    id: "8",
    firstName: "Liam",
    lastName: "Smith",
    email: "liam.smith@example.com",
    phone: "+44 20 1234 5678",
    country: "United Kingdom",
    nationality: "British",
    gender: "Male",
    sport: "Cricket",
    positions: ["Batsman"],
    heightCm: 175,
    weightKg: 70,
    league: "National Junior League",
    currentClub: "London Cricket Club",
    highlightLinks: [],
    createdAt: "2025-01-01T09:45:00Z",
    updatedAt: "2025-01-01T09:45:00Z",
  },
  {
    id: "9",
    firstName: "Emma",
    lastName: "Johnson",
    email: "emma.johnson@example.com",
    phone: "+1 555-987-6543",
    country: "USA",
    nationality: "American",
    gender: "Female",
    sport: "Hockey",
    positions: ["Goalie"],
    heightCm: 185,
    weightKg: 72,
    league: "High School League",
    currentClub: "New York High",
    highlightLinks: ["https://youtube.com/watch?v=example6"],
    messageToUs: "I want to play college hockey and improve my skills.",
    createdAt: "2025-01-03T12:30:00Z",
    updatedAt: "2025-01-03T12:30:00Z",
  },
  {
    id: "10",
    firstName: "Carlos",
    lastName: "Rodriguez",
    email: "carlos.rodriguez@example.com",
    phone: "+56 9 1234 567",
    country: "Chile",
    nationality: "Chilean",
    gender: "Male",
    sport: "Rugby",
    positions: ["Flanker"],
    heightCm: 190,
    weightKg: 90,
    league: "National Junior League",
    currentClub: "Santiago Rugby Club",
    highlightLinks: ["https://youtube.com/watch?v=example7"],
    messageToUs: "I want to play college rugby in the US and improve my skills.",
    createdAt: "2025-01-05T11:15:00Z",
    updatedAt: "2025-01-05T11:15:00Z",
  },
];

import { create } from "zustand";

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export interface ResumeData {
  method: "paste" | "structured" | null;
  pastedText: string;
  contactInfo: {
    name: string;
    email: string;
    phone: string;
    linkedin: string;
    github: string;
    location: string;
  };
  summary: string;
  experience: Array<{
    company: string;
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }>;
  education: Array<{
    school: string;
    degree: string;
    field: string;
    gpa: string;
    startDate: string;
    endDate: string;
  }>;
  skills: {
    technical: string;
    frameworks: string;
    tools: string;
    languages: string;
  };
}

export interface PreferencesData {
  targetTitles: string[];
  targetLocations: string[];
  remotePreference: "remote" | "hybrid" | "onsite" | "any";
  salaryMin: string;
  salaryMax: string;
  companySizes: string[];
  industries: string[];
  experienceLevel: "intern" | "entry" | "mid" | "senior";
  visaSponsorship: boolean;
  keywords: string[];
}

export interface ApiKeyData {
  apiKey: string;
  researchModel: string;
  executionModel: string;
  searchDepth: "LIGHT" | "STANDARD" | "DEEP";
  dailySearchEnabled: boolean;
  maxDailyApiCost: number;
  searchTime: string;
  timezone: string;
}

interface OnboardingStore {
  step: OnboardingStep;
  resume: ResumeData;
  preferences: PreferencesData;
  apiKey: ApiKeyData;
  gmailConnected: boolean;
  savedResumeId: string | null;

  setStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  setResume: (data: Partial<ResumeData>) => void;
  setPreferences: (data: Partial<PreferencesData>) => void;
  setApiKeyData: (data: Partial<ApiKeyData>) => void;
  setGmailConnected: (v: boolean) => void;
  setSavedResumeId: (id: string) => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  step: 1,
  savedResumeId: null,
  gmailConnected: false,

  resume: {
    method: null,
    pastedText: "",
    contactInfo: {
      name: "",
      email: "",
      phone: "",
      linkedin: "",
      github: "",
      location: "",
    },
    summary: "",
    experience: [],
    education: [],
    skills: { technical: "", frameworks: "", tools: "", languages: "" },
  },

  preferences: {
    targetTitles: [],
    targetLocations: [],
    remotePreference: "any",
    salaryMin: "",
    salaryMax: "",
    companySizes: [],
    industries: [],
    experienceLevel: "entry",
    visaSponsorship: false,
    keywords: [],
  },

  apiKey: {
    apiKey: "",
    researchModel: "claude-opus-4-6",
    executionModel: "claude-sonnet-4-6",
    searchDepth: "STANDARD",
    dailySearchEnabled: true,
    maxDailyApiCost: 10,
    searchTime: "08:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  },

  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: Math.min(5, s.step + 1) as OnboardingStep })),
  prevStep: () => set((s) => ({ step: Math.max(1, s.step - 1) as OnboardingStep })),

  setResume: (data) => set((s) => ({ resume: { ...s.resume, ...data } })),
  setPreferences: (data) => set((s) => ({ preferences: { ...s.preferences, ...data } })),
  setApiKeyData: (data) => set((s) => ({ apiKey: { ...s.apiKey, ...data } })),
  setGmailConnected: (v) => set({ gmailConnected: v }),
  setSavedResumeId: (id) => set({ savedResumeId: id }),
}));

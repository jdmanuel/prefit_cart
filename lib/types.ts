// Shapes shared by the API route, the recommendation rules, and the UI.

export type SellsTo = 'consumers' | 'businesses' | 'both' | 'unknown';
export type WorkModel = 'remote' | 'hybrid' | 'office' | 'unknown';

/** The structured company profile Exa synthesizes (matches PROFILE_SCHEMA in lib/exa.ts). */
export interface CompanyProfile {
  company_name: string;
  industry: string;
  employee_count: number;
  sells_to: SellsTo;
  online_store_platform: string;
  countries_served: string[];
  website_languages: string[];
  work_model: WorkModel;
  actively_hiring: boolean;
  handles_sensitive_data: boolean;
}

export type ProfileField = keyof CompanyProfile;

export type Confidence = 'low' | 'medium' | 'high';

export interface Grounding {
  field: string;
  citations: { url: string; title: string }[];
  confidence: Confidence;
}

/** Why a saved profile was served instead of a live Exa lookup. */
export type SavedReason = 'requested' | 'no-key' | 'exa-error';

export interface ProfileResponse {
  domain: string;
  profile: CompanyProfile;
  grounding: Grounding[];
  sources: { title: string; url: string; highlights?: string[] }[];
  timings: { roundTripMs: number; searchTimeMs: number; queueMs: number };
  costDollars: number;
  searchType: string;
  request: Record<string, unknown>;
  /** Exa's raw response body, shown in the "How we built this" panel. */
  response: Record<string, unknown>;
  cached: boolean;
  savedReason?: SavedReason;
  fetchedAt: string;
}

export interface ProfileError {
  error: string;
}

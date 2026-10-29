export type OpportunityType = 'internship' | 'job' | 'freelance' | 'deal' | 'collaboration';

export type MatchStatus = 'new' | 'saved' | 'dismissed' | 'applied';

export type ApplicationStage = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected';

export interface User {
  id: string;
  email: string;
  created_at: string;
  has_profile: boolean;
}

export interface Profile {
  id?: string;
  user_id?: string;
  full_name: string;
  headline?: string;
  skills: string[];
  education?: string;
  experience_summary?: string;
  links: Record<string, string>;
  resume_text?: string;
  location?: string;
  remote_ok: boolean;
  min_stipend?: number;
  min_freelance_budget?: number;
  opportunity_types: OpportunityType[];
  keywords_include: string[];
  keywords_exclude: string[];
  match_threshold: number;
}

export interface ExtractedResumeData {
  full_name?: string;
  headline?: string;
  skills: string[];
  education?: string;
  experience_summary?: string;
  suggested_keywords: string[];
  location?: string;
  extracted_text?: string;
  extraction_source: string;
}

export interface Opportunity {
  id: string;
  source_id: string;
  external_id: string;
  type: OpportunityType;
  title: string;
  org: string;
  description: string;
  skills: string[];
  location?: string;
  remote: boolean;
  pay_min?: number;
  pay_max?: number;
  currency?: string;
  deadline?: string;
  posted_at?: string;
  url: string;
  created_at: string;
}

export interface Match {
  id: string;
  user_id: string;
  opportunity_id: string;
  score: number;
  reason: string;
  red_flags: string[];
  status: MatchStatus;
  created_at: string;
  opportunity?: Opportunity;
}

export interface Application {
  id: string;
  user_id: string;
  opportunity_id: string;
  stage: ApplicationStage;
  notes?: string;
  applied_at?: string;
  follow_up_at?: string;
  drafts: Record<string, any>;
  opportunity?: Opportunity;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  match_id?: string;
  title: string;
  body: string;
  urgency: 'low' | 'medium' | 'high';
  read: boolean;
  created_at: string;
}

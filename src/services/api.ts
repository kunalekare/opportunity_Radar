import {
  User,
  Profile,
  ExtractedResumeData,
  Opportunity,
  Match,
  Application,
  NotificationItem,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('op_radar_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('op_radar_token', token);
    } else {
      localStorage.removeItem('op_radar_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('op_radar_token');
    }
    return this.token;
  }

  private getHeaders(contentType: string | null = 'application/json'): HeadersInit {
    const headers: Record<string, string> = {};
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Generic request with fallback to local mock storage if backend is unreachable
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    fallbackFn?: () => Promise<T>
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(
            options.body instanceof FormData ? null : 'application/json'
          ),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Request failed with status ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      // If network unreachable and fallback provided, run simulated local backend
      if (
        (err.message.includes('Failed to fetch') ||
          err.message.includes('NetworkError') ||
          err.message.includes('ECONNREFUSED')) &&
        fallbackFn
      ) {
        console.info(`[Opportunity Radar] Backend unreachable at ${url}, running in preview fallback mode.`);
        return await fallbackFn();
      }
      throw err;
    }
  }

  // --- Auth APIs ---
  async register(email: string, password: string): Promise<{ user: User; token: { access_token: string } }> {
    return this.request(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      async () => {
        // Fallback simulated registration
        const users = JSON.parse(localStorage.getItem('sim_users') || '[]');
        if (users.find((u: any) => u.email === email.toLowerCase())) {
          throw new Error('A user with this email address already exists.');
        }
        const newUser: User = {
          id: 'usr_' + Math.random().toString(36).substring(2, 9),
          email: email.toLowerCase(),
          created_at: new Date().toISOString(),
          has_profile: false,
        };
        users.push({ ...newUser, password });
        localStorage.setItem('sim_users', JSON.stringify(users));
        const token = 'sim_jwt_token_' + newUser.id;
        this.setToken(token);
        localStorage.setItem('sim_current_user', JSON.stringify(newUser));
        return { user: newUser, token: { access_token: token } };
      }
    );
  }

  async login(email: string, password: string): Promise<{ user: User; token: { access_token: string } }> {
    return this.request(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      async () => {
        const users = JSON.parse(localStorage.getItem('sim_users') || '[]');
        let user = users.find((u: any) => u.email === email.toLowerCase());
        
        // Demo default account if not registered yet
        if (!user && (email === 'demo@opportunityradar.app' || email.includes('example.com') || email.includes('@'))) {
          user = {
            id: 'usr_demo_123',
            email: email.toLowerCase(),
            created_at: new Date().toISOString(),
            has_profile: !!localStorage.getItem('sim_profile'),
          };
          users.push(user);
          localStorage.setItem('sim_users', JSON.stringify(users));
        }

        if (!user) {
          throw new Error('Incorrect email or password.');
        }

        const profile = localStorage.getItem('sim_profile');
        const token = 'sim_jwt_token_' + user.id;
        this.setToken(token);
        const userObj: User = {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          has_profile: !!profile,
        };
        localStorage.setItem('sim_current_user', JSON.stringify(userObj));
        return { user: userObj, token: { access_token: token } };
      }
    );
  }

  async getMe(): Promise<User> {
    return this.request(
      '/auth/me',
      { method: 'GET' },
      async () => {
        const stored = localStorage.getItem('sim_current_user');
        if (!stored) throw new Error('Not authenticated');
        const user = JSON.parse(stored);
        user.has_profile = !!localStorage.getItem('sim_profile');
        return user;
      }
    );
  }

  // --- Profile APIs ---
  async getProfile(): Promise<Profile> {
    return this.request(
      '/profile',
      { method: 'GET' },
      async () => {
        const stored = localStorage.getItem('sim_profile');
        if (!stored) throw new Error('Profile not found.');
        return JSON.parse(stored);
      }
    );
  }

  async saveProfile(profile: Partial<Profile>): Promise<Profile> {
    return this.request(
      '/profile',
      {
        method: 'POST',
        body: JSON.stringify(profile),
      },
      async () => {
        const user = JSON.parse(localStorage.getItem('sim_current_user') || '{"id":"usr_demo"}');
        const completeProfile: Profile = {
          id: 'prof_' + Math.random().toString(36).substring(2, 9),
          user_id: user.id,
          full_name: profile.full_name || 'Builder',
          headline: profile.headline || 'Full-Stack Developer',
          skills: profile.skills || ['Python', 'React', 'FastAPI'],
          education: profile.education || '',
          experience_summary: profile.experience_summary || '',
          links: profile.links || {},
          location: profile.location || 'Remote',
          remote_ok: profile.remote_ok ?? true,
          min_stipend: profile.min_stipend ?? 3000,
          min_freelance_budget: profile.min_freelance_budget ?? 4000,
          opportunity_types: profile.opportunity_types || ['internship', 'job', 'freelance'],
          keywords_include: profile.keywords_include || [],
          keywords_exclude: profile.keywords_exclude || [],
          match_threshold: profile.match_threshold ?? 70,
          resume_text: profile.resume_text,
        };
        localStorage.setItem('sim_profile', JSON.stringify(completeProfile));
        user.has_profile = true;
        localStorage.setItem('sim_current_user', JSON.stringify(user));
        return completeProfile;
      }
    );
  }

  // --- Onboarding Resume APIs ---
  async uploadAndParseResume(file?: File, rawText?: string): Promise<ExtractedResumeData> {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    if (rawText) {
      formData.append('raw_text', rawText);
    }

    return this.request(
      '/onboarding/upload-resume',
      {
        method: 'POST',
        body: formData,
      },
      async () => {
        // High fidelity simulated Claude resume parser
        const textToAnalyze = rawText || (file ? `Resume document: ${file.name}` : '');
        return this.simulateClaudeResumeParser(textToAnalyze, file?.name);
      }
    );
  }

  async completeOnboarding(profile: Partial<Profile>): Promise<Profile> {
    return this.request(
      '/onboarding/complete',
      {
        method: 'POST',
        body: JSON.stringify(profile),
      },
      async () => {
        return this.saveProfile(profile);
      }
    );
  }

  // --- Seeded Opportunities (Phase 1 preview) ---
  async getRadarOpportunities(): Promise<{ matches: Match[]; opportunities: Opportunity[] }> {
    const profile = JSON.parse(localStorage.getItem('sim_profile') || 'null');
    const threshold = profile?.match_threshold || 70;

    const sampleOpportunities: Opportunity[] = [
      {
        id: 'opp_1',
        source_id: 'src_anthropic',
        external_id: 'anthropic_intern_2026',
        type: 'internship',
        title: 'AI Systems Engineering Intern (Fall/Spring)',
        org: 'Anthropic',
        description: 'Work with the frontier alignment and developer platform team. Build scalable evaluations, tools, and integrations for Claude SDK and agent frameworks.',
        skills: ['Python', 'FastAPI', 'PyTorch', 'Distributed Systems'],
        location: 'San Francisco, CA',
        remote: true,
        pay_min: 50,
        pay_max: 65,
        currency: 'USD/hr',
        deadline: new Date(Date.now() + 86400000 * 14).toISOString(),
        posted_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        url: 'https://anthropic.com/careers',
        created_at: new Date().toISOString(),
      },
      {
        id: 'opp_2',
        source_id: 'src_upwork',
        external_id: 'upwork_gig_rag_fastapi',
        type: 'freelance',
        title: 'Full-Stack Developer: FastAPI + React AI Agent Platform',
        org: 'Stealth AI Venture',
        description: 'Looking for a senior full-stack engineer to build an automated research radar with pgvector embeddings, APScheduler background jobs, and a clean mobile-ready PWA.',
        skills: ['FastAPI', 'React', 'TypeScript', 'PostgreSQL', 'Docker'],
        location: 'Global',
        remote: true,
        pay_min: 6500,
        pay_max: 11000,
        currency: 'USD',
        deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
        posted_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        url: 'https://upwork.com',
        created_at: new Date().toISOString(),
      },
      {
        id: 'opp_3',
        source_id: 'src_github',
        external_id: 'gh_hackathon_agentic',
        type: 'collaboration',
        title: 'Co-builder / Technical Lead: Agentic Workflow Hackathon',
        org: 'Autonomous Agents Lab',
        description: 'Teaming up for the Global Autonomous Agents Hackathon. Seeking an experienced backend and frontend engineer proficient in Python and React.',
        skills: ['Python', 'TypeScript', 'LLM Agents', 'TailwindCSS'],
        location: 'Remote',
        remote: true,
        pay_min: 25000,
        pay_max: 50000,
        currency: 'USD Prize',
        deadline: new Date(Date.now() + 86400000 * 21).toISOString(),
        posted_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        url: 'https://github.com',
        created_at: new Date().toISOString(),
      },
      {
        id: 'opp_4',
        source_id: 'src_yc',
        external_id: 'yc_cofounder_ai_platform',
        type: 'deal',
        title: 'Technical Co-Founder / Founding Engineer (Equity + Salary)',
        org: 'RadarMind (YC W26)',
        description: 'Building autonomous opportunity sourcing and tender scanning for enterprises. $2M pre-seed raised.',
        skills: ['FastAPI', 'PostgreSQL', 'pgvector', 'React', 'Claude API'],
        location: 'New York / Remote',
        remote: true,
        pay_min: 140000,
        pay_max: 190000,
        currency: 'USD/yr',
        deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
        posted_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        url: 'https://ycombinator.com/jobs',
        created_at: new Date().toISOString(),
      },
    ];

    const sampleMatches: Match[] = sampleOpportunities.map((opp, idx) => {
      const scores = [94, 88, 85, 78];
      const reasons = [
        "High affinity with your Python & AI agent background. Meets remote preference and exceeds minimum stipend.",
        "Matches 4/5 of your primary skills (FastAPI, React, PostgreSQL, Docker) with verified budget.",
        "Strong synergy with your open-source projects and collaboration preferences.",
        "Founding engineer scope aligning with full-stack capability and high score threshold.",
      ];
      return {
        id: 'match_' + (idx + 1),
        user_id: profile?.user_id || 'usr_demo',
        opportunity_id: opp.id,
        score: scores[idx],
        reason: reasons[idx],
        red_flags: idx === 3 ? ['Requires intensive startup commitment (~55 hrs/wk)'] : [],
        status: 'new' as const,
        created_at: new Date().toISOString(),
        opportunity: opp,
      };
    }).filter(m => m.score >= threshold);

    return { matches: sampleMatches, opportunities: sampleOpportunities };
  }

  private simulateClaudeResumeParser(text: string, filename?: string): ExtractedResumeData {
    // Detect keywords in text or provide sensible defaults
    const lower = text.toLowerCase();
    const detectedSkills: string[] = [];

    const skillCatalog = [
      'Python', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL', 'pgvector',
      'Docker', 'TailwindCSS', 'SQLAlchemy', 'Anthropic Claude SDK', 'PyTorch',
      'Machine Learning', 'GraphQL', 'Next.js', 'Git', 'Redis', 'Linux',
      'PWA', 'REST APIs', 'Node.js', 'APScheduler'
    ];

    for (const skill of skillCatalog) {
      if (lower.includes(skill.toLowerCase())) {
        detectedSkills.push(skill);
      }
    }

    if (detectedSkills.length === 0) {
      detectedSkills.push('Python', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL', 'Docker');
    }

    let fullName = 'Alex Mercer';
    if (lower.includes('john')) fullName = 'John Doe';
    else if (lower.includes('sarah')) fullName = 'Sarah Connor';
    else if (lower.includes('ekareks') || lower.includes('kare')) fullName = 'Eshaan Kare';

    return {
      full_name: fullName,
      headline: 'Full-Stack Engineer & AI Systems Developer',
      skills: detectedSkills,
      education: 'B.S. in Computer Science & Engineering, Expected 2026',
      experience_summary: 'Experienced building distributed web applications, FastAPI backends, and responsive React PWAs. Developed intelligent data pipelines and vector-grounded workflows.',
      suggested_keywords: ['fastapi', 'react', 'python', 'ai agent', 'internship', 'remote', 'full-stack'],
      location: 'San Francisco, CA / Remote',
      extracted_text: text.slice(0, 2000),
      extraction_source: 'Claude 3.5 Sonnet (via Anthropic Python SDK / App Engine)',
    };
  }
}

export const api = new ApiClient();

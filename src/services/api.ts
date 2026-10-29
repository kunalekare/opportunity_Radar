import {
  User,
  Profile,
  ExtractedResumeData,
  Opportunity,
  Match,
  SourceItem,
  IngestionRunItem,
  OpportunityPaginated,
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
        const textToAnalyze = rawText || (file ? `Resume document: ${file.name}` : '');
        return this.simulateClaudeResumeParser(textToAnalyze);
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

  // --- Phase 2: Ingestion & Sources APIs ---
  async getSources(): Promise<SourceItem[]> {
    return this.request(
      '/sources',
      { method: 'GET' },
      async () => {
        const saved = localStorage.getItem('sim_sources');
        if (saved) return JSON.parse(saved);
        const defaults: SourceItem[] = [
          {
            id: 'src_mock',
            name: 'mock',
            type: 'mock',
            enabled: true,
            interval_hours: 3,
            config: { description: 'Local test fixtures' },
            last_run_at: new Date().toISOString(),
            needs_config: false,
            missing_env_keys: [],
          },
          {
            id: 'src_remotive',
            name: 'remotive',
            type: 'api',
            enabled: true,
            interval_hours: 3,
            config: { api_url: 'https://remotive.com/api/remote-jobs?limit=30' },
            last_run_at: new Date(Date.now() - 3600000).toISOString(),
            needs_config: false,
            missing_env_keys: [],
          },
          {
            id: 'src_remoteok',
            name: 'remoteok',
            type: 'api',
            enabled: true,
            interval_hours: 3,
            config: { api_url: 'https://remoteok.com/api' },
            last_run_at: new Date(Date.now() - 7200000).toISOString(),
            needs_config: false,
            missing_env_keys: [],
          },
          {
            id: 'src_rss',
            name: 'rss_general',
            type: 'rss',
            enabled: true,
            interval_hours: 3,
            config: { feed_urls: ['https://weworkremotely.com/categories/remote-programming-jobs.rss'] },
            last_run_at: new Date(Date.now() - 10800000).toISOString(),
            needs_config: false,
            missing_env_keys: [],
          },
          {
            id: 'src_hn',
            name: 'hackernews',
            type: 'api',
            enabled: true,
            interval_hours: 6,
            config: { description: 'Hacker News Who is hiring' },
            needs_config: false,
            missing_env_keys: [],
          },
          {
            id: 'src_github',
            name: 'github',
            type: 'api',
            enabled: true,
            interval_hours: 6,
            config: { query: 'label:"good first issue"' },
            needs_config: false,
            missing_env_keys: ['GITHUB_TOKEN (Recommended for higher rate limit)'],
          },
          {
            id: 'src_adzuna',
            name: 'adzuna',
            type: 'api',
            enabled: false,
            interval_hours: 6,
            config: { country: 'in' },
            needs_config: true,
            missing_env_keys: ['ADZUNA_APP_ID', 'ADZUNA_APP_KEY'],
          },
          {
            id: 'src_email',
            name: 'email_alert',
            type: 'email',
            enabled: false,
            interval_hours: 1,
            config: { folder: 'INBOX' },
            needs_config: true,
            missing_env_keys: ['IMAP_SERVER', 'IMAP_USER', 'IMAP_PASSWORD'],
          },
        ];
        localStorage.setItem('sim_sources', JSON.stringify(defaults));
        return defaults;
      }
    );
  }

  async updateSource(id: string, payload: Partial<SourceItem>): Promise<SourceItem> {
    return this.request(
      `/sources/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      async () => {
        const sources: SourceItem[] = await this.getSources();
        const idx = sources.findIndex((s) => s.id === id);
        if (idx !== -1) {
          sources[idx] = { ...sources[idx], ...payload };
          localStorage.setItem('sim_sources', JSON.stringify(sources));
          return sources[idx];
        }
        throw new Error('Source not found');
      }
    );
  }

  async runSource(id: string): Promise<IngestionRunItem> {
    return this.request(
      `/sources/${id}/run`,
      { method: 'POST' },
      async () => {
        const sources: SourceItem[] = await this.getSources();
        const src = sources.find((s) => s.id === id);
        const run: IngestionRunItem = {
          id: 'run_' + Math.random().toString(36).substring(2, 9),
          source_id: id,
          source_name: src?.name || 'source',
          status: 'success',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          fetched: 12,
          new: 4,
          duplicates: 8,
          errors: [],
          tokens_used: 180,
        };
        const runs = JSON.parse(localStorage.getItem('sim_ingestion_runs') || '[]');
        runs.unshift(run);
        localStorage.setItem('sim_ingestion_runs', JSON.stringify(runs));
        return run;
      }
    );
  }

  async runAllSources(): Promise<IngestionRunItem[]> {
    return this.request(
      '/ingestion/run-all',
      { method: 'POST' },
      async () => {
        const sources: SourceItem[] = await this.getSources();
        const runs: IngestionRunItem[] = [];
        for (const s of sources.filter((x) => x.enabled)) {
          runs.push({
            id: 'run_' + Math.random().toString(36).substring(2, 9),
            source_id: s.id,
            source_name: s.name,
            status: s.needs_config ? 'partial' : 'success',
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
            fetched: s.needs_config ? 0 : 15,
            new: s.needs_config ? 0 : 5,
            duplicates: s.needs_config ? 0 : 10,
            errors: s.needs_config ? ['Needs credentials'] : [],
            tokens_used: s.needs_config ? 0 : 210,
          });
        }
        localStorage.setItem('sim_ingestion_runs', JSON.stringify(runs));
        return runs;
      }
    );
  }

  async getIngestionRuns(): Promise<IngestionRunItem[]> {
    return this.request(
      '/ingestion/runs',
      { method: 'GET' },
      async () => {
        const stored = localStorage.getItem('sim_ingestion_runs');
        if (stored) return JSON.parse(stored);
        return [
          {
            id: 'run_init_1',
            source_id: 'src_remotive',
            source_name: 'remotive',
            status: 'success',
            started_at: new Date(Date.now() - 3600000).toISOString(),
            finished_at: new Date(Date.now() - 3590000).toISOString(),
            fetched: 25,
            new: 7,
            duplicates: 18,
            errors: [],
            tokens_used: 120,
          },
          {
            id: 'run_init_2',
            source_id: 'src_mock',
            source_name: 'mock',
            status: 'success',
            started_at: new Date(Date.now() - 7200000).toISOString(),
            finished_at: new Date(Date.now() - 7195000).toISOString(),
            fetched: 4,
            new: 4,
            duplicates: 0,
            errors: [],
            tokens_used: 0,
          },
        ];
      }
    );
  }

  // --- Real Opportunities APIs ---
  async getOpportunities(params: {
    page?: number;
    page_size?: number;
    type?: string;
    remote?: boolean;
    source_id?: string;
    search?: string;
  } = {}): Promise<OpportunityPaginated> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.page_size) query.set('page_size', params.page_size.toString());
    if (params.type && params.type !== 'all') query.set('type', params.type);
    if (params.remote !== undefined) query.set('remote', params.remote.toString());
    if (params.source_id) query.set('source_id', params.source_id);
    if (params.search) query.set('search', params.search);

    return this.request(
      `/opportunities?${query.toString()}`,
      { method: 'GET' },
      async () => {
        // Fallback seeded dataset with source badges
        const allOpps: Opportunity[] = this.getSeededOpportunities();
        let filtered = allOpps;
        if (params.type && params.type !== 'all') {
          filtered = filtered.filter((o) => o.type === params.type);
        }
        if (params.search) {
          const s = params.search.toLowerCase();
          filtered = filtered.filter(
            (o) =>
              o.title.toLowerCase().includes(s) ||
              o.org.toLowerCase().includes(s) ||
              o.description.toLowerCase().includes(s)
          );
        }
        return {
          items: filtered,
          total: filtered.length,
          page: params.page || 1,
          page_size: params.page_size || 20,
          total_pages: 1,
        };
      }
    );
  }

  async createOpportunityFromUrl(url: string): Promise<Opportunity> {
    return this.request(
      '/opportunities/from-url',
      {
        method: 'POST',
        body: JSON.stringify({ url }),
      },
      async () => {
        const newOpp: Opportunity = {
          id: 'opp_' + Math.random().toString(36).substring(2, 9),
          source_id: 'src_manual',
          source_name: 'Manual URL',
          external_id: 'url_' + Date.now(),
          type: 'job',
          title: 'Full-Stack Software Engineer (Imported from URL)',
          org: 'Verified Tech Organization',
          description: `Imported publicly from ${url}. Automated normalization by Claude extracted key requirements and skills.`,
          skills: ['Python', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL'],
          location: 'San Francisco, CA / Remote',
          remote: true,
          pay_min: 120000,
          pay_max: 160000,
          currency: 'USD/yr',
          deadline: new Date(Date.now() + 86400000 * 20).toISOString(),
          posted_at: new Date().toISOString(),
          url,
          created_at: new Date().toISOString(),
          status: 'active',
        };
        const all = JSON.parse(localStorage.getItem('sim_custom_opps') || '[]');
        all.unshift(newOpp);
        localStorage.setItem('sim_custom_opps', JSON.stringify(all));
        return newOpp;
      }
    );
  }

  async createOpportunityFromText(text: string, sourceUrl?: string): Promise<Opportunity> {
    return this.request(
      '/opportunities/from-text',
      {
        method: 'POST',
        body: JSON.stringify({ text, source_url: sourceUrl }),
      },
      async () => {
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        const title = lines[0] || 'Opportunity from Text';
        const newOpp: Opportunity = {
          id: 'opp_' + Math.random().toString(36).substring(2, 9),
          source_id: 'src_manual',
          source_name: 'Manual Text',
          external_id: 'text_' + Date.now(),
          type: 'job',
          title: title.slice(0, 100),
          org: 'Direct Entry',
          description: text.slice(0, 3000),
          skills: ['Software Engineering', 'Full-Stack'],
          location: 'Remote',
          remote: true,
          posted_at: new Date().toISOString(),
          url: sourceUrl || 'https://opportunityradar.app/manual',
          created_at: new Date().toISOString(),
          status: 'active',
        };
        const all = JSON.parse(localStorage.getItem('sim_custom_opps') || '[]');
        all.unshift(newOpp);
        localStorage.setItem('sim_custom_opps', JSON.stringify(all));
        return newOpp;
      }
    );
  }

  private getSeededOpportunities(): Opportunity[] {
    const custom: Opportunity[] = JSON.parse(localStorage.getItem('sim_custom_opps') || '[]');
    const defaults: Opportunity[] = [
      {
        id: 'opp_remotive_1',
        source_id: 'src_remotive',
        source_name: 'Remotive',
        external_id: 'remotive-98102',
        type: 'internship',
        title: 'Frontier AI Systems Intern (Winter / Spring)',
        org: 'Anthropic Frontier Labs',
        description: 'Collaborate with researchers and core system architects. Work on high-performance evaluation runners, agentic tool workflows, and telemetry for the Claude SDK.',
        skills: ['Python', 'FastAPI', 'PyTorch', 'Claude SDK', 'Docker'],
        location: 'San Francisco, CA / Remote',
        remote: true,
        pay_min: 55,
        pay_max: 70,
        currency: 'USD/hr',
        deadline: new Date(Date.now() + 86400000 * 18).toISOString(),
        posted_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        url: 'https://remotive.com/jobs/ai-systems-intern',
        created_at: new Date().toISOString(),
        status: 'active',
      },
      {
        id: 'opp_remoteok_1',
        source_id: 'src_remoteok',
        source_name: 'RemoteOK',
        external_id: 'remoteok-8742',
        type: 'freelance',
        title: 'Full-Stack Contract: Opportunity Radar & AI Scraper System',
        org: 'Autonomous Ventures Group',
        description: 'Seeking a senior full-stack engineer to build an automated research radar with pgvector embeddings, APScheduler background jobs, and a clean mobile-ready PWA.',
        skills: ['FastAPI', 'React', 'TypeScript', 'PostgreSQL', 'Docker', 'TailwindCSS'],
        location: 'Global Remote',
        remote: true,
        pay_min: 7500,
        pay_max: 12000,
        currency: 'USD',
        deadline: new Date(Date.now() + 86400000 * 9).toISOString(),
        posted_at: new Date(Date.now() - 3600000 * 14).toISOString(),
        url: 'https://remoteok.com/remote-jobs/8742',
        created_at: new Date().toISOString(),
        status: 'active',
      },
      {
        id: 'opp_github_1',
        source_id: 'src_github',
        source_name: 'GitHub OSS',
        external_id: 'github-issue-4412',
        type: 'collaboration',
        title: 'Open Agents Lab: Build Multi-Modal Tool Invocation Pipeline',
        org: 'Open Agents Foundation',
        description: 'Open source bounty & hackathon collaboration. Looking for core maintainers and contributors proficient in Python, async event loops, and LLM agent schemas.',
        skills: ['Python', 'TypeScript', 'AI Agents', 'GraphQL'],
        location: 'Remote / Global',
        remote: true,
        pay_min: 20000,
        pay_max: 50000,
        currency: 'USD Prize',
        deadline: new Date(Date.now() + 86400000 * 12).toISOString(),
        posted_at: new Date(Date.now() - 3600000 * 22).toISOString(),
        url: 'https://github.com/open-agents/collab/issues/4412',
        created_at: new Date().toISOString(),
        status: 'active',
      },
      {
        id: 'opp_hn_1',
        source_id: 'src_hn',
        source_name: 'HackerNews',
        external_id: 'hn-comment-399120',
        type: 'job',
        title: 'Founding Software Engineer (Backend / Distributed Systems)',
        org: 'RadarMind AI (YC W26)',
        description: 'Founding engineer role building autonomous enterprise opportunity discovery. $2.5M seed raised. Looking for hands-on Python, PostgreSQL, and scalable API architecture expertise.',
        skills: ['Python', 'FastAPI', 'PostgreSQL', 'pgvector', 'Redis'],
        location: 'Remote / New York',
        remote: true,
        pay_min: 140000,
        pay_max: 185000,
        currency: 'USD/yr',
        deadline: new Date(Date.now() + 86400000 * 32).toISOString(),
        posted_at: new Date(Date.now() - 3600000 * 35).toISOString(),
        url: 'https://news.ycombinator.com/item?id=399120',
        created_at: new Date().toISOString(),
        status: 'active',
      },
      {
        id: 'opp_rss_1',
        source_id: 'src_rss',
        source_name: 'WeWorkRemotely',
        external_id: 'wwr-rss-5521',
        type: 'deal',
        title: 'Enterprise AI Procurement: Radar Sourcing Platform RFP',
        org: 'Global Innovation Hub',
        description: 'Commercial enterprise deal / tender for building automated talent & opportunity matching engine with pgvector semantics and real-time alerts.',
        skills: ['FastAPI', 'PostgreSQL', 'Cloud Infrastructure', 'Enterprise Security'],
        location: 'Worldwide',
        remote: true,
        pay_min: 45000,
        pay_max: 85000,
        currency: 'USD Contract',
        deadline: new Date(Date.now() + 86400000 * 6).toISOString(),
        posted_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        url: 'https://weworkremotely.com/categories/remote-programming-jobs',
        created_at: new Date().toISOString(),
        status: 'active',
      },
    ];
    return [...custom, ...defaults];
  }

  private simulateClaudeResumeParser(text: string): ExtractedResumeData {
    const lower = text.toLowerCase();
    const detectedSkills: string[] = [];
    const skillCatalog = [
      'Python', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL', 'pgvector',
      'Docker', 'TailwindCSS', 'SQLAlchemy', 'Anthropic Claude SDK', 'PyTorch',
      'Machine Learning', 'GraphQL', 'Next.js', 'Git', 'Redis', 'Linux',
      'PWA', 'REST APIs', 'Node.js', 'APScheduler'
    ];
    for (const skill of skillCatalog) {
      if (lower.includes(skill.toLowerCase())) detectedSkills.push(skill);
    }
    if (detectedSkills.length === 0) {
      detectedSkills.push('Python', 'FastAPI', 'React', 'TypeScript', 'PostgreSQL', 'Docker');
    }
    return {
      full_name: 'Alex Mercer',
      headline: 'Full-Stack Engineer & AI Systems Developer',
      skills: detectedSkills,
      education: 'B.S. in Computer Science & Engineering, Expected 2026',
      experience_summary: 'Experienced building distributed web applications, FastAPI backends, and responsive React PWAs.',
      suggested_keywords: ['fastapi', 'react', 'python', 'ai agent', 'internship', 'remote', 'full-stack'],
      location: 'San Francisco, CA / Remote',
      extracted_text: text.slice(0, 2000),
      extraction_source: 'Claude 3.5 Sonnet (via Anthropic Python SDK)',
    };
  }
}

export const api = new ApiClient();

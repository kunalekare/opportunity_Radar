import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ExtractedResumeData, OpportunityType, Profile } from '../types';
import { RadarSweep } from '../components/RadarSweep';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Sliders,
  DollarSign,
  Briefcase,
  Layers,
  GraduationCap,
  Globe,
  Loader2,
  Check,
} from 'lucide-react';

interface OnboardingPageProps {
  onComplete: () => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Resume upload state
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionSource, setExtractionSource] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extracted & Editable Profile State
  const [fullName, setFullName] = useState<string>('');
  const [headline, setHeadline] = useState<string>('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState<string>('');
  const [education, setEducation] = useState<string>('');
  const [experienceSummary, setExperienceSummary] = useState<string>('');
  const [location, setLocation] = useState<string>('Remote / Hybrid');
  const [links, setLinks] = useState<{ github: string; linkedin: string; portfolio: string }>({
    github: 'https://github.com/developer',
    linkedin: 'https://linkedin.com/in/developer',
    portfolio: 'https://developer.me',
  });

  // Opportunity preferences
  const [opportunityTypes, setOpportunityTypes] = useState<OpportunityType[]>([
    'internship',
    'job',
    'freelance',
  ]);
  const [remoteOk, setRemoteOk] = useState<boolean>(true);
  const [minStipend, setMinStipend] = useState<number>(3500);
  const [minFreelanceBudget, setMinFreelanceBudget] = useState<number>(5000);
  const [keywordsInclude, setKeywordsInclude] = useState<string[]>(['fastapi', 'react', 'python']);
  const [newIncludeInput, setNewIncludeInput] = useState<string>('');
  const [keywordsExclude, setKeywordsExclude] = useState<string[]>(['php', 'wordpress']);
  const [newExcludeInput, setNewExcludeInput] = useState<string>('');
  const [matchThreshold, setMatchThreshold] = useState<number>(70);

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Quick Preset Resumes for instant testing
  const loadPresetResume = (preset: 'swe' | 'ml' | 'freelance') => {
    if (preset === 'swe') {
      setResumeText(
        `Alex Mercer\nSenior Full-Stack & Systems Engineer\nEmail: alex@example.com | San Francisco, CA | Remote\n\nSkills: Python, FastAPI, React, TypeScript, PostgreSQL, Docker, TailwindCSS, Redis, REST APIs, Git\n\nExperience:\n- Built distributed event-driven microservices handling 2M requests/day using FastAPI and PostgreSQL.\n- Designed reactive mobile-first PWAs and responsive dashboards in React and TypeScript.\n\nEducation:\nB.S. in Computer Science & Engineering, Top Honors.`
      );
    } else if (preset === 'ml') {
      setResumeText(
        `Evelyn Vance\nAI Agent & Systems Researcher\nEmail: evelyn@example.com | Boston, MA\n\nSkills: Python, Anthropic Claude SDK, PyTorch, LangChain, pgvector, Vector Embeddings, FastAPI, Machine Learning\n\nExperience:\n- Developed autonomous LLM agents with structured tool invocation and semantic memory.\n- Optimized vector search retrieval pipelines with PostgreSQL and pgvector.`
      );
    } else {
      setResumeText(
        `Marcus Sterling\nFreelance Full-Stack Developer & Technical Consultant\nEmail: marcus@freelance.dev | Global Remote\n\nSkills: React, TypeScript, Next.js, FastAPI, Node.js, Cloud Run, TailwindCSS, PostgreSQL\n\nExperience:\n- Shipped 12+ production SaaS MVPs and custom agency portals for YC startups.\n- 5-star rating across freelance contracts and enterprise consulting.`
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processResume = async () => {
    if (!file && !resumeText.trim()) {
      setErrorMessage('Please either select a resume PDF file or paste resume text.');
      return;
    }
    setErrorMessage(null);
    setIsExtracting(true);

    try {
      const extracted: ExtractedResumeData = await api.uploadAndParseResume(
        file || undefined,
        resumeText.trim() || undefined
      );

      setFullName(extracted.full_name || 'Builder');
      setHeadline(extracted.headline || 'Full-Stack Developer');
      setSkills(extracted.skills && extracted.skills.length > 0 ? extracted.skills : ['Python', 'React', 'FastAPI']);
      setEducation(extracted.education || '');
      setExperienceSummary(extracted.experience_summary || '');
      setLocation(extracted.location || 'Remote / Hybrid');
      setExtractionSource(extracted.extraction_source);

      if (extracted.suggested_keywords && extracted.suggested_keywords.length > 0) {
        setKeywordsInclude(Array.from(new Set([...keywordsInclude, ...extracted.suggested_keywords.slice(0, 5)])));
      }

      setStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to extract resume data. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleOpportunityType = (type: OpportunityType) => {
    if (opportunityTypes.includes(type)) {
      if (opportunityTypes.length > 1) {
        setOpportunityTypes(opportunityTypes.filter((t) => t !== type));
      }
    } else {
      setOpportunityTypes([...opportunityTypes, type]);
    }
  };

  const addSkill = () => {
    if (newSkillInput.trim() && !skills.includes(newSkillInput.trim())) {
      setSkills([...skills, newSkillInput.trim()]);
      setNewSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const addIncludeKeyword = () => {
    if (newIncludeInput.trim() && !keywordsInclude.includes(newIncludeInput.trim())) {
      setKeywordsInclude([...keywordsInclude, newIncludeInput.trim()]);
      setNewIncludeInput('');
    }
  };

  const removeIncludeKeyword = (kw: string) => {
    setKeywordsInclude(keywordsInclude.filter((k) => k !== kw));
  };

  const addExcludeKeyword = () => {
    if (newExcludeInput.trim() && !keywordsExclude.includes(newExcludeInput.trim())) {
      setKeywordsExclude([...keywordsExclude, newExcludeInput.trim()]);
      setNewExcludeInput('');
    }
  };

  const removeExcludeKeyword = (kw: string) => {
    setKeywordsExclude(keywordsExclude.filter((k) => k !== kw));
  };

  const handleFinishOnboarding = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const profilePayload: Partial<Profile> = {
        full_name: fullName,
        headline,
        skills,
        education,
        experience_summary: experienceSummary,
        links,
        location,
        remote_ok: remoteOk,
        min_stipend: minStipend,
        min_freelance_budget: minFreelanceBudget,
        opportunity_types: opportunityTypes,
        keywords_include: keywordsInclude,
        keywords_exclude: keywordsExclude,
        match_threshold: matchThreshold,
        resume_text: resumeText || (file ? `Document: ${file.name}` : undefined),
      };

      await api.completeOnboarding(profilePayload);
      await refreshProfile();
      onComplete();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save profile. Please retry.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Wizard Progress Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto mb-3">
          {[
            { num: 1, label: 'Resume Upload' },
            { num: 2, label: 'Review & Edit' },
            { num: 3, label: 'Preferences' },
            { num: 4, label: 'Activate Radar' },
          ].map((item) => (
            <div key={item.num} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  step === item.num
                    ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/20'
                    : step > item.num
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {step > item.num ? <Check className="w-4 h-4" /> : item.num}
              </div>
              <span className="hidden sm:block text-[11px] font-medium text-slate-300 mt-1">
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 1: Upload Resume or Paste */}
      {step === 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="text-center max-w-lg mx-auto space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Upload Your Resume
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Our AI extracts your core skills, education, and experience to configure your personalized opportunity radar.
            </p>
          </div>

          {/* Quick Presets Bar */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Quick Fill Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => loadPresetResume('swe')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
              >
                Full-Stack SWE
              </button>
              <button
                type="button"
                onClick={() => loadPresetResume('ml')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
              >
                AI Agent Engineer
              </button>
              <button
                type="button"
                onClick={() => loadPresetResume('freelance')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
              >
                Freelance Consultant
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File Dropzone */}
            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-slate-950/50 transition">
              <UploadCloud className="w-10 h-10 text-cyan-400 mb-2" />
              <p className="text-xs font-semibold text-slate-200 mb-1">
                Upload PDF Resume
              </p>
              <p className="text-[11px] text-slate-400 mb-4">
                Supported formats: PDF, DOCX, TXT
              </p>
              <label className="cursor-pointer px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-cyan-300 border border-slate-700 transition">
                <span>{file ? file.name : 'Choose File'}</span>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {file && (
                <span className="text-[10px] text-emerald-400 mt-2 font-medium">
                  ✓ Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>

            {/* Plain text area */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Or Paste Resume / Bio Text:
              </label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={7}
                placeholder="Paste your resume contents, LinkedIn summary, or bio here..."
                className="w-full flex-1 rounded-2xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              onClick={processResume}
              disabled={isExtracting || (!file && !resumeText.trim())}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting with Claude AI...</span>
                </>
              ) : (
                <>
                  <span>Extract Profile & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review & Edit Extracted Profile */}
      {step === 2 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Review & Edit Extracted Profile
              </h2>
              <p className="text-xs text-slate-400">
                Claude parsed this structured profile. Confirm or customize anything before proceeding.
              </p>
            </div>
            {extractionSource && (
              <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[10px] font-mono bg-cyan-950 border border-cyan-800 text-cyan-300">
                {extractionSource}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Skills Management */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Skills ({skills.length})</span>
              <span className="text-[11px] text-slate-500">Press Enter or click + to add skill</span>
            </label>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-slate-950 border border-slate-800 min-h-[56px] items-center">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-medium"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="hover:text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="Add skill..."
                  className="w-28 bg-transparent text-xs text-white placeholder-slate-600 focus:outline-none px-2 py-0.5"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="p-1 rounded-md bg-slate-800 text-cyan-400 hover:bg-slate-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Education & Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                Education
              </label>
              <textarea
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                Experience Summary
              </label>
              <textarea
                value={experienceSummary}
                onChange={(e) => setExperienceSummary(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
          </div>

          {/* Links */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              Links & Portfolio
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="GitHub URL"
                value={links.github}
                onChange={(e) => setLinks({ ...links, github: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <input
                type="text"
                placeholder="LinkedIn URL"
                value={links.linkedin}
                onChange={(e) => setLinks({ ...links, linkedin: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <input
                type="text"
                placeholder="Portfolio / Website"
                value={links.portfolio}
                onChange={(e) => setLinks({ ...links, portfolio: e.target.value })}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition"
            >
              <span>Next: Set Preferences</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Opportunity Preferences & Filters */}
      {step === 3 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Opportunity Radar Targets & Preferences
            </h2>
            <p className="text-xs text-slate-400">
              Configure the exact types of roles, deals, pay thresholds, and keywords the radar prioritizes.
            </p>
          </div>

          {/* Opportunity Types */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Opportunity Types to Scan (Select all that apply)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { type: 'internship', label: 'Internships' },
                { type: 'job', label: 'Full-Time Jobs' },
                { type: 'freelance', label: 'Freelance Gigs' },
                { type: 'deal', label: 'Deals & Tenders' },
                { type: 'collaboration', label: 'Hackathons / Collabs' },
              ].map((item) => {
                const selected = opportunityTypes.includes(item.type as OpportunityType);
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => toggleOpportunityType(item.type as OpportunityType)}
                    className={`p-3 rounded-xl text-left border transition flex flex-col justify-between ${
                      selected
                        ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Layers className={`w-4 h-4 ${selected ? 'text-cyan-400' : 'text-slate-500'}`} />
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          selected ? 'bg-cyan-500 text-slate-950 font-bold' : 'border border-slate-700'
                        }`}
                      >
                        {selected && '✓'}
                      </div>
                    </div>
                    <span className="text-xs font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remote and Pay targets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Remote Work Willingness
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="remote_ok"
                  checked={remoteOk}
                  onChange={(e) => setRemoteOk(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <label htmlFor="remote_ok" className="text-xs text-slate-300">
                  Open to remote opportunities
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                Min Monthly Stipend ($/mo)
              </label>
              <input
                type="number"
                value={minStipend}
                onChange={(e) => setMinStipend(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                Min Freelance Project ($)
              </label>
              <input
                type="number"
                value={minFreelanceBudget}
                onChange={(e) => setMinFreelanceBudget(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Keywords include / exclude */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Must-Include Keywords
              </label>
              <div className="flex flex-wrap gap-1 p-2 rounded-xl bg-slate-950 border border-slate-800 min-h-[44px] items-center">
                {keywordsInclude.map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-1"
                  >
                    +{kw}
                    <button type="button" onClick={() => removeIncludeKeyword(kw)}>
                      <X className="w-3 h-3 hover:text-rose-400" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={newIncludeInput}
                  onChange={(e) => setNewIncludeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addIncludeKeyword();
                    }
                  }}
                  placeholder="Add keyword..."
                  className="w-24 bg-transparent text-xs text-white placeholder-slate-600 focus:outline-none px-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Exclude Keywords (Negative filter)
              </label>
              <div className="flex flex-wrap gap-1 p-2 rounded-xl bg-slate-950 border border-slate-800 min-h-[44px] items-center">
                {keywordsExclude.map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-1"
                  >
                    -{kw}
                    <button type="button" onClick={() => removeExcludeKeyword(kw)}>
                      <X className="w-3 h-3 hover:text-rose-400" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={newExcludeInput}
                  onChange={(e) => setNewExcludeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addExcludeKeyword();
                    }
                  }}
                  placeholder="Exclude keyword..."
                  className="w-24 bg-transparent text-xs text-white placeholder-slate-600 focus:outline-none px-1"
                />
              </div>
            </div>
          </div>

          {/* Match Score Threshold Slider */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                AI Match Score Notification Threshold
              </span>
              <span className="text-xs font-bold text-cyan-400 px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-800">
                {matchThreshold}%
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              step="5"
              value={matchThreshold}
              onChange={(e) => setMatchThreshold(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Only opportunities scoring {matchThreshold}% and above against your profile and Claude embeddings will trigger alerts.
            </p>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition"
            >
              <span>Review & Activate</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation & Radar Calibration */}
      {step === 4 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Calibrate & Activate Radar
            </h2>
            <p className="text-xs text-slate-400">
              Your profile is verified. Initializing pgvector embeddings and background scanner adapters.
            </p>
          </div>

          <div className="flex justify-center py-4">
            <RadarSweep size="lg" active={true} />
          </div>

          {/* Profile summary card */}
          <div className="max-w-xl mx-auto rounded-2xl bg-slate-950 border border-slate-800 p-4 text-left space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <span className="font-bold text-white text-sm">{fullName}</span>
                <p className="text-[11px] text-slate-400">{headline}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                Match Threshold: {matchThreshold}%
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium">Scanning Targets:</span>{' '}
              <span className="text-slate-200 capitalize font-medium">
                {opportunityTypes.join(', ')}
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              <span className="text-slate-400 font-medium mr-1">Skills:</span>
              {skills.slice(0, 8).map((s) => (
                <span key={s} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                  {s}
                </span>
              ))}
              {skills.length > 8 && (
                <span className="text-[10px] text-slate-500">+{skills.length - 8} more</span>
              )}
            </div>

            <div className="pt-2 text-[11px] text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Guardrail Verified: Applications are prepared as drafts; manual submission required.</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-800 max-w-xl mx-auto">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={handleFinishOnboarding}
              disabled={isSaving}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-xl shadow-cyan-500/20 flex items-center gap-2 transition disabled:opacity-50 active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Save Profile & Launch Radar Feed</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

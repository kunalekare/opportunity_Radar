import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { OpportunityType, Profile } from '../types';
import {
  User as UserIcon,
  Sliders,
  DollarSign,
  Plus,
  X,
  CheckCircle2,
  Save,
  Loader2,
  GraduationCap,
  Briefcase,
  Layers,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState<string>(profile?.full_name || '');
  const [headline, setHeadline] = useState<string>(profile?.headline || '');
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [newSkill, setNewSkill] = useState<string>('');
  const [education, setEducation] = useState<string>(profile?.education || '');
  const [experienceSummary, setExperienceSummary] = useState<string>(profile?.experience_summary || '');
  const [location, setLocation] = useState<string>(profile?.location || 'Remote');
  const [remoteOk, setRemoteOk] = useState<boolean>(profile?.remote_ok ?? true);
  const [minStipend, setMinStipend] = useState<number>(profile?.min_stipend ?? 3500);
  const [minFreelanceBudget, setMinFreelanceBudget] = useState<number>(profile?.min_freelance_budget ?? 5000);
  const [opportunityTypes, setOpportunityTypes] = useState<OpportunityType[]>(
    profile?.opportunity_types || ['internship', 'job', 'freelance']
  );
  const [keywordsInclude, setKeywordsInclude] = useState<string[]>(profile?.keywords_include || []);
  const [newInclude, setNewInclude] = useState<string>('');
  const [keywordsExclude, setKeywordsExclude] = useState<string[]>(profile?.keywords_exclude || []);
  const [newExclude, setNewExclude] = useState<string>('');
  const [matchThreshold, setMatchThreshold] = useState<number>(profile?.match_threshold ?? 70);

  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setHeadline(profile.headline || '');
      setSkills(profile.skills || []);
      setEducation(profile.education || '');
      setExperienceSummary(profile.experience_summary || '');
      setLocation(profile.location || 'Remote');
      setRemoteOk(profile.remote_ok ?? true);
      setMinStipend(profile.min_stipend ?? 3500);
      setMinFreelanceBudget(profile.min_freelance_budget ?? 5000);
      setOpportunityTypes(profile.opportunity_types || ['internship', 'job', 'freelance']);
      setKeywordsInclude(profile.keywords_include || []);
      setKeywordsExclude(profile.keywords_exclude || []);
      setMatchThreshold(profile.match_threshold ?? 70);
    }
  }, [profile]);

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (s: string) => {
    setSkills(skills.filter((item) => item !== s));
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      const updateData: Partial<Profile> = {
        full_name: fullName,
        headline,
        skills,
        education,
        experience_summary: experienceSummary,
        location,
        remote_ok: remoteOk,
        min_stipend: minStipend,
        min_freelance_budget: minFreelanceBudget,
        opportunity_types: opportunityTypes,
        keywords_include: keywordsInclude,
        keywords_exclude: keywordsExclude,
        match_threshold: matchThreshold,
      };

      await api.saveProfile(updateData);
      await refreshProfile();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <UserIcon className="w-6 h-6 text-cyan-400" />
            <span>Profile & Radar Settings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your credentials, target compensation, and AI match filter criteria.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Profile and radar filters updated successfully!</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Identity */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">
            Professional Identity
          </h2>
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

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Skills ({skills.length})</span>
            </label>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-slate-950 border border-slate-800 min-h-[56px] items-center">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-medium"
                >
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)}>
                    <X className="w-3 h-3 hover:text-rose-400" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Education</label>
              <textarea
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Experience</label>
              <textarea
                value={experienceSummary}
                onChange={(e) => setExperienceSummary(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Radar Filters & Thresholds */}
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">
            Radar Scanner Targets
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Opportunity Categories
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { type: 'internship', label: 'Internships' },
                { type: 'job', label: 'Full-Time' },
                { type: 'freelance', label: 'Freelance Gigs' },
                { type: 'deal', label: 'Deals/Tenders' },
                { type: 'collaboration', label: 'Hackathons' },
              ].map((item) => {
                const selected = opportunityTypes.includes(item.type as OpportunityType);
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => toggleOpportunityType(item.type as OpportunityType)}
                    className={`p-2.5 rounded-xl text-center border text-xs font-medium transition ${
                      selected
                        ? 'bg-cyan-950/80 border-cyan-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
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
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Min Freelance Project Budget ($)
              </label>
              <input
                type="number"
                value={minFreelanceBudget}
                onChange={(e) => setMinFreelanceBudget(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Threshold Slider */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-200">
                Match Score Alert Threshold
              </span>
              <span className="text-xs font-bold text-cyan-400 px-2.5 py-0.5 rounded-md bg-cyan-950 border border-cyan-800">
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
          </div>
        </div>
      </form>
    </div>
  );
};

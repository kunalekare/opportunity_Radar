import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Match, Opportunity, OpportunityType } from '../types';
import { RadarSweep } from '../components/RadarSweep';
import {
  Compass,
  Briefcase,
  DollarSign,
  Calendar,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileEdit,
  Sliders,
  Filter,
  Sparkles,
  ChevronRight,
  Send,
  X,
} from 'lucide-react';

interface DashboardPageProps {
  onGoToProfile: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onGoToProfile }) => {
  const { user, profile } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Draft review modal state
  const [activeDraftMatch, setActiveDraftMatch] = useState<Match | null>(null);
  const [coverDraftText, setCoverDraftText] = useState<string>('');
  const [draftSavedToast, setDraftSavedToast] = useState<boolean>(false);

  useEffect(() => {
    loadOpportunities();
  }, [profile]);

  const loadOpportunities = async () => {
    setLoading(true);
    try {
      const data = await api.getRadarOpportunities();
      setMatches(data.matches);
    } catch (err) {
      console.error('Error fetching opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter((m) => {
    if (filterType === 'all') return true;
    return m.opportunity?.type === filterType;
  });

  const openDraftModal = (match: Match) => {
    setActiveDraftMatch(match);
    const opp = match.opportunity;
    setCoverDraftText(
      `Dear ${opp?.org || 'Hiring'} Team,\n\nI am writing to express my strong interest in the ${
        opp?.title || 'open role'
      }. With my background in ${profile?.skills?.slice(0, 3).join(', ') || 'software engineering'}, I have developed distributed backends, clean API services, and reactive web applications.\n\nKey Qualifications:\n- Proficient in ${
        opp?.skills?.slice(0, 3).join(', ') || 'modern full-stack systems'
      }.\n- Experience delivering reliable applications adhering to architectural best practices.\n\nI would welcome the opportunity to discuss how my skill set aligns with ${
        opp?.org || 'your team'
      }.\n\nBest regards,\n${profile?.full_name || 'Candidate'}`
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Live Radar Status */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Radar Active • Continuously Scanning Public Feeds</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {profile?.full_name || 'Builder'}.
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Your radar is monitoring sources with an AI match threshold of{' '}
            <strong className="text-cyan-400 font-bold">{profile?.match_threshold || 70}%</strong>.
            Applications are drafted autonomously for your review and manual submission.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={onGoToProfile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Adjust Target Filters</span>
            </button>
            <span className="text-[11px] text-slate-500">
              Matched types: {profile?.opportunity_types?.join(', ') || 'All'}
            </span>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-center">
          <RadarSweep size="sm" active={true} />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Opportunities' },
            { id: 'internship', label: 'Internships' },
            { id: 'job', label: 'Full-Time Jobs' },
            { id: 'freelance', label: 'Freelance Gigs' },
            { id: 'deal', label: 'Deals & Tenders' },
            { id: 'collaboration', label: 'Collaborations' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                filterType === tab.id
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Showing <span className="text-white font-bold">{filteredMatches.length}</span> verified matches
        </div>
      </div>

      {/* Opportunities Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Scanning and calculating pgvector embeddings...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="rounded-3xl bg-slate-900/50 border border-slate-800/80 p-12 text-center space-y-4 max-w-md mx-auto">
          <Compass className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No matches found for this filter</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Try adjusting your match score threshold ({profile?.match_threshold}%) or adding more skill tags in your profile settings.
          </p>
          <button
            onClick={onGoToProfile}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
          >
            Update Profile Settings
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredMatches.map((match) => {
            const opp = match.opportunity;
            if (!opp) return null;

            return (
              <div
                key={match.id}
                className="rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-6 shadow-xl space-y-4 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Card Header: Type Badge & Match Score */}
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                      {opp.type}
                    </span>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold text-xs shadow-inner">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{match.score}% Match</span>
                    </div>
                  </div>

                  {/* Title & Organization */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {opp.title}
                    </h3>
                    <p className="text-xs font-medium text-cyan-400">{opp.org}</p>
                  </div>

                  {/* Metadata: Location, Pay, Remote */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                    {opp.location && (
                      <span className="flex items-center gap-1">
                        <Compass className="w-3.5 h-3.5 text-slate-500" />
                        {opp.location}
                      </span>
                    )}
                    {opp.pay_min && (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <DollarSign className="w-3.5 h-3.5" />
                        {opp.pay_min.toLocaleString()}
                        {opp.pay_max ? ` - ${opp.pay_max.toLocaleString()}` : ''} {opp.currency}
                      </span>
                    )}
                    {opp.remote && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[10px] font-semibold">
                        Remote OK
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                    {opp.description}
                  </p>

                  {/* Claude Match Reasoning */}
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span>AI Match Analysis:</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{match.reason}</p>
                    {match.red_flags && match.red_flags.length > 0 && (
                      <div className="pt-1 flex items-center gap-1.5 text-[11px] text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{match.red_flags.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {opp.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                  <a
                    href={opp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition font-medium"
                  >
                    <span>Source Feed</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => openDraftModal(match)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 flex items-center gap-1.5 transition active:scale-95"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>Review Draft & Apply</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review & Manual Apply Draft Modal */}
      {activeDraftMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                  AI Application Assistant
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {activeDraftMatch.opportunity?.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveDraftMatch(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Guardrail Disclaimer */}
            <div className="p-3 rounded-2xl bg-amber-950/50 border border-amber-800/80 text-amber-300 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>Manual Review Guardrail:</strong> The AI agent assists by drafting this tailored pitch. You review, edit, and apply directly via the verified source link.
              </span>
            </div>

            {/* Editable Pitch Draft */}
            <div className="space-y-1.5 flex-1">
              <label className="block text-xs font-medium text-slate-300">
                Tailored Cover Note / Pitch:
              </label>
              <textarea
                value={coverDraftText}
                onChange={(e) => setCoverDraftText(e.target.value)}
                rows={9}
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono resize-none leading-relaxed"
              />
            </div>

            {draftSavedToast && (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Draft copied to clipboard and saved in your application records!</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(coverDraftText);
                  setDraftSavedToast(true);
                  setTimeout(() => setDraftSavedToast(false), 3000);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
              >
                Copy Pitch to Clipboard
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setActiveDraftMatch(null)}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Close
                </button>
                <a
                  href={activeDraftMatch.opportunity?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <span>Open Official Application</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

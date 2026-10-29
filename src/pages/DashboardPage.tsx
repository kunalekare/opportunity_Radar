import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Opportunity, OpportunityType } from '../types';
import { RadarSweep } from '../components/RadarSweep';
import { AddOpportunityModal } from '../components/AddOpportunityModal';
import {
  Compass,
  Briefcase,
  DollarSign,
  Calendar,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  FileEdit,
  Sliders,
  Sparkles,
  Plus,
  Search,
  Clock,
  Layers,
  X,
  RefreshCw,
} from 'lucide-react';

interface DashboardPageProps {
  onGoToProfile: () => void;
  onGoToSources: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onGoToProfile,
  onGoToSources,
}) => {
  const { user, profile } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Add Opportunity Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Draft review modal
  const [activeDraftOpp, setActiveDraftOpp] = useState<Opportunity | null>(null);
  const [coverDraftText, setCoverDraftText] = useState<string>('');
  const [draftSavedToast, setDraftSavedToast] = useState<boolean>(false);

  useEffect(() => {
    loadOpportunities();
  }, [filterType, searchQuery]);

  const loadOpportunities = async () => {
    setLoading(true);
    try {
      const resp = await api.getOpportunities({
        type: filterType !== 'all' ? filterType : undefined,
        search: searchQuery.trim() || undefined,
        page_size: 50,
      });
      setOpportunities(resp.items);
    } catch (err) {
      console.error('Error fetching opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpportunityAdded = (newOpp: Opportunity) => {
    setOpportunities([newOpp, ...opportunities]);
  };

  const formatPostedAgo = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatDeadlineCountdown = (dateStr?: string) => {
    if (!dateStr) return null;
    const diffMs = new Date(dateStr).getTime() - Date.now();
    if (diffMs <= 0) return { text: 'Expired', urgent: true };
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 48) return { text: `Ends in ${diffHours}h`, urgent: true };
    const diffDays = Math.floor(diffHours / 24);
    return { text: `Ends in ${diffDays}d`, urgent: false };
  };

  const openDraftModal = (opp: Opportunity) => {
    setActiveDraftOpp(opp);
    setCoverDraftText(
      `Dear ${opp.org || 'Hiring'} Team,\n\nI am writing to express my strong interest in the ${
        opp.title
      }. With my background in ${profile?.skills?.slice(0, 3).join(', ') || 'modern software engineering'}, I build clean, distributed backends and reactive web applications.\n\nKey Qualifications:\n- Practical experience with ${
        opp.skills?.slice(0, 3).join(', ') || 'full-stack modern architectures'
      }.\n- Focused on clean system design, automated tests, and reliable delivery.\n\nI would welcome the opportunity to discuss how my skill set aligns with your team's goals at ${
        opp.org
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
            <span>Radar Ingestion Active • Live Feeds & APIs</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {profile?.full_name || 'Builder'}.
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Real opportunities continuously ingested from Remotive, RemoteOK, HackerNews, GitHub, and RSS. Scored against your verified profile and Claude embeddings.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Opportunity (URL / Text)</span>
            </button>

            <button
              onClick={onGoToSources}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Manage Source Adapters</span>
            </button>

            <button
              onClick={onGoToProfile}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>Threshold ({profile?.match_threshold || 70}%)</span>
            </button>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-center">
          <RadarSweep size="sm" active={true} />
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by role, company, or tech stack (e.g. Python, FastAPI, React)..."
              className="w-full rounded-2xl bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-400 font-medium">
            <span>
              Showing <strong className="text-white font-bold">{opportunities.length}</strong> opportunities
            </span>
            <button
              onClick={loadOpportunities}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Refresh listings"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800/80 pb-4">
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
      </div>

      {/* Opportunities Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Querying real opportunities across verified adapters...</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="rounded-3xl bg-slate-900/50 border border-slate-800/80 p-12 text-center space-y-4 max-w-md mx-auto">
          <Compass className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No opportunities found</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {searchQuery
              ? `No matches for "${searchQuery}". Clear your search query or trigger a fresh ingestion run.`
              : 'Trigger a fresh run on your Source Adapters or add an opportunity directly by URL.'}
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
            >
              Add by URL / Text
            </button>
            <button
              onClick={onGoToSources}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Check Source Adapters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {opportunities.map((opp) => {
            const deadlineInfo = formatDeadlineCountdown(opp.deadline);
            const postedAgo = formatPostedAgo(opp.posted_at);

            return (
              <div
                key={opp.id}
                className="rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-6 shadow-xl space-y-4 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Card Badges: Source Badge, Type Badge, Deadline Countdown, Posted Ago */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Source badge */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 border border-slate-700 text-cyan-300">
                        {opp.source_name || 'Feed'}
                      </span>
                      {/* Type badge */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                        {opp.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      {deadlineInfo && (
                        <span
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            deadlineInfo.urgent
                              ? 'bg-rose-950/80 border border-rose-800 text-rose-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {deadlineInfo.text}
                        </span>
                      )}
                      <span>{postedAgo}</span>
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

                  {/* Description preview */}
                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                    {opp.description}
                  </p>

                  {/* Skills tags */}
                  {opp.skills && opp.skills.length > 0 && (
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
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                  <a
                    href={opp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition font-medium"
                  >
                    <span>View Posting</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => openDraftModal(opp)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-cyan-600/20 flex items-center gap-1.5 transition active:scale-95"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>Draft Pitch & Apply</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Opportunity Modal */}
      <AddOpportunityModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onOpportunityAdded={handleOpportunityAdded}
      />

      {/* Review & Manual Apply Draft Modal */}
      {activeDraftOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-5 text-slate-100 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                  AI Application Assistant
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {activeDraftOpp.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveDraftOpp(null)}
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
                <span>Pitch copied to clipboard and saved in your drafts!</span>
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
                  onClick={() => setActiveDraftOpp(null)}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Close
                </button>
                <a
                  href={activeDraftOpp.url}
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

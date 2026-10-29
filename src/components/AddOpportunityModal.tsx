import React, { useState } from 'react';
import { api } from '../services/api';
import { Opportunity } from '../types';
import {
  X,
  Link as LinkIcon,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  DollarSign,
  Compass,
} from 'lucide-react';

interface AddOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpportunityAdded: (opp: Opportunity) => void;
}

export const AddOpportunityModal: React.FC<AddOpportunityModalProps> = ({
  isOpen,
  onClose,
  onOpportunityAdded,
}) => {
  const [tab, setTab] = useState<'url' | 'text'>('url');
  const [urlInput, setUrlInput] = useState<string>('');
  const [textInput, setTextInput] = useState<string>('');
  const [sourceUrlInput, setSourceUrlInput] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedOpp, setExtractedOpp] = useState<Opportunity | null>(null);

  if (!isOpen) return null;

  const handleFetchUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setError('Please provide a valid web URL.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const opp = await api.createOpportunityFromUrl(urlInput.trim());
      setExtractedOpp(opp);
    } catch (err: any) {
      setError(
        err.message ||
          'Failed to extract web page. The site may block automated fetching. Try pasting the posting text directly using the "Paste Text" tab.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleParseText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || textInput.trim().length < 20) {
      setError('Please paste at least a couple of sentences of the opportunity description.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const opp = await api.createOpportunityFromText(
        textInput.trim(),
        sourceUrlInput.trim() || undefined
      );
      setExtractedOpp(opp);
    } catch (err: any) {
      setError(err.message || 'Failed to extract opportunity details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSave = () => {
    if (extractedOpp) {
      onOpportunityAdded(extractedOpp);
      handleClose();
    }
  };

  const handleClose = () => {
    setUrlInput('');
    setTextInput('');
    setSourceUrlInput('');
    setError(null);
    setExtractedOpp(null);
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-slate-100 max-h-[92vh] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Add Custom Opportunity to Radar</span>
            </h3>
            <p className="text-xs text-slate-400">
              Fetch from a public job link or paste text to parse with Claude AI.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        {!extractedOpp && (
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 my-4">
            <button
              type="button"
              onClick={() => {
                setTab('url');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                tab === 'url' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>From Public URL</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('text');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                tab === 'text' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste Posting Text</span>
            </button>
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div className="p-3 my-2 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="space-y-1">
              <span>{error}</span>
              {tab === 'url' && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('text');
                      setError(null);
                    }}
                    className="text-cyan-400 underline font-semibold text-[11px]"
                  >
                    Switch to Paste Text Mode →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto py-2">
          {!extractedOpp ? (
            tab === 'url' ? (
              <form onSubmit={handleFetchUrl} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Public Posting URL
                  </label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://company.com/careers/internship-2026"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter any public listing or career page URL. Robots.txt and CORS policies are respected.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Fetching and extracting with Claude...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Fetch & Extract Details</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleParseText} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Pasted Opportunity Description / Email Alert
                  </label>
                  <textarea
                    rows={6}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste job description, requirements, stipends, or collaboration call details..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Source Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={sourceUrlInput}
                    onChange={(e) => setSourceUrlInput(e.target.value)}
                    placeholder="https://linkedin.com/jobs/view/..."
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Parsing with Claude AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Extract & Verify</span>
                    </>
                  )}
                </button>
              </form>
            )
          ) : (
            /* Extracted Preview Card */
            <div className="space-y-4 rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {extractedOpp.type}
                </span>
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Successfully Extracted
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">{extractedOpp.title}</h4>
                <p className="text-xs font-medium text-cyan-400">{extractedOpp.org}</p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                {extractedOpp.location && (
                  <span className="flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-slate-500" />
                    {extractedOpp.location}
                  </span>
                )}
                {extractedOpp.pay_min && (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <DollarSign className="w-3.5 h-3.5" />
                    {extractedOpp.pay_min.toLocaleString()}
                    {extractedOpp.pay_max ? ` - ${extractedOpp.pay_max.toLocaleString()}` : ''} {extractedOpp.currency}
                  </span>
                )}
                {extractedOpp.remote && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300">
                    Remote
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                {extractedOpp.description}
              </p>

              <div className="flex flex-wrap gap-1">
                {extractedOpp.skills.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
          {extractedOpp ? (
            <>
              <button
                type="button"
                onClick={() => setExtractedOpp(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Re-enter
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Add to Feed</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

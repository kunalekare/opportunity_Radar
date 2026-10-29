import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { SourceItem, IngestionRunItem } from '../types';
import {
  Layers,
  Play,
  RotateCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  KeyRound,
  Loader2,
  Calendar,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export const SourcesPage: React.FC = () => {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [runs, setRuns] = useState<IngestionRunItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningSourceId, setRunningSourceId] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [srcList, runList] = await Promise.all([
        api.getSources(),
        api.getIngestionRuns(),
      ]);
      setSources(srcList);
      setRuns(runList);
    } catch (err: any) {
      console.error('Failed to load sources data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (source: SourceItem) => {
    const newEnabled = !source.enabled;
    try {
      const updated = await api.updateSource(source.id, { enabled: newEnabled });
      setSources(sources.map((s) => (s.id === source.id ? updated : s)));
    } catch (err: any) {
      setStatusMessage(`Failed to update ${source.name}: ${err.message}`);
    }
  };

  const handleChangeInterval = async (source: SourceItem, newInterval: number) => {
    try {
      const updated = await api.updateSource(source.id, { interval_hours: newInterval });
      setSources(sources.map((s) => (s.id === source.id ? updated : s)));
    } catch (err: any) {
      setStatusMessage(`Failed to update interval: ${err.message}`);
    }
  };

  const handleRunSource = async (source: SourceItem) => {
    setRunningSourceId(source.id);
    setStatusMessage(null);
    try {
      const run = await api.runSource(source.id);
      setStatusMessage(
        `Run finished for ${source.name}: ${run.new} new listings, ${run.duplicates} duplicates.`
      );
      await loadData();
    } catch (err: any) {
      setStatusMessage(`Error running ${source.name}: ${err.message}`);
    } finally {
      setRunningSourceId(null);
    }
  };

  const handleRunAll = async () => {
    setRunningAll(true);
    setStatusMessage(null);
    try {
      const resultRuns = await api.runAllSources();
      const totalNew = resultRuns.reduce((acc, r) => acc + r.new, 0);
      const totalFetched = resultRuns.reduce((acc, r) => acc + r.fetched, 0);
      setStatusMessage(
        `All enabled sources executed: ${totalFetched} items fetched, ${totalNew} new opportunities indexed!`
      );
      await loadData();
    } catch (err: any) {
      setStatusMessage(`Error running all sources: ${err.message}`);
    } finally {
      setRunningAll(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ingestion Pipeline Engine • Phase 2</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Source Adapters & Scheduled Ingestion
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Continuous background feeds from official APIs, RSS, and public boards. Postings are normalized with Claude, deduplicated across 3 levels, and embedded into pgvector.
          </p>
        </div>

        <button
          onClick={handleRunAll}
          disabled={runningAll}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition disabled:opacity-50 shrink-0"
        >
          {runningAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Running All Sources...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Run All Enabled Sources</span>
            </>
          )}
        </button>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs underline hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Sources Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>Configured Source Adapters</span>
            <span className="text-xs text-slate-400 font-normal">({sources.length} total)</span>
          </h2>
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading sources and health status...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sources.map((src) => {
              const isRunningThis = runningSourceId === src.id;

              return (
                <div
                  key={src.id}
                  className="rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 shadow-lg space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Name, Type, On/Off toggle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm capitalize">{src.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                          {src.type}
                        </span>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={src.enabled}
                          onChange={() => handleToggleEnabled(src)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>

                    {/* Needs configuration indicator */}
                    {src.needs_config && (
                      <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-800 text-amber-300 text-[11px] space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <KeyRound className="w-3.5 h-3.5 shrink-0" />
                          <span>Needs Configuration:</span>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {src.missing_env_keys.map((k) => (
                            <span key={k} className="px-1.5 py-0.5 rounded bg-amber-900/60 font-mono text-[10px]">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interval selection */}
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Run Interval:
                      </span>
                      <select
                        value={src.interval_hours}
                        onChange={(e) => handleChangeInterval(src, Number(e.target.value))}
                        className="rounded-lg bg-slate-950 border border-slate-800 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      >
                        <option value={1}>Every 1 hr</option>
                        <option value={3}>Every 3 hrs</option>
                        <option value={6}>Every 6 hrs</option>
                        <option value={12}>Every 12 hrs</option>
                        <option value={24}>Every 24 hrs</option>
                      </select>
                    </div>

                    {/* Last run & errors */}
                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <div>
                        Last run:{' '}
                        {src.last_run_at
                          ? new Date(src.last_run_at).toLocaleTimeString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Never run'}
                      </div>
                      {src.last_error && (
                        <div className="text-rose-400 line-clamp-2">
                          Error: {src.last_error}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        src.enabled ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {src.enabled ? 'Active' : 'Disabled'}
                    </span>

                    <button
                      onClick={() => handleRunSource(src)}
                      disabled={isRunningThis || !src.enabled}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-40"
                    >
                      {isRunningThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                          <span>Ingesting...</span>
                        </>
                      ) : (
                        <>
                          <RotateCw className="w-3 h-3 text-cyan-400" />
                          <span>Run Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Ingestion Runs Table */}
      <div className="space-y-4 pt-4">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <span>Recent Ingestion Run Logs</span>
          <span className="text-xs text-slate-400 font-normal">({runs.length} runs recorded)</span>
        </h2>

        <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Fetched</th>
                  <th className="py-3 px-4">New</th>
                  <th className="py-3 px-4">Duplicates</th>
                  <th className="py-3 px-4">Claude Tokens</th>
                  <th className="py-3 px-4">Executed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No ingestion runs recorded yet.
                    </td>
                  </tr>
                ) : (
                  runs.slice(0, 15).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        {r.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Success
                          </span>
                        ) : r.status === 'partial' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                            <AlertTriangle className="w-3 h-3" />
                            Config Req
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
                            <XCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold font-sans text-white">
                        {r.source_name || r.source_id}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{r.fetched}</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">+{r.new}</td>
                      <td className="py-3 px-4 text-slate-400">{r.duplicates}</td>
                      <td className="py-3 px-4 text-cyan-400">
                        {r.tokens_used > 0 ? `${r.tokens_used} tok` : '0 (cached/complete)'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">
                        {new Date(r.started_at).toLocaleTimeString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

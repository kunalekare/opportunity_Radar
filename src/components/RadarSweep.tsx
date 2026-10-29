import React from 'react';

interface RadarSweepProps {
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const RadarSweep: React.FC<RadarSweepProps> = ({ size = 'md', active = true }) => {
  const dimensionClass = {
    sm: 'w-16 h-16',
    md: 'w-48 h-48',
    lg: 'w-72 h-72',
  }[size];

  return (
    <div className={`relative ${dimensionClass} rounded-full border border-cyan-500/30 bg-slate-950/80 p-2 shadow-2xl overflow-hidden flex items-center justify-center`}>
      {/* Concentric rings */}
      <div className="absolute inset-2 rounded-full border border-slate-800" />
      <div className="absolute inset-8 rounded-full border border-slate-800/80 border-dashed" />
      <div className="absolute inset-16 rounded-full border border-cyan-500/20" />
      <div className="absolute inset-24 rounded-full border border-cyan-500/30" />

      {/* Axis crosshairs */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full h-[1px] bg-slate-800/80" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-full w-[1px] bg-slate-800/80" />
      </div>

      {/* Rotating Sweep Beam */}
      {active && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none animate-[spin_4s_linear_infinite]"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(6, 182, 212, 0.25) 350deg, rgba(56, 189, 248, 0.7) 360deg)',
          }}
        />
      )}

      {/* Center blip */}
      <div className="relative z-10 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#38bdf8] ring-2 ring-cyan-200/50" />

      {/* Opportunity blips */}
      {active && (
        <>
          <div className="absolute top-[28%] right-[32%] w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-ping" />
          <div className="absolute top-[28%] right-[32%] w-2.5 h-2.5 rounded-full bg-emerald-400" />

          <div className="absolute bottom-[35%] left-[26%] w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
          <div className="absolute top-[65%] right-[22%] w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8]" />
        </>
      )}
    </div>
  );
};

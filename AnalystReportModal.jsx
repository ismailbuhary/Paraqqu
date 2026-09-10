/**
 * Renders the structured Senior Network Intelligence Analyst Report
 * @param {Object} props.report - The JSON report returned from /api/assistant/chat
 * @param {Function} props.onApplyControl - Handler to execute suggested control action
 */
export function AnalystReportView({ report, onApplyControl }) {
  if (!report) return null;

  const { incident, evidence, impact, rootCause, recommendation, controlAction } = report;

  // Determine badge styling based on Confidence Level
  const confidenceColorMap = {
    HIGH: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    LOW: 'bg-rose-500/20 text-rose-400 border-rose-500/40'
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-slate-200 font-sans shadow-2xl max-w-4xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded border border-cyan-500/30 text-cyan-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-wide text-white uppercase">
              Senior Network Intelligence Analyst Report
            </h2>
            <p className="text-xs text-slate-400">Amazen N-Series Real-Time Telemetry Correlation</p>
          </div>
        </div>
        <span className="text-xs font-mono bg-slate-800 text-slate-400 px-3 py-1 rounded border border-slate-700">
          STATUS: VERIFIED
        </span>
      </div>

      {/* SECTION 1: INCIDENT */}
      <div className="space-y-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
          <span>●</span> INCIDENT
        </h3>
        <p className="text-sm font-medium text-slate-100 leading-relaxed bg-slate-950/50 p-3 rounded border border-slate-800/80">
          {incident}
        </p>
      </div>

      {/* SECTION 2: EVIDENCE */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
          <span>●</span> EVIDENCE (Observed Telemetry)
        </h3>
        <ul className="grid grid-cols-1 gap-2 text-xs font-mono bg-slate-950/50 p-3 rounded border border-slate-800/80 text-slate-300">
          {evidence?.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-cyan-500 font-bold">›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* SECTION 3: IMPACT */}
      <div className="space-y-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
          <span>●</span> BUSINESS & SERVICE IMPACT
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded border border-slate-800/80">
          {impact}
        </p>
      </div>

      {/* SECTION 4: ROOT CAUSE */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
            <span>●</span> ROOT CAUSE ANALYSIS
          </h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${confidenceColorMap[rootCause?.confidenceLevel] || 'bg-slate-800'}`}>
            CONFIDENCE: {rootCause?.confidenceLevel || 'N/A'}
          </span>
        </div>
        <p className="text-sm text-slate-300 bg-slate-950/50 p-3 rounded border border-slate-800/80">
          {rootCause?.explanation}
        </p>
      </div>

      {/* SECTION 5: RECOMMENDATION */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <span>●</span> RECOMMENDED ENGINEERING STEPS
        </h3>
        <ol className="space-y-2 text-xs text-slate-300 bg-slate-950/50 p-3 rounded border border-slate-800/80">
          {recommendation?.map((step, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="font-bold text-emerald-500">{idx + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* SECTION 6: CONTROL ACTION (Explicit execution distinction) */}
      {controlAction?.isSuggested && (
        <div className="space-y-3 bg-slate-950 p-4 rounded-lg border border-cyan-500/30">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>⚡</span> SUGGESTED NETWORK CONTROL ACTION
            </h3>
            {/* Explicit Guardrail Badge */}
            <span className="text-[10px] font-bold tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded">
              PROPOSED — NOT EXECUTED
            </span>
          </div>

          <p className="text-xs text-slate-400">{controlAction.description}</p>

          {controlAction.syntax && (
            <div className="relative">
              <pre className="bg-slate-900 text-cyan-300 font-mono text-xs p-3 rounded border border-slate-800 overflow-x-auto">
                {controlAction.syntax}
              </pre>
            </div>
          )}

          {/* Execution Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => onApplyControl(controlAction)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2 rounded transition-colors duration-150 flex items-center gap-2 shadow-lg shadow-cyan-900/40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Apply Control Rule Now
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
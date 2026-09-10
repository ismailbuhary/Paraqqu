import React, { useState } from 'react';

export function DPIIntelligencePanel({ dpiSessions = [] }) {
  const [selectedSession, setSelectedSession] = useState(dpiSessions[0] || null);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6 text-slate-200">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <span className="text-cyan-400">⚡</span> Deep Packet Inspection (DPI) Intelligence
          </h2>
          <p className="text-xs text-slate-400">
            Layer 7 application identification, flow metrics, and security metadata (Payload-Free).
          </p>
        </div>
        <span className="text-xs font-mono bg-cyan-950 text-cyan-400 px-3 py-1 rounded border border-cyan-800">
          INSPECTION ENGINE: ONLINE
        </span>
      </div>

      {/* Active Session Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {dpiSessions.map((session) => (
          <button
            key={session.dpiSessionId}
            onClick={() => setSelectedSession(session)}
            className={`p-3 rounded border text-left transition-all ${
              selectedSession?.dpiSessionId === session.dpiSessionId
                ? 'bg-slate-800 border-cyan-500 shadow-md'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-white">{session.applicationMetadata.application}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                session.dpiSecurityMetadata.riskScore > 50 
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                RISK: {session.dpiSecurityMetadata.riskScore}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              {session.networkAttributes.srcIp} → {session.networkAttributes.dstIp}
            </p>
          </button>
        ))}
      </div>

      {/* Selected Session Details Grid */}
      {selectedSession && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded border border-slate-800 text-xs font-mono">
          
          {/* Column 1: L3/L4 Network & App Metadata */}
          <div className="space-y-3">
            <h4 className="text-cyan-400 font-bold uppercase tracking-wider text-[11px]">Flow & Application Context</h4>
            <div className="space-y-1 text-slate-300">
              <div><span className="text-slate-500">Source:</span> {selectedSession.networkAttributes.srcIp}:{selectedSession.networkAttributes.srcPort}</div>
              <div><span className="text-slate-500">Destination:</span> {selectedSession.networkAttributes.dstIp}:{selectedSession.networkAttributes.dstPort}</div>
              <div><span className="text-slate-500">Protocol:</span> {selectedSession.networkAttributes.protocol}</div>
              <div><span className="text-slate-500">App Category:</span> {selectedSession.applicationMetadata.appCategory}</div>
              <div><span className="text-slate-500">Device Class:</span> {selectedSession.applicationMetadata.userDeviceCategory}</div>
              <div><span className="text-slate-500">QoS Tag:</span> <span className="text-emerald-400">{selectedSession.applicationMetadata.qosClassification}</span></div>
            </div>
          </div>

          {/* Column 2: Volumetrics & TLS/DNS Metadata */}
          <div className="space-y-3">
            <h4 className="text-purple-400 font-bold uppercase tracking-wider text-[11px]">Layer 7 Telemetry & Volumetrics</h4>
            <div className="space-y-1 text-slate-300">
              <div><span className="text-slate-500">Traffic Volume:</span> {(selectedSession.flowMetrics.trafficVolumeBytes / 1024 / 1024).toFixed(2)} MB</div>
              <div><span className="text-slate-500">Packet / Session Count:</span> {selectedSession.flowMetrics.packetCount.toLocaleString()} pkts / {selectedSession.flowMetrics.sessionCount} sessions</div>
              <div><span className="text-slate-500">TLS SNI:</span> <span className="text-cyan-300">{selectedSession.dpiSecurityMetadata.tlsMetadata.sni}</span></div>
              <div><span className="text-slate-500">TLS Cipher:</span> {selectedSession.dpiSecurityMetadata.tlsMetadata.cipherSuite}</div>
              <div><span className="text-slate-500">DNS Query:</span> {selectedSession.dpiSecurityMetadata.dnsMetadata.queriedDomain}</div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
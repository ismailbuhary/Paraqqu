import React, { useState } from 'react';
import { AnalystReportView } from './AnalystReportModal';

export function DashboardInvestigator() {
  const [analystReport, setAnalystReport] = useState(null);

  // Trigger AI Assistant Analysis
  async function runInvestigation(userQuery, telemetryContext) {
    const response = await fetch('http://localhost:3001/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: userQuery,
        telemetryContext: telemetryContext
      })
    });

    const data = await response.json();
    if (data.success) {
      setAnalystReport(data.report);
    }
  }

  // Handle Control Action Execution
  async function handleApplyControl(controlAction) {
    const confirmExec = window.confirm("Deploy this rule syntax directly to network hardware?");
    if (!confirmExec) return;

    const response = await fetch('http://localhost:3001/api/apply-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggestedNetworkControls: {
          description: controlAction.description,
          ruleSyntax: controlAction.syntax
        },
        targetDevice: { connectionType: 'simulation', host: 'CORE-GW-01' }
      })
    });

    const data = await response.json();
    if (data.result?.success) {
      alert(`Rule applied successfully via ${data.result.method}!`);
    }
  }

  return (
    <div className="p-6 bg-slate-950 min-h-screen">
      {analystReport && (
        <AnalystReportView 
          report={analystReport} 
          onApplyControl={handleApplyControl} 
        />
      )}
    </div>
  );
}
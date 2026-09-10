/**
 * Assembles alert context and surrounding telemetry for AI analysis
 */
export function buildAIInvestigationPrompt(selectedAlert, globalTelemetryState) {
  return {
    model: "gemini-2.5-pro",
    systemInstruction: "You are an expert AI Network Intelligence & SOC Assistant. Analyze the provided alert and surrounding network telemetry to produce a structured incident report.",
    payload: {
      triggeringEvent: {
        id: selectedAlert.id,
        timestamp: selectedAlert.timestamp,
        indicatorType: selectedAlert.indicatorType,
        severity: selectedAlert.severity,
        sourceIp: selectedAlert.sourceIp,
        destinationIp: selectedAlert.destinationIp,
        protocol: selectedAlert.protocol,
        rawDescription: selectedAlert.description
      },
      surroundingTelemetryContext: {
        activeDevices: globalTelemetryState.devices.map(d => ({
          name: d.name,
          type: d.type,
          status: d.status,
          cpuUsage: d.metrics.cpuUsagePct,
          throughputGbps: d.metrics.throughputGbps
        })),
        applicationHealth: globalTelemetryState.applicationMonitors.map(a => ({
          app: a.app,
          latencyMs: a.latencyMs,
          packetLossPct: a.packetLossPct,
          retransmissionsPct: a.retransmissionsPct
        })),
        trafficBaselines: globalTelemetryState.trafficOverview
      }
    },
    expectedOutputFormat: {
      incidentSummary: "string",
      severity: "CRITICAL | MAJOR | WARNING | MINOR",
      affectedApplications: ["array of strings"],
      affectedNetworkDevices: ["array of strings"],
      trafficEvidence: ["array of metric anomalies"],
      timeline: [{ time: "string", event: "string" }],
      possibleRootCause: "string",
      businessImpact: "string",
      recommendedRemediation: ["step-by-step resolution"],
      suggestedNetworkControls: ["firewall rule, BGP policy, or ACL snippet"]
    }
  };
}
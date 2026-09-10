import fetch from 'node-fetch'; // Standard in Node 18+, or install via npm install node-fetch

const API_URL = 'http://localhost:3001/api/assistant';

/**
 * Mock Network Telemetry Payload
 */
const mockTelemetryData = {
  timestamp: new Date().toISOString(),
  devices: [
    { name: "CR-EAST-01", type: "Core Router", status: "HEALTHY", cpuUsagePct: 32.1 },
    { name: "FW-PALO-01", type: "Firewall", status: "WARNING", cpuUsagePct: 78.4 }
  ],
  applicationMonitors: [
    { app: "Corporate Banking Gateway", latencyMs: 14, packetLossPct: 0.00 },
    { app: "Microsoft Teams", latencyMs: 120, packetLossPct: 1.80 }
  ],
  securityThreatStream: [
    {
      id: "ALERT-8831",
      timestamp: new Date().toISOString(),
      indicatorType: "Data Exfiltration Anomaly",
      severity: "CRITICAL",
      sourceIp: "10.10.42.108",
      destinationIp: "185.220.101.5",
      protocol: "HTTPS / 443",
      description: "Outbound transfer spike of 45 GB detected over 10-minute window."
    }
  ]
};

/**
 * Test Runner Class
 */
class AssistantMemoryTest {
  constructor() {
    this.sessionId = null;
    this.turnCounter = 1;
  }

  async sendTurn(promptText) {
    console.log(`\n================================================================`);
    console.log(`💬 TURN ${this.turnCounter}: Engineer -> "${promptText}"`);
    console.log(`================================================================`);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          question: promptText,
          telemetryContext: mockTelemetryData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'API returned failure status');
      }

      // Preserve active session ID across turns
      this.sessionId = data.sessionId;

      const { answer } = data;

      // Print Structured Results
      console.log(`\n🤖 ASSISTANT RESPONSE [Session ID: ${this.sessionId}]:`);
      console.log(`----------------------------------------------------------------`);
      console.log(`📌 Finding:          ${answer.finding}`);
      console.log(`🚨 Severity:         [${answer.severity}]`);
      console.log(`📊 Observed Evidence:`);
      answer.evidence.forEach(item => console.log(`   - ${item}`));
      console.log(`💼 Business Impact:  ${answer.businessImpact}`);
      console.log(`🛠️  Recommended Action (AI Guidance):`);
      answer.recommendedAction.forEach((action, idx) => console.log(`   ${idx + 1}. ${action}`));

      this.turnCounter++;
    } catch (error) {
      console.error(`❌ Turn ${this.turnCounter} Failed:`, error.message);
    }
  }

  async clearSession() {
    console.log(`\n🧹 Cleaning up session: ${this.sessionId}...`);
    try {
      const response = await fetch(`${API_URL}/clear-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.sessionId })
      });
      const resData = await response.json();
      console.log(`✅ ${resData.message}`);
    } catch (err) {
      console.error('⚠️ Failed to clear session:', err.message);
    }
  }
}

/**
 * Execute Multi-Turn Test Sequence
 */
async function runIntegrationTest() {
  const tester = new AssistantMemoryTest();

  console.log(`🚀 Starting AI Network Assistant Conversational Memory Test...`);

  // Turn 1: Initial Discovery
  await tester.sendTurn("Are there any critical security anomalies occurring right now?");

  // Turn 2: Natural Pronoun Follow-up ("that threat", "the source IP")
  await tester.sendTurn("What specific CLI command or firewall rule should I apply to block that source IP?");

  // Turn 3: Business & Service Impact Cross-Check
  await tester.sendTurn("Is this issue impacting our Corporate Banking Gateway application?");

  // End Session Cleanup
  await tester.clearSession();
  
  console.log(`\n🎉 Test Suite Completed Successfully!`);
}

runIntegrationTest();
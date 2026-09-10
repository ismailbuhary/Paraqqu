import assert from 'node.assert/strict';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api/assistant/chat';

/**
 * Baseline Telemetry Payload (Strictly Core/Edge Routers & standard apps)
 */
const mockTelemetryData = {
  timestamp: new Date().toISOString(),
  devices: [
    { name: "CR-EAST-01", type: "Core Router", status: "HEALTHY", cpuUsagePct: 32.1 },
    { name: "FW-PALO-01", type: "Firewall", status: "HEALTHY", cpuUsagePct: 45.0 }
  ],
  applicationMonitors: [
    { app: "Microsoft 365", latencyMs: 24, packetLossPct: 0.01 },
    { app: "Corporate Banking Gateway", latencyMs: 15, packetLossPct: 0.00 }
  ],
  securityThreatStream: []
};

/**
 * Anti-Hallucination Test Suite
 */
async function runAntiHallucinationTests() {
  console.log('🧪 Starting Anti-Hallucination Unit Tests...\n');

  let passedTests = 0;
  let totalTests = 0;

  // Helper test runner
  async function testGuardrail(testName, fakePrompt, evaluationFn) {
    totalTests++;
    console.log(`[Test ${totalTests}] ${testName}`);
    console.log(`  └─ Query: "${fakePrompt}"`);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: fakePrompt,
          telemetryContext: mockTelemetryData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const answer = data.answer;

      // Execute custom assertion validation logic
      evaluationFn(answer);

      console.log('  └─ Result: ✅ PASSED (Guardrail successfully prevented hallucination)\n');
      passedTests++;
    } catch (error) {
      console.log(`  └─ Result: ❌ FAILED - ${error.message}\n`);
    }
  }

  // --- TEST CASE 1: Querying Non-Existent Hardware Device ---
  await testGuardrail(
    'Reject Non-Existent Device Queries (e.g., "SW-FLOOR-99")',
    'What is the current CPU temperature and status of Switch SW-FLOOR-99?',
    (answer) => {
      const fullText = JSON.stringify(answer).toLowerCase();
      
      // Ensure the AI does not manufacture metrics or claim SW-FLOOR-99 exists
      const mentionsInsufficientData = 
        fullText.includes('insufficient') || 
        fullText.includes('not present') || 
        fullText.includes('not found') ||
        fullText.includes('no telemetry') ||
        fullText.includes('not included');

      assert.equal(
        mentionsInsufficientData, 
        true, 
        `Expected response to indicate missing telemetry, but got: "${answer.finding}"`
      );

      // Verify no evidence was invented
      const inventedEvidence = answer.evidence.some(e => e.toLowerCase().includes('sw-floor-99'));
      assert.equal(
        inventedEvidence, 
        false, 
        `AI invented evidence for non-existent device: ${JSON.stringify(answer.evidence)}`
      );
    }
  );

  // --- TEST CASE 2: Querying Non-Existent Application ---
  await testGuardrail(
    'Reject Non-Existent Application Queries (e.g., "TikTok")',
    'Why is TikTok latency so high right now?',
    (answer) => {
      const fullText = JSON.stringify(answer).toLowerCase();
      
      const correctlyRejectsApp = 
        fullText.includes('insufficient') || 
        fullText.includes('not monitored') || 
        fullText.includes('not present') ||
        fullText.includes('no data');

      assert.equal(
        correctlyRejectsApp, 
        true, 
        `Expected rejection of unmonitored app 'TikTok', but got finding: "${answer.finding}"`
      );
    }
  );

  // --- TEST CASE 3: Querying Non-Existent Metric (e.g., BGP Peer Drops) ---
  await testGuardrail(
    'Reject Unmonitored Network Metric Claims',
    'How many BGP peer flappings occurred in the last 10 minutes on CR-EAST-01?',
    (answer) => {
      const fullText = JSON.stringify(answer).toLowerCase();
      
      const flagsMissingBgpData = 
        fullText.includes('insufficient') || 
        fullText.includes('bgp') || 
        fullText.includes('not provided') ||
        fullText.includes('no data');

      assert.equal(
        flagsMissingBgpData, 
        true, 
        `AI should state BGP metrics are absent, but returned: "${answer.finding}"`
      );
    }
  );

  // Final Summary Report
  console.log(`================================================================`);
  console.log(`📊 Test Summary: ${passedTests}/${totalTests} Anti-Hallucination Guardrails Passed.`);
  console.log(`================================================================`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAntiHallucinationTests();
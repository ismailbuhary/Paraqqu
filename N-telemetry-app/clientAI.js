import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize the Gemini API client using the environment variable GEMINI_API_KEY
const ai = new GoogleGenAI({});

/**
 * System prompt defining the SOC / Network Intelligence Assistant persona
 */
const SYSTEM_INSTRUCTION = `
You are an expert AI Network Intelligence & Security Operations Center (SOC) Specialist.
Your task is to analyze network telemetry alerts along with surrounding telemetry context
and produce an immediate, structured incident investigation report.

Be concise, technical, precise, and actionable. Quantify metrics wherever provided.
Provide actual syntax (e.g. Cisco CLI, Palo Alto syntax, iptables) for suggested network controls.
`;

/**
 * SSE Endpoint: Stream incident investigation analysis in real time
 */
app.post('/api/investigate-stream', async (req, res) => {
  const { triggeringEvent, surroundingTelemetryContext } = req.body;

  if (!triggeringEvent) {
    return res.status(400).json({ error: 'Missing required triggeringEvent payload.' });
  }

  // Set standard Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Construct prompt containing the event and environmental telemetry
  const prompt = `
ANALYZE THE FOLLOWING TELEMETRY INCIDENT AND PROVIDE AN INVESTIGATION REPORT:

--- TRIGGERING ALERT ---
${JSON.stringify(triggeringEvent, null, 2)}

--- SURROUNDING NETWORK TELEMETRY CONTEXT ---
${JSON.stringify(surroundingTelemetryContext, null, 2)}

--- REQUIRED REPORT SECTIONS ---
1. INCIDENT SUMMARY: High-level overview of the event.
2. SEVERITY & CALCULATED RISK SCORE: Rate severity and score out of 100.
3. AFFECTED APPLICATIONS: List affected apps based on context metrics.
4. AFFECTED NETWORK DEVICES: Identify impacted routers, firewalls, or switches.
5. TRAFFIC EVIDENCE: Highlight abnormal throughput, latency, loss, or packet spikes.
6. INCIDENT TIMELINE: Reconstruct chronological sequence leading to detection.
7. POSSIBLE ROOT CAUSE: Technical cause of the anomaly.
8. BUSINESS IMPACT: Quantify productivity, financial, or security risks.
9. RECOMMENDED REMEDIATION: Step-by-step immediate containment actions.
10. SUGGESTED NETWORK CONTROLS: Provide actionable CLI/ACL syntax, firewall rules, or SD-WAN policies to block/isolate threat.
`;

  try {
    // Call Gemini 2.5 Flash with streaming
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, // Low temperature for factual, consistent analytical reporting
      }
    });

    // Stream chunks as SSE data objects
    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    // Signal stream completion
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Gemini Streaming Error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Investigation streaming failed.', details: error.message })}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`⚡ AI Network Intelligence Server running on http://localhost:${PORT}`);
});
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

/**
 * Define the strict JSON Schema for the Incident Investigation Report
 */
const incidentReportSchema = {
  type: Type.OBJECT,
  properties: {
    incidentSummary: {
      type: Type.STRING,
      description: "High-level summary of the detected anomaly or security event.",
    },
    severity: {
      type: Type.STRING,
      enum: ["CRITICAL", "MAJOR", "WARNING", "MINOR", "INFO"],
      description: "Overall evaluated severity level.",
    },
    riskScore: {
      type: Type.INTEGER,
      description: "Calculated threat/risk score from 0 to 100.",
    },
    affectedApplications: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of applications experiencing degraded performance or involved in the alert.",
    },
    affectedNetworkDevices: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of routers, firewalls, switches, or controllers impacted.",
    },
    trafficEvidence: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Specific traffic metrics, throughput spikes, latency, or packet anomalies supporting the finding.",
    },
    timeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          timestamp: { type: Type.STRING, description: "Event timestamp (ISO format or relative time)." },
          event: { type: Type.STRING, description: "Description of chronological activity." },
        },
        required: ["timestamp", "event"],
      },
      description: "Chronological progression leading up to and during the incident.",
    },
    possibleRootCause: {
      type: Type.STRING,
      description: "Technical root cause explanation based on telemetry cross-correlation.",
    },
    businessImpact: {
      type: Type.STRING,
      description: "Potential impact on business operations, data security, user experience, or compliance.",
    },
    recommendedRemediation: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Step-by-step immediate containment and resolution instructions.",
    },
    suggestedNetworkControls: {
      type: Type.OBJECT,
      properties: {
        description: { type: Type.STRING, description: "Explanation of the network action." },
        type: { type: Type.STRING, description: "e.g., Firewall Rule, Cisco ACL, BGP Blackhole, SD-WAN Policy" },
        ruleSyntax: { type: Type.STRING, description: "Exact CLI, ACL, or firewall rule configuration snippet." },
      },
      required: ["description", "type", "ruleSyntax"],
      description: "Actionable network policy or rule to execute for mitigation.",
    },
  },
  required: [
    "incidentSummary",
    "severity",
    "riskScore",
    "affectedApplications",
    "affectedNetworkDevices",
    "trafficEvidence",
    "timeline",
    "possibleRootCause",
    "businessImpact",
    "recommendedRemediation",
    "suggestedNetworkControls",
  ],
};


/**
 * POST Endpoint: Returns structured JSON incident investigation
 */
app.post('/api/investigate', async (req, res) => {
  const { triggeringEvent, surroundingTelemetryContext } = req.body;

  if (!triggeringEvent) {
    return res.status(400).json({ error: 'Missing required triggeringEvent payload.' });
  }

  const prompt = `
ANALYZE THE TELEMETRY INCIDENT AND RETURN A STRICT STRUCTURED REPORT:

--- TRIGGERING ALERT ---
${JSON.stringify(triggeringEvent, null, 2)}

--- SURROUNDING NETWORK TELEMETRY CONTEXT ---
${JSON.stringify(surroundingTelemetryContext, null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1, // Low temperature for consistent JSON adherence
        responseMimeType: 'application/json',
        responseSchema: incidentReportSchema,
      },
    });

    // Parse the validated JSON output text directly
    const reportData = JSON.parse(response.text);
    return res.json({ success: true, report: reportData });

  } catch (error) {
    console.error('Gemini Investigation Error:', error);
    return res.status(500).json({
      error: 'Failed to generate structured incident report.',
      details: error.message,
    });
  }
});
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { executeNetworkControl } from './executor.js';
import { Type } from '@google/genai';
import { startKafkaAutoInvestigator } from './kafka-investigator.js';

// 1. CREATE THE EXPRESS INSTANCE FIRST
const app = express();
// 2. ADD MIDDLEWARE
app.use(cors());
app.use(express.json());

// Start Server and Kafka Consumer
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`⚡ AI Network Intelligence Server running on http://localhost:${PORT}`);
  
  // Start automated Kafka monitoring in background
  try {
    await startKafkaAutoInvestigator();
  } catch (err) {
    console.warn('⚠️ Kafka Connection Warning: Ensure Kafka broker is running on localhost:9092');
  }
});


// Express endpoint to trigger automated remediation
app.post('/api/apply-control', async (req, res) => {
  const { suggestedNetworkControls, targetDevice } = req.body;

  if (!suggestedNetworkControls || !suggestedNetworkControls.ruleSyntax) {
    return res.status(400).json({ error: 'Missing suggestedNetworkControls payload.' });
  }

  // Device connection parameters
  const deviceConfig = targetDevice || {
    connectionType: 'simulation', // Change to 'ssh' or 'api' for live network hardware
    host: '10.0.0.1',
    port: 22,
    username: 'admin',
    password: process.env.NETWORK_DEVICE_PASSWORD
  };

  const result = await executeNetworkControl(suggestedNetworkControls, deviceConfig);

  if (result.success) {
    res.json({
      message: 'Network control rule applied successfully.',
      result
    });
  } else {
    res.status(500).json({
      error: 'Failed to apply network control rule.',
      result
    });
  }
});
/**
 * Senior Enterprise Network Intelligence Analyst Schema
 */
const analystReportSchema = {
  type: Type.OBJECT,
  properties: {
    incident: {
      type: Type.STRING,
      description: "INCIDENT: Concise technical overview of what happened."
    },
    evidence: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "EVIDENCE: Telemetry data points supporting the finding."
    },
    impact: {
      type: Type.STRING,
      description: "IMPACT: Quantified business functions, user groups, or services affected."
    },
    rootCause: {
      type: Type.OBJECT,
      properties: {
        explanation: { 
          type: Type.STRING, 
          description: "Most likely technical explanation." 
        },
        confidenceLevel: { 
          type: Type.STRING, 
          enum: ["HIGH", "MEDIUM", "LOW"], 
          description: "Confidence rating of the root cause assessment." 
        }
      },
      required: ["explanation", "confidenceLevel"],
      description: "ROOT CAUSE: Technical cause and confidence level."
    },
    recommendation: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "RECOMMENDATION: Recommended next steps for engineering and operations."
    },
    controlAction: {
      type: Type.OBJECT,
      properties: {
        isSuggested: { type: Type.BOOLEAN },
        description: { type: Type.STRING },
        syntax: { type: Type.STRING, description: "CLI syntax, firewall rule, or BGP policy." }
      },
      required: ["isSuggested"],
      description: "CONTROL ACTION: Suggested mitigation action if appropriate."
    }
  },
  required: ["incident", "evidence", "impact", "rootCause", "recommendation", "controlAction"]
};



/**
 * Strict JSON Schema for the AI Network Assistant
 */
const assistantResponseSchema = {
  type: Type.OBJECT,
  properties: {
    finding: {
      type: Type.STRING,
      description: "Direct answer to the user's question based ONLY on the provided telemetry."
    },
    evidence: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Specific data points (observed metrics, device names, IPs) extracted from the telemetry to support the finding."
    },
    businessImpact: {
      type: Type.STRING,
      description: "How this finding affects applications, users, or business services."
    },
    severity: {
      type: Type.STRING,
      enum: ["CRITICAL", "MAJOR", "WARNING", "MINOR", "INFO", "HEALTHY"],
      description: "Calculated severity of the current situation."
    },
    recommendedAction: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "AI-generated recommendations for network operations to remediate or investigate further."
    }
  },
  required: ["finding", "evidence", "businessImpact", "severity", "recommendedAction"]
};

const ASSISTANT_SYSTEM_INSTRUCTION = `
You are the "Amazen N-Series" AI Network Intelligence Assistant. 
Your job is to answer network operator questions using ONLY the provided real-time telemetry data.

STRICT CONSTRAINTS:
1. DO NOT invent, hallucinate, or assume any network traffic, devices, or alerts that are not explicitly present in the telemetry payload.
2. If the telemetry does not contain the answer to the user's question, state: "Insufficient telemetry data available to determine this."
3. Clearly distinguish between "Observed Data" (Evidence) and "AI Recommendations" (Recommended Action).
`;

app.post('/api/assistant/chat', async (req, res) => {
  const { sessionId, question, telemetryContext } = req.body;

  if (!question || !telemetryContext) {
    return res.status(400).json({ error: 'Missing required question or telemetryContext.' });
  }

  const activeSessionId = sessionId || `session_${Date.now()}`;

  try {
    let chat;
    if (chatSessions.has(activeSessionId)) {
      chat = chatSessions.get(activeSessionId);
    } else {
      chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: SENIOR_ANALYST_SYSTEM_INSTRUCTION,
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: analystReportSchema,
        }
      });
      chatSessions.set(activeSessionId, chat);
    }

    const promptWithContext = `
--- LIVE TELEMETRY PAYLOAD ---
${JSON.stringify(telemetryContext, null, 2)}

--- OPERATOR INQUIRY ---
"${question}"
`;

    const response = await chat.sendMessage({ message: promptWithContext });
    const parsedReport = JSON.parse(response.text);

    return res.json({
      success: true,
      sessionId: activeSessionId,
      report: parsedReport
    });

  } catch (error) {
    console.error('Analyst Engine Error:', error);
    return res.status(500).json({ error: 'Failed to complete analysis.', details: error.message });
  }
});

/**
 * POST Endpoint: Conversational AI Assistant
 */
app.post('/api/assistant', async (req, res) => {
  const { question, telemetryContext } = req.body;

  if (!question || !telemetryContext) {
    return res.status(400).json({ error: 'Missing question or telemetryContext.' });
  }

  const prompt = `
USER QUESTION: "${question}"

CURRENT NETWORK TELEMETRY STATE:
${JSON.stringify(telemetryContext, null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: ASSISTANT_SYSTEM_INSTRUCTION,
        temperature: 0.1, // Near zero to prevent hallucinations
        responseMimeType: 'application/json',
        responseSchema: assistantResponseSchema,
      },
    });

    const reportData = JSON.parse(response.text);
    return res.json({ success: true, answer: reportData });

  } catch (error) {
    console.error('AI Assistant Error:', error);
    return res.status(500).json({
      error: 'Failed to generate assistant response.',
      details: error.message,
    });
  }
});
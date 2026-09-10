import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({});

const executiveStatusSchema = {
  type: Type.OBJECT,
  properties: {
    overallStatus: { 
      type: Type.STRING, 
      enum: ["Optimal", "Degraded", "At Risk", "Critical State"],
      description: "Short global network health verdict." 
    },
    summaryLead: { 
      type: Type.STRING, 
      description: "Executive count lead, e.g., 'Three significant conditions require attention.'" 
    },
    conditions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Short condition name" },
          detail: { type: Type.STRING, description: "Metric change or observed anomaly" },
          category: { type: Type.STRING, enum: ["Performance", "Congestion", "Security", "Infrastructure"] }
        },
        required: ["title", "detail", "category"]
      }
    },
    recommendedPriority: { 
      type: Type.STRING, 
      description: "Clear prioritized action sentence for operators." 
    }
  },
  required: ["overallStatus", "summaryLead", "conditions", "recommendedPriority"]
};

app.post('/api/network-status-summary', async (req, res) => {
  const { liveTelemetryState } = req.body;

  const prompt = `
Analyze the provided simulated enterprise network environment and produce an executive situational awareness report:

CURRENT NETWORK ENVIRONMENT STATE:
${JSON.stringify(liveTelemetryState, null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are an Executive Network Intelligence AI. Synthesize network telemetry into plain-language, high-impact situational awareness assessments.",
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: executiveStatusSchema
      }
    });

    res.json({ success: true, report: JSON.parse(response.text) });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate summary", details: error.message });
  }
});
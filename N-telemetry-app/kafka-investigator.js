import { Kafka } from 'kafkajs';
import { GoogleGenAI, Type } from '@google/genai';
import { executeNetworkControl } from './executor.js'; // Optional auto-remediation

// Initialize Gemini Client
const ai = new GoogleGenAI({});

// Initialize Kafka Client
const kafka = new Kafka({
  clientId: 'amazen-intelligence-engine',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'noc-ai-analyst-group' });

/**
 * Strict JSON Schema enforcing the Senior Network Intelligence Analyst report format
 */
const incidentInvestigationSchema = {
  type: Type.OBJECT,
  properties: {
    incident: { type: Type.STRING, description: "INCIDENT: Concise technical overview of what happened." },
    severity: { type: Type.STRING, enum: ["CRITICAL", "MAJOR", "WARNING", "MINOR", "INFO"] },
    affectedApplications: { type: Type.ARRAY, items: { type: Type.STRING } },
    affectedNetworkDevices: { type: Type.ARRAY, items: { type: Type.STRING } },
    evidence: { type: Type.ARRAY, items: { type: Type.STRING }, description: "EVIDENCE: Observed metrics supporting finding." },
    timeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { timestamp: { type: Type.STRING }, event: { type: Type.STRING } },
        required: ["timestamp", "event"]
      }
    },
    rootCause: {
      type: Type.OBJECT,
      properties: {
        explanation: { type: Type.STRING },
        confidenceLevel: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] }
      },
      required: ["explanation", "confidenceLevel"]
    },
    impact: { type: Type.STRING, description: "IMPACT: Quantified business functions or SLA degradation." },
    recommendation: { type: Type.ARRAY, items: { type: Type.STRING } },
    controlAction: {
      type: Type.OBJECT,
      properties: {
        isSuggested: { type: Type.BOOLEAN },
        description: { type: Type.STRING },
        syntax: { type: Type.STRING, description: "CLI syntax, firewall rule, or BGP policy." }
      },
      required: ["isSuggested", "description"]
    }
  },
  required: [
    "incident", "severity", "affectedApplications", "affectedNetworkDevices",
    "evidence", "timeline", "rootCause", "impact", "recommendation", "controlAction"
  ]
};

const SYSTEM_INSTRUCTION = `
You are a Senior Enterprise Network Intelligence Analyst.
Analyze the incoming security threat payload and surrounding device metrics.
Produce a concise, technical report adhering strictly to the requested schema.
NEVER state that a control action has been executed unless explicitly confirmed in the telemetry.
`;

/**
 * Invokes Gemini 2.5 Flash to analyze the critical event
 */
async function analyzeCriticalEvent(alertPayload) {
  console.log(`\n🚨 [AUTO-INVESTIGATION TRIGGERED] Processing Event ID: ${alertPayload.id || alertPayload.eventId}`);

  const prompt = `
CRITICAL TELEMETRY ALERT RECEIVED FROM KAFKA STREAM:

--- TRIGGERING EVENT ---
${JSON.stringify(alertPayload, null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: incidentInvestigationSchema
      }
    });

    const report = JSON.parse(response.text);

    console.log(`\n================================================================`);
    console.log(`🤖 AI ANALYST AUTOMATED REPORT [Severity: ${report.severity}]`);
    console.log(`================================================================`);
    console.log(`📌 INCIDENT:   ${report.incident}`);
    console.log(`🔍 ROOT CAUSE: ${report.rootCause.explanation} (Confidence: ${report.rootCause.confidenceLevel})`);
    console.log(`💼 IMPACT:     ${report.impact}`);
    console.log(`🛠️  RECOMMENDED CONTROL: ${report.controlAction.description}`);
    if (report.controlAction.syntax) {
      console.log(`   Syntax:\n${report.controlAction.syntax}`);
    }
    console.log(`================================================================\n`);

    return report;

  } catch (error) {
    console.error('❌ AI Auto-Investigation Error:', error.message);
    return null;
  }
}

/**
 * Starts the Kafka Subscriber Loop
 */
export async function startKafkaAutoInvestigator() {
  await consumer.connect();
  console.log('⚡ Connected to Kafka Broker. Subscribing to "network-telemetry" topic...');

  await consumer.subscribe({ topic: 'network-telemetry', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const payload = JSON.parse(message.value.toString());

        // Filter for Critical Severity Threats
        if (payload.severity === 'CRITICAL' || payload.indicatorType?.includes('Anomaly')) {
          const report = await analyzeCriticalEvent(payload);
          
          // Optional: Store report in database/Elasticsearch or emit via WebSockets
          // emitToDashboardSocket(report);
        }
      } catch (err) {
        console.error('Error parsing Kafka message:', err.message);
      }
    }
  });
}

// Allow direct execution from CLI
if (process.argv[1].endsWith('kafka-investigator.js')) {
  startKafkaAutoInvestigator().catch(console.error);
}
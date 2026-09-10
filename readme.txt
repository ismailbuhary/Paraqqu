npm install express cors @google/genai
Initialize the Gemini API client using the environment variable
export GEMINI_API_KEY="your-api-key-here" // this is 
production-ready Node.js Express endpoint using the official @google/genai SDK that receives your telemetry context, calls Gemini 2.5 Flash, and streams back the incident investigation report in real time using Server-Sent Events (SSE).
npm install ssh2

AI integration : You can test both the AI Investigation and Automated Control endpoints using curl or VS Code's REST Client extension.


.. test investigate using AI
curl -X POST http://localhost:3001/api/investigate \
  -H "Content-Type: application/json" \
  -d '{
    "triggeringEvent": {
      "id": "ALT-9902",
      "timestamp": "2026-09-09T21:45:00Z",
      "indicatorType": "Data Exfiltration Anomaly",
      "severity": "CRITICAL",
      "sourceIp": "192.168.10.45",
      "destinationIp": "198.51.100.14",
      "protocol": "TCP/443",
      "rawDescription": "Unusual outbound data spike exceeding baseline by 450%."
    },
    "surroundingTelemetryContext": {
      "activeDevices": [{ "name": "EDGE-GW-01", "type": "Firewall", "status": "WARN", "metrics": { "cpuUsagePct": 88, "throughputGbps": 9.4 } }],
      "applicationMonitors": [{ "app": "Banking API", "latencyMs": 340, "packetLossPct": 2.1 }]
    }
  }'
// Send test critical event to Kafka
import { sendTelemetryToKafka } from './producer.js';

sendTelemetryToKafka({
  id: "ALT-2026-9901",
  timestamp: new Date().toISOString(),
  indicatorType: "BGP Route Hijack Anomaly",
  severity: "CRITICAL",
  sourceIp: "198.51.100.99",
  destinationIp: "10.0.0.1",
  description: "Unauthorized AS-PATH advertisement detected for core prefix 10.0.0.0/8"
});
// test-kafka.js
import { sendTelemetryToKafka } from './producer.js';

const sampleData = {
  id: 'dev-core-rt-01',
  deviceName: 'CR-EAST-01',
  throughputGbps: 42.8,
  timestamp: new Date().toISOString()
};

// Fire test event
sendTelemetryToKafka(sampleData);
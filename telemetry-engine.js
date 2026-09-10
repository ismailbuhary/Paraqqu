import { Kafka } from 'kafkajs';
import { Client as ESClient } from '@elastic/elasticsearch';
import { randomUUID } from 'crypto';

// Initialize Clients
const kafka = new Kafka({ clientId: 'telemetry-engine', brokers: ['localhost:9092'] });
const producer = kafka.producer();

const esClient = new ESClient({ node: 'http://localhost:9200' });

/**
 * Maps security severity string to ECS numeric severity standard (1-100)
 */
function mapSeverityToECS(severity) {
  const map = { INFO: 21, WARNING: 41, MINOR: 51, MAJOR: 71, CRITICAL: 91 };
  return map[severity] || 10;
}

/**
 * Transforms standard telemetry into Elastic Common Schema (ECS)
 */
export function formatForElasticsearch(rawEvent) {
  const isAlert = Boolean(rawEvent.indicatorType);
  
  return {
    '@timestamp': rawEvent.timestamp || new Date().toISOString(),
    event: {
      kind: isAlert ? 'alert' : 'metric',
      category: isAlert ? ['network', 'intrusion_detection'] : ['network', 'traffic'],
      type: isAlert ? ['indicator'] : ['info'],
      severity: mapSeverityToECS(rawEvent.severity || 'INFO')
    },
    observer: {
      hostname: rawEvent.deviceName || 'engine-core',
      ip: rawEvent.ip || '10.0.0.1',
      type: rawEvent.deviceType || 'telemetry-generator'
    },
    source: rawEvent.sourceIp ? { ip: rawEvent.sourceIp } : undefined,
    destination: rawEvent.destinationIp ? { ip: rawEvent.destinationIp } : undefined,
    network: {
      application: rawEvent.app || 'N/A',
      transport: rawEvent.protocol ? rawEvent.protocol.split('/')[0].trim() : 'TCP'
    },
    metrics: {
      latency_ms: rawEvent.latencyMs,
      packet_loss_pct: rawEvent.packetLossPct,
      jitter_ms: rawEvent.jitterMs,
      throughput_mbps: rawEvent.throughputMbps
    },
    message: rawEvent.description || `${rawEvent.app || 'Device'} operational metric telemetry`
  };
}

/**
 * Transforms telemetry into a Kafka Topic Payload
 */
export function formatForKafka(rawEvent, topicName = 'network-telemetry') {
  const eventId = randomUUID();
  const timestamp = rawEvent.timestamp || new Date().toISOString();
  const partitionKey = rawEvent.id || rawEvent.app || rawEvent.sourceIp || 'global';

  return {
    topic: topicName,
    messages: [
      {
        key: partitionKey,
        value: JSON.stringify({
          event_id: eventId,
          schema_version: '1.0.0',
          timestamp: timestamp,
          partition_key: partitionKey,
          payload_type: rawEvent.indicatorType ? 'security_alert' : rawEvent.app ? 'app_metric' : 'device_metric',
          payload: rawEvent
        }),
        headers: {
          'content-type': 'application/json',
          'source-system': 'telemetry-sim-engine'
        }
      }
    ]
  };
}

/**
 * Example Ingestion Dispatcher
 */
export async function streamTelemetryBatch(telemetryItems) {
  await producer.connect();

  const esBulkBody = [];

  for (const item of telemetryItems) {
    // 1. Publish to Kafka
    const kafkaMsg = formatForKafka(item, 'network-telemetry-stream');
    await producer.send(kafkaMsg);

    // 2. Prepare Elasticsearch Bulk Array
    const esDocument = formatForElasticsearch(item);
    const indexName = esDocument.event.kind === 'alert' 
      ? 'logs-network.alerts-default' 
      : 'metrics-network.traffic-default';

    esBulkBody.push({ index: { _index: indexName } });
    esBulkBody.push(esDocument);
  }

  // Execute Elasticsearch Bulk Ingest
  if (esBulkBody.length > 0) {
    await esClient.bulk({ refresh: true, body: esBulkBody });
  }

  await producer.disconnect();
}
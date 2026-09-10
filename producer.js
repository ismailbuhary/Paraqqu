import { Kafka, Partitioners } from 'kafkajs';

// Initialize Kafka client connected to docker-compose endpoint
const kafka = new Kafka({
  clientId: 'network-telemetry-engine',
  brokers: ['localhost:9092'], // Connects to local docker container
  retry: {
    initialRetryTime: 300,
    retries: 8
  }
});

// Use legacy partitioner to suppress Kafkajs warning
const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner
});

export async function sendTelemetryToKafka(telemetryEvent) {
  try {
    await producer.connect();

    const topic = telemetryEvent.indicatorType 
      ? 'network-alerts' 
      : 'network-metrics';

    const result = await producer.send({
      topic: topic,
      messages: [
        {
          key: telemetryEvent.id || telemetryEvent.app || 'global',
          value: JSON.stringify({
            timestamp: telemetryEvent.timestamp || new Date().toISOString(),
            data: telemetryEvent
          }),
          headers: {
            'source-system': 'telemetry-engine-node'
          }
        }
      ]
    });

    console.log(`[Kafka] Message sent to topic '${topic}':`, result[0].baseOffset);
  } catch (error) {
    console.error('[Kafka Error] Failed to publish message:', error);
  } finally {
    await producer.disconnect();
  }
}
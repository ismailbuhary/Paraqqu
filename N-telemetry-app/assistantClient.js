class NetworkAssistantClient {
  constructor(apiBaseUrl = 'http://localhost:3001') {
    this.baseUrl = apiBaseUrl;
    this.currentSessionId = null;
  }

  /**
   * Sends a query to the AI Assistant with session memory
   */
  async askQuestion(question, telemetryState) {
    try {
      const response = await fetch(`${this.baseUrl}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.currentSessionId, // Send active session ID if available
          question: question,
          telemetryContext: telemetryState
        })
      });

      const data = await response.json();

      if (data.success) {
        // Save session ID for subsequent follow-up queries
        this.currentSessionId = data.sessionId;
        return data.answer;
      } else {
        throw new Error(data.error || 'Unknown assistant error');
      }
    } catch (error) {
      console.error('Assistant Request Failed:', error);
      throw error;
    }
  }

  /**
   * Resets the conversation session
   */
  async resetSession() {
    if (!this.currentSessionId) return;

    await fetch(`${this.baseUrl}/api/assistant/clear-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.currentSessionId })
    });

    this.currentSessionId = null;
    console.log('Conversation session reset.');
  }
}

// Usage Example in Dashboard
const assistant = new NetworkAssistantClient();

// Question 1
const answer1 = await assistant.askQuestion(
  "Are there any security anomalies?",
  getLiveTelemetry()
);
console.log("Finding 1:", answer1.finding);

// Question 2 (Follow-up using natural pronouns)
const answer2 = await assistant.askQuestion(
  "How do I block the source IP responsible for that alert?",
  getLiveTelemetry()
);
console.log("Recommended Action for IP block:", answer2.recommendedAction);
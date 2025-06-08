class LLMMovementController {
  constructor({ apiUrl = 'http://localhost:11434/api/generate', model = 'llama2' } = {}) {
    this.apiUrl = apiUrl;
    this.model = model;
  }

  async generateMovementPrompt(description, currentState) {
    return `Generate a natural movement pattern for: "${description}".\nCurrent state: ${JSON.stringify(currentState)}.\nMovement should be smooth and human-like.`;
  }

  async generateMovementSequence(description, duration, currentState = {}) {
    const prompt = await this.generateMovementPrompt(description, currentState);
    try {
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, prompt, stream: false })
      });
      const data = await res.json();
      const text = data.response || data.generated_text || '';
      const movementParams = this.parseMovementOutput(text);
      return this.convertToActuatorCommands(movementParams, duration);
    } catch (error) {
      console.error('Error generating movement:', error);
      return this.generateFallbackPattern(duration);
    }
  }

  parseMovementOutput(text) {
    const params = {
      intensity: 0.5,
      frequency: 1.0,
      smoothness: 0.8,
      variation: 0.3
    };
    if (text.includes('gentle')) params.intensity *= 0.5;
    if (text.includes('intense')) params.intensity *= 1.5;
    if (text.includes('slow')) params.frequency *= 0.5;
    if (text.includes('fast')) params.frequency *= 1.5;
    if (text.includes('smooth')) params.smoothness = 1.0;
    if (text.includes('erratic')) params.variation = 0.8;
    return params;
  }

  convertToActuatorCommands(params, duration) {
    const steps = Math.floor(duration / 100);
    const commands = [];
    for (let i = 0; i < steps; i++) {
      const time = i / steps;
      const baseIntensity = params.intensity;
      const variation = Math.sin(time * Math.PI * 2 * params.frequency) * params.variation;
      const smoothness = Math.sin(time * Math.PI * 2) * (1 - params.smoothness);
      const intensity = Math.max(0, Math.min(1, baseIntensity + variation + smoothness));
      commands.push(intensity);
    }
    return commands;
  }

  generateFallbackPattern(duration) {
    const steps = Math.floor(duration / 100);
    return Array.from({ length: steps }, () => 0.5);
  }
}

export default LLMMovementController;

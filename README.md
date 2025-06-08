# vibe sequencer

## LLM Integration

This project now includes an optional pattern generator that leverages an
LLM through the [Ollama](https://ollama.ai) API. When the "LLM Generated"
mode is selected, the sequencer requests a short description from the LLM and
converts the response into a column-based vibration pattern. This allows
dynamic, natural-feeling sequences to be produced without hand-tuning.

The controller responsible for communicating with Ollama is implemented in
`LLMMovementController.js`. It sends a prompt to the API and transforms the
resulting text into actuator commands, which are then scaled to fit the grid.

### Ideas for Further Integration

- Use different prompts to match user-selected moods or tempos.
- Combine LLM-generated patterns with traditional algorithms for hybrid
  sequences.
- Cache responses to reduce API calls and create reproducible patterns.

---
name: gemini-interactions-api
description: Developer guidelines and reference for the new Gemini Interactions API, including endpoints, parameters, and pricing models.
---

# Gemini Interactions API Guidelines

The `interactions.create` endpoint is the generally available and highly recommended interface for interacting with all Gemini models and agents (including managed agents like Deep Research). It unifies text generation, multimodal inputs (image, video, audio), function calling, and agentic workflows into a single endpoint. 

When generating code or implementing API calls for the Gemini API, adhere to the following configurations and best practices.

## API Endpoint & Configuration

### State Management
* **`previous_interaction_id`**: Use this parameter to continue a conversation from a previous turn. This delegates state management to the server, meaning you do NOT need to resend the entire conversation history in every request.
* **Caching Benefit**: Relying on `previous_interaction_id` heavily optimizes implicit server-side Context Caching hit rates, dramatically lowering input token costs and latency.

### Execution & Storage Options
* **`background=true`**: Set this to `true` when initiating long-running, asynchronous tasks.
* **`store=false`**: Use this to operate in a completely stateless mode where the interaction is NOT stored on the server. 
  * *Warning:* Setting `store=false` disables the ability to use `previous_interaction_id` for subsequent turns and is strictly incompatible with `background=true`.
  * *Default Behavior:* Storage is enabled by default (`store=true`), retaining data for up to 55 days on paid tiers and 1 day on free tiers.

### Request-Scoped Parameters
The following parameters are strictly **interaction-scoped**. Even when continuing a conversation using `previous_interaction_id`, you MUST explicitly provide these parameters in your new request if they are required for the current turn:
* `tools`: The array of tools or functions available to the model.
* `system_instruction`: The system prompt guiding the model's behavior.
* `generation_config`: Configuration settings (e.g., `thinking_level`, `temperature`, `max_output_tokens`).

## Pricing Reference (Per 1 Million Tokens)

Use the following pricing reference when cost optimization, architecture decisions, or estimations are required. 

| Model | Input Cost (per 1M) | Output Cost (per 1M) |
| :--- | :--- | :--- |
| **Gemini 3.6 Flash** | $1.50 | $7.50 |
| **Gemini 3.5 Flash** | $1.50 | $9.00 |
| **Gemini 3.1 Pro Preview** | $2.00 | $12.00 |
| **Gemini 3.1 Flash-Lite** | $0.25 | $1.50 |
| **Gemini 2.5 Flash-Lite** | $0.10 | $0.40 |

> [!WARNING]
> For heavy models like **Gemini 3.1 Pro**, input/output costs may scale up (e.g., up to $4.00 / $18.00) when the prompt exceeds a 200K token context window. Take this into account when designing solutions that handle massive contexts.

## Best Practices & Implementation Rules
1. **Optimize Costs with Stateful Turns:** Always prefer using `previous_interaction_id` for multi-turn conversations rather than transmitting the entire stateless history payload.
2. **Agent & Model Chaining:** You can seamlessly chain different models and agents in the same conversation. For example, initiate a turn with a Deep Research agent to gather data, then use `previous_interaction_id` on the next turn with a standard Flash model to format or summarize the findings.
3. **Multimodal Compatibility:** When mixing models in a stateful conversation, ensure the subsequent model supports the modalities outputted by the previous turns (e.g., do not pass image outputs into a text-only or audio-only pipeline).

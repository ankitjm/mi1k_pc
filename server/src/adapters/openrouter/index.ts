import type { ServerAdapterModule } from "../types.js";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export const openRouterAdapter: ServerAdapterModule = {
  type: "openrouter",
  execute,
  testEnvironment,
  models: [
    { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4 (Anthropic)" },
    { id: "anthropic/claude-haiku-4", label: "Claude Haiku 4 (Anthropic)" },
    { id: "openai/gpt-4o", label: "GPT-4o (OpenAI)" },
    { id: "openai/gpt-4o-mini", label: "GPT-4o Mini (OpenAI)" },
    { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Google)" },
    { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Google)" },
    { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick (Meta)" },
    { id: "deepseek/deepseek-r1", label: "DeepSeek R1" },
    { id: "mistralai/mistral-large", label: "Mistral Large" },
  ],
  agentConfigurationDoc: `# openrouter agent configuration

Adapter: openrouter

Routes requests through OpenRouter to 200+ models from many providers.

Core fields:
- apiKey (string, required): your OpenRouter API key (sk-or-...)
- model (string, optional): model id in provider/model format, default anthropic/claude-sonnet-4
- maxTokens (number, optional): max output tokens, default 4096
- systemPrompt (string, optional): system prompt prepended to every request
- timeoutMs (number, optional): request timeout in milliseconds, default 120000
`,
};

import type { ServerAdapterModule } from "../types.js";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export const openaiCompatibleAdapter: ServerAdapterModule = {
  type: "openai_compatible",
  execute,
  testEnvironment,
  models: [],
  agentConfigurationDoc: `# openai_compatible agent configuration

Adapter: openai_compatible

Calls any OpenAI-compatible chat completions API (Groq, Together, Ollama, LM Studio, vLLM, etc.).

Core fields:
- baseUrl (string, required): API base URL (e.g. https://api.groq.com/openai/v1, http://localhost:11434/v1)
- apiKey (string, optional): bearer token for authentication (not needed for local endpoints)
- model (string, required): model id to use
- maxTokens (number, optional): max output tokens, default 4096
- systemPrompt (string, optional): system prompt prepended to every request
- timeoutMs (number, optional): request timeout in milliseconds, default 120000
`,
};

import type { ServerAdapterModule } from "../types.js";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";

export const claudeApiAdapter: ServerAdapterModule = {
  type: "claude_api",
  execute,
  testEnvironment,
  models: [
    { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { id: "claude-haiku-4-6", label: "Claude Haiku 4.6" },
    { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  ],
  agentConfigurationDoc: `# claude_api agent configuration

Adapter: claude_api

Calls the Anthropic Messages API directly using an API key.

Core fields:
- apiKey (string, required): your Anthropic API key (sk-ant-...)
- model (string, optional): model id, default claude-sonnet-4-6
- maxTokens (number, optional): max output tokens, default 4096
- systemPrompt (string, optional): system prompt prepended to every request
- timeoutMs (number, optional): request timeout in milliseconds, default 120000
`,
};

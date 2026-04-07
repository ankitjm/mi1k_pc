import type { AdapterExecutionContext, AdapterExecutionResult } from "../types.js";
import { asString, asNumber, renderTemplate, joinPromptSections } from "../utils.js";

/**
 * Build the user prompt from Paperclip's heartbeat context.
 * Local adapters (claude_local etc.) do this internally via their CLI;
 * API adapters must construct the prompt explicitly.
 */
function buildUserPrompt(
  config: Record<string, unknown>,
  context: Record<string, unknown>,
  agent: { id: string; name: string; companyId: string },
): string {
  // 1. Render the prompt template with agent/context variables
  const promptTemplate = asString(config.promptTemplate, "");
  const templateData: Record<string, unknown> = {
    agent: { id: agent.id, name: agent.name, companyId: agent.companyId },
    context,
  };
  const rendered = promptTemplate ? renderTemplate(promptTemplate, templateData) : "";

  // 2. Build task context from the heartbeat wake data
  const parts: string[] = [];

  if (rendered) parts.push(rendered);

  const wakeReason = asString(context.wakeReason, "");
  const issueId = asString(context.issueId, "");
  const taskKey = asString(context.taskKey, "");
  const source = asString(context.source, "");

  if (wakeReason || issueId || taskKey) {
    const contextLines: string[] = [];
    if (wakeReason) contextLines.push(`Wake reason: ${wakeReason}`);
    if (taskKey) contextLines.push(`Task: ${taskKey}`);
    if (issueId) contextLines.push(`Issue ID: ${issueId}`);
    if (source) contextLines.push(`Source: ${source}`);
    parts.push(contextLines.join("\n"));
  }

  // 3. Check for explicit prompt in context (from API calls or comments)
  const explicitPrompt = asString(context.prompt ?? context.message, "");
  if (explicitPrompt) parts.push(explicitPrompt);

  // 4. Fallback: if nothing else, use config.prompt or a default
  if (parts.length === 0) {
    const configPrompt = asString(config.prompt, "");
    if (configPrompt) return configPrompt;
    return `You are ${agent.name}. Check your current tasks and proceed with your work. Report what you've done.`;
  }

  return joinPromptSections(parts);
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { config, onLog, context, agent } = ctx;
  // Look up API key: agent-level first, then company-level
  const companyKeys = (config.paperclipCompanyApiKeys ?? {}) as Record<string, string>;
  const apiKey = asString(config.apiKey, "") || asString(companyKeys.anthropic, "");
  if (!apiKey) throw new Error("Claude API adapter requires an API key. Set it in Company Settings > Provider API Keys, or in the agent's adapter config.");

  // Model: agent-level > company policy by role > default
  const modelPolicy = (config.paperclipCompanyModelPolicy ?? {}) as Record<string, string>;
  const agentRole = asString(config.paperclipAgentRole, "general");
  const model = asString(config.model, "") || modelPolicy[agentRole] || modelPolicy["default"] || "claude-sonnet-4-6";
  const maxTokens = asNumber(config.maxTokens, 4096);
  const systemPrompt = asString(config.systemPrompt, "");
  const timeoutMs = asNumber(config.timeoutMs, 120000);

  const userMessage = buildUserPrompt(config, context as Record<string, unknown>, agent);

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: userMessage }],
  };
  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await onLog("stdout", `[claude-api] Calling ${model}...\n`);
    await onLog("stdout", `[claude-api] Prompt: ${userMessage.slice(0, 200)}${userMessage.length > 200 ? "..." : ""}\n`);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Anthropic API returned ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as {
      content: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number };
      model?: string;
    };

    const text = data.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n");

    await onLog("stdout", text + "\n");

    const usage = data.usage;

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      provider: "anthropic",
      model: data.model ?? model,
      usage: usage
        ? {
            inputTokens: usage.input_tokens ?? 0,
            outputTokens: usage.output_tokens ?? 0,
            cachedInputTokens: usage.cache_read_input_tokens ?? 0,
          }
        : undefined,
      summary: text?.slice(0, 200),
      resultJson: { response: text },
    };
  } catch (err) {
    if (controller.signal.aborted) {
      return { exitCode: 1, signal: null, timedOut: true, errorMessage: "Request timed out" };
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

import type { AdapterExecutionContext, AdapterExecutionResult } from "../types.js";
import { asString, asNumber, renderTemplate, joinPromptSections } from "../utils.js";

/**
 * Build the user prompt from Paperclip's heartbeat context.
 */
function buildUserPrompt(
  config: Record<string, unknown>,
  context: Record<string, unknown>,
  agent: { id: string; name: string; companyId: string },
): string {
  const promptTemplate = asString(config.promptTemplate, "");
  const templateData: Record<string, unknown> = {
    agent: { id: agent.id, name: agent.name, companyId: agent.companyId },
    context,
  };
  const rendered = promptTemplate ? renderTemplate(promptTemplate, templateData) : "";

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

  const explicitPrompt = asString(context.prompt ?? context.message, "");
  if (explicitPrompt) parts.push(explicitPrompt);

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
  const apiKey = asString(config.apiKey, "") || asString(companyKeys.openrouter, "");
  if (!apiKey) throw new Error("OpenRouter adapter requires an API key. Set it in Company Settings > Provider API Keys, or in the agent's adapter config.");

  // Model: agent-level > company policy by role > default
  const modelPolicy = (config.paperclipCompanyModelPolicy ?? {}) as Record<string, string>;
  const agentRole = asString(config.paperclipAgentRole, "general");
  const model = asString(config.model, "") || modelPolicy[agentRole] || modelPolicy["default"] || "anthropic/claude-sonnet-4";
  const maxTokens = asNumber(config.maxTokens, 4096);
  const systemPrompt = asString(config.systemPrompt, "");
  const timeoutMs = asNumber(config.timeoutMs, 120000);

  const userMessage = buildUserPrompt(config, context as Record<string, unknown>, agent);

  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userMessage });

  const body = {
    model,
    max_tokens: maxTokens,
    messages,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await onLog("stdout", `[openrouter] Calling ${model}...\n`);
    await onLog("stdout", `[openrouter] Prompt: ${userMessage.slice(0, 200)}${userMessage.length > 200 ? "..." : ""}\n`);

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenRouter API returned ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };

    const text = data.choices?.[0]?.message?.content ?? "";
    await onLog("stdout", text + "\n");

    const usage = data.usage;

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      provider: "openrouter",
      model: data.model ?? model,
      usage: usage
        ? {
            inputTokens: usage.prompt_tokens ?? 0,
            outputTokens: usage.completion_tokens ?? 0,
          }
        : undefined,
      summary: text.slice(0, 200),
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

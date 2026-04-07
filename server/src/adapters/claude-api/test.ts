import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "../types.js";
import { asString, parseObject } from "../utils.js";

function summarizeStatus(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((c) => c.level === "error")) return "fail";
  if (checks.some((c) => c.level === "warn")) return "warn";
  return "pass";
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = parseObject(ctx.config);
  const apiKey = asString(config.apiKey, "");
  const model = asString(config.model, "claude-sonnet-4-6");

  if (!apiKey) {
    checks.push({
      code: "claude_api_key_missing",
      level: "error",
      message: "Claude API adapter requires an API key.",
      hint: "Set adapterConfig.apiKey to your Anthropic API key (starts with sk-ant-).",
    });
    return { adapterType: ctx.adapterType, status: "fail", checks, testedAt: new Date().toISOString() };
  }

  if (!apiKey.startsWith("sk-ant-")) {
    checks.push({
      code: "claude_api_key_format",
      level: "warn",
      message: "API key does not start with 'sk-ant-'. It may be invalid.",
      hint: "Anthropic API keys typically start with sk-ant-.",
    });
  } else {
    checks.push({
      code: "claude_api_key_present",
      level: "info",
      message: "API key is configured.",
    });
  }

  checks.push({
    code: "claude_api_model",
    level: "info",
    message: `Model: ${model}`,
  });

  // Probe the API
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
      signal: controller.signal,
    });
    if (res.ok) {
      checks.push({ code: "claude_api_reachable", level: "info", message: "Anthropic API is reachable and key is valid." });
    } else if (res.status === 401) {
      checks.push({ code: "claude_api_auth_failed", level: "error", message: "API key is invalid (401 Unauthorized)." });
    } else if (res.status === 429) {
      checks.push({ code: "claude_api_rate_limited", level: "warn", message: "API returned 429 (rate limited). Key appears valid." });
    } else {
      checks.push({ code: "claude_api_unexpected_status", level: "warn", message: `API returned HTTP ${res.status}.` });
    }
  } catch (err) {
    checks.push({
      code: "claude_api_probe_failed",
      level: "warn",
      message: err instanceof Error ? err.message : "API probe failed.",
      hint: "Verify the server can reach api.anthropic.com.",
    });
  } finally {
    clearTimeout(timeout);
  }

  return { adapterType: ctx.adapterType, status: summarizeStatus(checks), checks, testedAt: new Date().toISOString() };
}

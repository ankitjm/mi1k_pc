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
  const model = asString(config.model, "anthropic/claude-sonnet-4");

  if (!apiKey) {
    checks.push({
      code: "openrouter_api_key_missing",
      level: "error",
      message: "OpenRouter adapter requires an API key.",
      hint: "Set adapterConfig.apiKey to your OpenRouter API key (starts with sk-or-).",
    });
    return { adapterType: ctx.adapterType, status: "fail", checks, testedAt: new Date().toISOString() };
  }

  checks.push({
    code: "openrouter_api_key_present",
    level: "info",
    message: "API key is configured.",
  });

  checks.push({
    code: "openrouter_model",
    level: "info",
    message: `Model: ${model}`,
  });

  // Probe the API with models endpoint
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: { authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    if (res.ok) {
      checks.push({ code: "openrouter_reachable", level: "info", message: "OpenRouter API is reachable." });
    } else if (res.status === 401) {
      checks.push({ code: "openrouter_auth_failed", level: "error", message: "API key is invalid (401)." });
    } else {
      checks.push({ code: "openrouter_unexpected_status", level: "warn", message: `API returned HTTP ${res.status}.` });
    }
  } catch (err) {
    checks.push({
      code: "openrouter_probe_failed",
      level: "warn",
      message: err instanceof Error ? err.message : "API probe failed.",
      hint: "Verify the server can reach openrouter.ai.",
    });
  } finally {
    clearTimeout(timeout);
  }

  return { adapterType: ctx.adapterType, status: summarizeStatus(checks), checks, testedAt: new Date().toISOString() };
}

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
  const baseUrl = asString(config.baseUrl, "").replace(/\/+$/, "");
  const apiKey = asString(config.apiKey, "");
  const model = asString(config.model, "");

  if (!baseUrl) {
    checks.push({
      code: "openai_compat_base_url_missing",
      level: "error",
      message: "Base URL is required.",
      hint: "Set adapterConfig.baseUrl (e.g. https://api.groq.com/openai/v1 or http://localhost:11434/v1).",
    });
    return { adapterType: ctx.adapterType, status: "fail", checks, testedAt: new Date().toISOString() };
  }

  // Validate URL
  try {
    new URL(baseUrl);
    checks.push({ code: "openai_compat_url_valid", level: "info", message: `Base URL: ${baseUrl}` });
  } catch {
    checks.push({ code: "openai_compat_url_invalid", level: "error", message: `Invalid URL: ${baseUrl}` });
    return { adapterType: ctx.adapterType, status: "fail", checks, testedAt: new Date().toISOString() };
  }

  if (!model) {
    checks.push({ code: "openai_compat_model_missing", level: "error", message: "Model is required.", hint: "Set adapterConfig.model." });
    return { adapterType: ctx.adapterType, status: "fail", checks, testedAt: new Date().toISOString() };
  }

  checks.push({ code: "openai_compat_model", level: "info", message: `Model: ${model}` });

  if (apiKey) {
    checks.push({ code: "openai_compat_key_present", level: "info", message: "API key is configured." });
  } else {
    checks.push({ code: "openai_compat_no_key", level: "info", message: "No API key set (OK for local endpoints)." });
  }

  // Probe the models endpoint
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const headers: Record<string, string> = {};
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;

    const res = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    if (res.ok) {
      checks.push({ code: "openai_compat_reachable", level: "info", message: "Endpoint is reachable." });
    } else if (res.status === 401 || res.status === 403) {
      checks.push({ code: "openai_compat_auth_failed", level: "error", message: `Auth failed (${res.status}).` });
    } else {
      checks.push({ code: "openai_compat_probe_status", level: "warn", message: `Models endpoint returned HTTP ${res.status}.` });
    }
  } catch (err) {
    checks.push({
      code: "openai_compat_probe_failed",
      level: "warn",
      message: err instanceof Error ? err.message : "Probe failed.",
      hint: "Verify the server can reach the endpoint.",
    });
  } finally {
    clearTimeout(timeout);
  }

  return { adapterType: ctx.adapterType, status: summarizeStatus(checks), checks, testedAt: new Date().toISOString() };
}

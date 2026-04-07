import type { CreateConfigValues } from "../../components/AgentConfigForm";

export function buildOpenRouterConfig(v: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  if ((v as any).apiKey) ac.apiKey = (v as any).apiKey;
  ac.model = v.model || "anthropic/claude-sonnet-4";
  ac.maxTokens = 4096;
  return ac;
}

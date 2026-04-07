import type { CreateConfigValues } from "../../components/AgentConfigForm";

export function buildOpenAICompatibleConfig(v: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  if (v.url) ac.baseUrl = v.url;
  if ((v as any).apiKey) ac.apiKey = (v as any).apiKey;
  if (v.model) ac.model = v.model;
  ac.maxTokens = 4096;
  return ac;
}

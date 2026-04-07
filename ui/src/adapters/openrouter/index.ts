import type { UIAdapterModule } from "../types";
import { parseOpenRouterStdoutLine } from "./parse-stdout";
import { OpenRouterConfigFields } from "./config-fields";
import { buildOpenRouterConfig } from "./build-config";

export const openRouterUIAdapter: UIAdapterModule = {
  type: "openrouter",
  label: "OpenRouter",
  parseStdoutLine: parseOpenRouterStdoutLine,
  ConfigFields: OpenRouterConfigFields,
  buildAdapterConfig: buildOpenRouterConfig,
};

import type { UIAdapterModule } from "../types";
import { parseOpenAICompatStdoutLine } from "./parse-stdout";
import { OpenAICompatibleConfigFields } from "./config-fields";
import { buildOpenAICompatibleConfig } from "./build-config";

export const openaiCompatibleUIAdapter: UIAdapterModule = {
  type: "openai_compatible",
  label: "OpenAI Compatible",
  parseStdoutLine: parseOpenAICompatStdoutLine,
  ConfigFields: OpenAICompatibleConfigFields,
  buildAdapterConfig: buildOpenAICompatibleConfig,
};

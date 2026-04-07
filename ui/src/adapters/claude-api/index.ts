import type { UIAdapterModule } from "../types";
import { parseClaudeApiStdoutLine } from "./parse-stdout";
import { ClaudeApiConfigFields } from "./config-fields";
import { buildClaudeApiConfig } from "./build-config";

export const claudeApiUIAdapter: UIAdapterModule = {
  type: "claude_api",
  label: "Claude API (key)",
  parseStdoutLine: parseClaudeApiStdoutLine,
  ConfigFields: ClaudeApiConfigFields,
  buildAdapterConfig: buildClaudeApiConfig,
};

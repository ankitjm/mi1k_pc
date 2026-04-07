import type { TranscriptEntry } from "../types";

export function parseOpenAICompatStdoutLine(line: string, ts: string): TranscriptEntry[] {
  if (line.startsWith("[openai-compat]")) {
    return [{ kind: "system", ts, text: line }];
  }
  return [{ kind: "assistant", ts, text: line }];
}

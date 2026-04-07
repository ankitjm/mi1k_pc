import type { TranscriptEntry } from "../types";

export function parseOpenRouterStdoutLine(line: string, ts: string): TranscriptEntry[] {
  if (line.startsWith("[openrouter]")) {
    return [{ kind: "system", ts, text: line }];
  }
  return [{ kind: "assistant", ts, text: line }];
}

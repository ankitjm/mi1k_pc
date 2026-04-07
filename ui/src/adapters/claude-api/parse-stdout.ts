import type { TranscriptEntry } from "../types";

export function parseClaudeApiStdoutLine(line: string, ts: string): TranscriptEntry[] {
  if (line.startsWith("[claude-api]")) {
    return [{ kind: "system", ts, text: line }];
  }
  return [{ kind: "assistant", ts, text: line }];
}

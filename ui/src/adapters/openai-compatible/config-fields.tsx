import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  DraftInput,
  DraftTextarea,
  DraftNumberInput,
} from "../../components/agent-config-primitives";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

export function OpenAICompatibleConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  return (
    <div className="space-y-3">
      <Field label="Base URL" hint="OpenAI-compatible API base URL (e.g. https://api.groq.com/openai/v1 or http://localhost:11434/v1).">
        <DraftInput
          value={
            isCreate
              ? values?.url ?? ""
              : eff("adapterConfig", "baseUrl", String(config.baseUrl ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ url: v })
              : mark("adapterConfig", "baseUrl", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="https://api.groq.com/openai/v1"
        />
      </Field>

      <Field label="API Key" hint="Bearer token for authentication. Leave empty for local endpoints (Ollama, LM Studio).">
        <DraftInput
          type="password"
          value={
            isCreate
              ? (values as any)?.apiKey ?? ""
              : eff("adapterConfig", "apiKey", String(config.apiKey ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ ...values } as any)
              : mark("adapterConfig", "apiKey", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="sk-... (optional for local)"
        />
      </Field>

      <Field label="Model" hint="Model ID to use (e.g. llama-3.3-70b, mixtral-8x7b-32768, gpt-4o).">
        <DraftInput
          value={
            isCreate
              ? values?.model ?? ""
              : eff("adapterConfig", "model", String(config.model ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ model: v })
              : mark("adapterConfig", "model", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="llama-3.3-70b"
        />
      </Field>

      <Field label="Max Tokens" hint="Maximum output tokens per request.">
        <DraftNumberInput
          value={
            isCreate
              ? 4096
              : Number(eff("adapterConfig", "maxTokens", config.maxTokens ?? 4096))
          }
          onCommit={(v) =>
            isCreate
              ? set!({} as any)
              : mark("adapterConfig", "maxTokens", v)
          }
          className={inputClass}
          min={1}
          max={128000}
        />
      </Field>

      <Field label="System Prompt" hint="Optional system prompt sent with every request.">
        <DraftTextarea
          value={
            isCreate
              ? ""
              : eff("adapterConfig", "systemPrompt", String(config.systemPrompt ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({} as any)
              : mark("adapterConfig", "systemPrompt", v || undefined)
          }
          placeholder="You are a helpful assistant..."
          minRows={2}
        />
      </Field>
    </div>
  );
}

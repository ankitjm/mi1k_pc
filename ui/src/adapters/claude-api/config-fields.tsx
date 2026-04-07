import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  DraftInput,
  DraftTextarea,
  DraftNumberInput,
} from "../../components/agent-config-primitives";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

export function ClaudeApiConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
  models,
}: AdapterConfigFieldsProps) {
  return (
    <div className="space-y-3">
      <Field label="API Key" hint="Your Anthropic API key (sk-ant-...). Stored in adapter config.">
        <DraftInput
          type="password"
          value={
            isCreate
              ? (values as any)?.apiKey ?? ""
              : eff("adapterConfig", "apiKey", String(config.apiKey ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ ...values, url: v } as any)
              : mark("adapterConfig", "apiKey", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="sk-ant-..."
        />
      </Field>

      <Field label="Model" hint="Claude model to use for requests.">
        <select
          className={inputClass}
          value={
            isCreate
              ? values?.model ?? "claude-sonnet-4-6"
              : eff("adapterConfig", "model", String(config.model ?? "claude-sonnet-4-6"))
          }
          onChange={(e) =>
            isCreate
              ? set!({ model: e.target.value })
              : mark("adapterConfig", "model", e.target.value)
          }
        >
          {models.length > 0
            ? models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))
            : [
                { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
                { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
                { id: "claude-haiku-4-6", label: "Claude Haiku 4.6" },
              ].map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
        </select>
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

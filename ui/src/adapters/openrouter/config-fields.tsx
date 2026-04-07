import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  DraftInput,
  DraftTextarea,
  DraftNumberInput,
} from "../../components/agent-config-primitives";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

export function OpenRouterConfigFields({
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
      <Field label="API Key" hint="Your OpenRouter API key (sk-or-...).">
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
          placeholder="sk-or-..."
        />
      </Field>

      <Field label="Model" hint="OpenRouter model in provider/model format. You can also type a custom model ID.">
        <DraftInput
          value={
            isCreate
              ? values?.model ?? "anthropic/claude-sonnet-4"
              : eff("adapterConfig", "model", String(config.model ?? "anthropic/claude-sonnet-4"))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ model: v })
              : mark("adapterConfig", "model", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="anthropic/claude-sonnet-4"
          list="openrouter-models"
        />
        {models.length > 0 && (
          <datalist id="openrouter-models">
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </datalist>
        )}
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

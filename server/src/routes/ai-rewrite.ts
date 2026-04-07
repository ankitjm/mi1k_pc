/**
 * AI Rewrite Route
 *
 * Takes text and rewrites it to be crisp, clear, and well-structured
 * using the company's OpenRouter API key with a cheap/fast model.
 */
import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { companies } from "@paperclipai/db";
import { eq } from "drizzle-orm";
import { assertCompanyAccess } from "./authz.js";

export function aiRewriteRoutes(db: Db) {
  const router = Router();

  router.post("/:companyId/ai/rewrite", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const { text, context } = req.body as { text?: string; context?: string };
    if (!text?.trim()) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    // Get company API keys
    const company = await db
      .select({ providerApiKeys: companies.providerApiKeys })
      .from(companies)
      .where(eq(companies.id, companyId))
      .then((rows) => rows[0] ?? null);

    const keys = (company?.providerApiKeys ?? {}) as Record<string, string>;
    const apiKey = keys.openrouter || keys.anthropic || "";

    if (!apiKey) {
      res.status(400).json({ error: "No API key configured. Set one in Company Settings > Provider API Keys." });
      return;
    }

    const isOpenRouter = !!keys.openrouter;
    const systemPrompt = `You are a writing assistant. Rewrite the given text to be crisp, clear, and well-structured. Keep the same meaning and intent. Do not add new information. If it's a task description, make it actionable with clear deliverables. If it's a comment, keep the tone professional but concise. Output ONLY the rewritten text, no explanations.${context ? `\n\nContext: ${context}` : ""}`;

    try {
      let rewritten: string;

      if (isOpenRouter) {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "anthropic/claude-haiku-4",
            max_tokens: 2048,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: text },
            ],
          }),
        });
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
        rewritten = data.choices?.[0]?.message?.content ?? text;
      } else {
        // Anthropic direct
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: "user", content: text }],
          }),
        });
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = (await response.json()) as { content: { type: string; text?: string }[] };
        rewritten = data.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n") ?? text;
      }

      res.json({ original: text, rewritten: rewritten.trim() });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Rewrite failed" });
    }
  });

  return router;
}

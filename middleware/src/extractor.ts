/**
 * Extractor — uses Claude to pull key decisions and outcomes from a session's
 * stdout excerpts before we rotate (clear) it.
 *
 * Intentionally cheap: uses Haiku and a tight prompt.
 */

import Anthropic from '@anthropic-ai/sdk'
import { config } from './config.ts'

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!_client) {
    if (!config.anthropicApiKey) {
      throw new Error('[extractor] ANTHROPIC_API_KEY is not set. Cannot run extraction.')
    }
    _client = new Anthropic({ apiKey: config.anthropicApiKey })
  }
  return _client
}

export interface ExtractionResult {
  agentName: string
  decisions: string[]
  blockers: string[]
  pendingWork: string[]
  keywords: string[]
  summary: string
}

export async function extractFromExcerpts(
  agentName: string,
  excerpts: string[]
): Promise<ExtractionResult> {
  const client = getClient()

  const combined = excerpts
    .filter(Boolean)
    .map((e, i) => `--- Run ${i + 1} ---\n${e}`)
    .join('\n\n')
    .slice(0, 8000)

  const prompt = `You are extracting structured knowledge from AI agent session logs for a wiki.

Agent: ${agentName}
Session logs (stdout excerpts from recent runs):

${combined}

Extract the following in JSON format:
- decisions: key decisions made (max 5, each under 15 words)
- blockers: current blockers or dependencies (max 3)
- pendingWork: work items explicitly mentioned as pending/todo (max 5)
- keywords: 5-8 topic tags (lowercase, single words or hyphenated)
- summary: 2-sentence summary of what this agent accomplished

Respond with ONLY valid JSON matching this structure:
{
  "decisions": ["..."],
  "blockers": ["..."],
  "pendingWork": ["..."],
  "keywords": ["..."],
  "summary": "..."
}`

  const msg = await client.messages.create({
    model: config.extractionModel,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'

  try {
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
    return {
      agentName,
      decisions: parsed.decisions ?? [],
      blockers: parsed.blockers ?? [],
      pendingWork: parsed.pendingWork ?? [],
      keywords: parsed.keywords ?? [],
      summary: parsed.summary ?? '',
    }
  } catch {
    return {
      agentName,
      decisions: [],
      blockers: [],
      pendingWork: [],
      keywords: [agentName.toLowerCase().replace(/\s+/g, '-')],
      summary: 'Extraction failed — raw logs preserved.',
    }
  }
}

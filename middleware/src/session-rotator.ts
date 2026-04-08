/**
 * Session Rotator
 *
 * 1. Finds agents whose most recent run exceeded the cached-token threshold.
 * 2. Reads their last N stdout_excerpts from heartbeat_runs.
 * 3. Calls the extractor to pull key decisions/outcomes.
 * 4. Writes a wiki entry preserving that knowledge.
 * 5. Clears session_id in agent_runtime_state → next run starts fresh.
 *
 * Safe: only clears session_id. Never deletes data.
 */

import { query } from './db.ts'
import { config } from './config.ts'
import { extractFromExcerpts } from './extractor.ts'
import { writeEntry } from './wiki/store.ts'

const EXCERPT_RUNS = 8   // how many recent runs to extract from

interface BloatedAgent {
  agentId: string
  agentName: string
  sessionId: string
  cachedTokens: number
  instructionsRootPath: string | null
}

export async function findBloatedAgents(): Promise<BloatedAgent[]> {
  const rows = await query<{
    agent_id: string
    agent_name: string
    session_id: string
    instructions_root: string | null
    cached_tokens: string
  }>(`
    SELECT
      a.id            AS agent_id,
      a.name          AS agent_name,
      ars.session_id,
      (a.adapter_config->>'instructionsRootPath') AS instructions_root,
      COALESCE(
        (
          SELECT hr.usage_json->>'cachedInputTokens'
          FROM heartbeat_runs hr
          WHERE hr.agent_id = a.id
            AND hr.usage_json IS NOT NULL
            AND hr.usage_json->>'cachedInputTokens' IS NOT NULL
          ORDER BY hr.started_at DESC
          LIMIT 1
        ), '0'
      ) AS cached_tokens
    FROM agents a
    JOIN agent_runtime_state ars ON ars.agent_id = a.id
    WHERE a.company_id = $1
      AND ars.session_id IS NOT NULL
  `, [config.companyId])

  return rows
    .filter(r => parseInt(r.cached_tokens) > config.sessionRotationThreshold)
    .map(r => ({
      agentId: r.agent_id,
      agentName: r.agent_name,
      sessionId: r.session_id,
      cachedTokens: parseInt(r.cached_tokens),
      instructionsRootPath: r.instructions_root,
    }))
}

export async function rotateAgent(agent: BloatedAgent, dryRun = false): Promise<void> {
  console.log(
    `[rotator] ${agent.agentName}: ${(agent.cachedTokens / 1000).toFixed(0)}K cached tokens — rotating`
  )

  // 1. Pull recent excerpts for extraction
  const excerptRows = await query<{ stdout_excerpt: string | null; started_at: string }>(`
    SELECT stdout_excerpt, started_at
    FROM heartbeat_runs
    WHERE agent_id = $1
      AND stdout_excerpt IS NOT NULL
      AND stdout_excerpt != ''
    ORDER BY started_at DESC
    LIMIT $2
  `, [agent.agentId, EXCERPT_RUNS])

  const excerpts = excerptRows.map(r => r.stdout_excerpt ?? '')

  // 2. Extract knowledge (if API key available, otherwise skip)
  let wikiPath: string | null = null
  if (config.anthropicApiKey && excerpts.length > 0) {
    try {
      const extracted = await extractFromExcerpts(agent.agentName, excerpts)

      const agentSlug = agent.agentName.toLowerCase().replace(/\s+/g, '-')
      const dateStr = new Date().toISOString().slice(0, 10)

      const body = buildWikiBody(extracted)

      wikiPath = writeEntry({
        agent: agentSlug,
        date: new Date().toISOString(),
        type: 'session_extract',
        tags: [agentSlug, 'session-extract', ...extracted.keywords],
        source: `session:${agent.sessionId}`,
        title: `${agent.agentName} session extract — ${dateStr}`,
        body,
      })

      console.log(`[rotator] ${agent.agentName}: wiki entry written → ${wikiPath}`)
    } catch (err) {
      console.warn(`[rotator] ${agent.agentName}: extraction failed (${(err as Error).message}), rotating anyway`)
    }
  } else if (excerpts.length > 0) {
    // No API key — write raw excerpt as wiki entry without LLM extraction
    const agentSlug = agent.agentName.toLowerCase().replace(/\s+/g, '-')
    const dateStr = new Date().toISOString().slice(0, 10)
    wikiPath = writeEntry({
      agent: agentSlug,
      date: new Date().toISOString(),
      type: 'session_extract',
      tags: [agentSlug, 'session-extract', 'raw'],
      source: `session:${agent.sessionId}`,
      title: `${agent.agentName} session extract — ${dateStr} (raw)`,
      body: `## Raw Session Excerpt\n\n\`\`\`\n${excerpts[0].slice(0, 2000)}\n\`\`\``,
    })
    console.log(`[rotator] ${agent.agentName}: raw wiki entry written → ${wikiPath}`)
  }

  // 3. Clear the session_id
  if (!dryRun) {
    await query(`
      UPDATE agent_runtime_state
      SET session_id = NULL, updated_at = NOW()
      WHERE agent_id = $1
    `, [agent.agentId])
    console.log(`[rotator] ${agent.agentName}: session cleared ✓`)
  } else {
    console.log(`[rotator] ${agent.agentName}: DRY RUN — session NOT cleared`)
  }
}

export async function runRotation(dryRun = false): Promise<void> {
  const bloated = await findBloatedAgents()

  if (bloated.length === 0) {
    console.log(`[rotator] no agents over ${(config.sessionRotationThreshold / 1000).toFixed(0)}K threshold`)
    return
  }

  console.log(`[rotator] ${bloated.length} agent(s) need rotation:`)
  for (const agent of bloated) {
    console.log(`  ${agent.agentName}: ${(agent.cachedTokens / 1000).toFixed(0)}K tokens`)
  }

  for (const agent of bloated) {
    await rotateAgent(agent, dryRun)
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildWikiBody(e: Awaited<ReturnType<typeof extractFromExcerpts>>): string {
  const sections: string[] = []

  sections.push(`## Summary\n\n${e.summary}`)

  if (e.decisions.length > 0) {
    sections.push(`## Key Decisions\n\n${e.decisions.map(d => `- ${d}`).join('\n')}`)
  }

  if (e.pendingWork.length > 0) {
    sections.push(`## Pending Work\n\n${e.pendingWork.map(p => `- ${p}`).join('\n')}`)
  }

  if (e.blockers.length > 0) {
    sections.push(`## Blockers\n\n${e.blockers.map(b => `- ${b}`).join('\n')}`)
  }

  return sections.join('\n\n')
}

// Run directly: node src/session-rotator.ts [--once] [--dry-run]
if (process.argv[1] === import.meta.filename) {
  const dryRun = process.argv.includes('--dry-run')
  runRotation(dryRun)
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1) })
}

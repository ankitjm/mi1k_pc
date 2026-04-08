/**
 * Status reporter — shows current state of all agents and middleware health.
 * Run: npm run status
 */

import { query } from './db.ts'
import { config } from './config.ts'
import { readAll } from './wiki/store.ts'
import fs from 'fs'

async function main() {
  console.log('\n══════════════════════════════════════════')
  console.log('  MI1K Middleware Status')
  console.log('══════════════════════════════════════════\n')

  // Agent token status
  const rows = await query<{
    agent_name: string
    session_id: string | null
    cached_tokens: string
    last_run: string
  }>(`
    SELECT
      a.name AS agent_name,
      ars.session_id,
      COALESCE(
        (
          SELECT hr.usage_json->>'cachedInputTokens'
          FROM heartbeat_runs hr
          WHERE hr.agent_id = a.id AND hr.usage_json IS NOT NULL
            AND hr.usage_json->>'cachedInputTokens' IS NOT NULL
          ORDER BY hr.started_at DESC LIMIT 1
        ), '0'
      ) AS cached_tokens,
      TO_CHAR(ars.updated_at AT TIME ZONE 'Asia/Kolkata', 'MM-DD HH24:MI') AS last_run
    FROM agents a
    JOIN agent_runtime_state ars ON ars.agent_id = a.id
    WHERE a.company_id = $1
    ORDER BY CAST(
      COALESCE(
        (SELECT hr.usage_json->>'cachedInputTokens'
         FROM heartbeat_runs hr
         WHERE hr.agent_id = a.id AND hr.usage_json IS NOT NULL
         ORDER BY hr.started_at DESC LIMIT 1),
        '0'
      ) AS bigint
    ) DESC
  `, [config.companyId])

  console.log('Agent Token Status:')
  console.log('─'.repeat(65))
  for (const r of rows) {
    const tokens = parseInt(r.cached_tokens)
    const bar = tokenBar(tokens)
    const warn = tokens > config.sessionRotationThreshold ? ' ⚠ NEEDS ROTATION' : ''
    const sessStatus = r.session_id ? '✓' : '–'
    console.log(
      `  ${r.agent_name.padEnd(18)} ${bar} ${(tokens/1000).toFixed(0).padStart(5)}K  sess:${sessStatus}${warn}`
    )
  }

  // Wiki stats
  const entries = readAll()
  console.log(`\nWiki: ${entries.length} entries`)
  const byType: Record<string, number> = {}
  for (const e of entries) {
    byType[e.type] = (byType[e.type] ?? 0) + 1
  }
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`)
  }

  // CONTEXT.md status
  console.log('\nContext Files:')
  const agentRows = await query<{ name: string; instructions_root: string | null }>(`
    SELECT name, (adapter_config->>'instructionsRootPath') AS instructions_root
    FROM agents WHERE company_id = $1 ORDER BY name
  `, [config.companyId])

  for (const a of agentRows) {
    if (!a.instructions_root) continue
    const ctxPath = `${a.instructions_root}/CONTEXT.md`
    const exists = fs.existsSync(ctxPath)
    const stat = exists ? fs.statSync(ctxPath) : null
    const size = stat ? `${stat.size}b` : 'none'
    console.log(`  ${a.name.padEnd(18)} CONTEXT.md: ${size}`)
  }

  console.log('')
  process.exit(0)
}

function tokenBar(tokens: number): string {
  const max = 2000000
  const filled = Math.round((Math.min(tokens, max) / max) * 20)
  return '[' + '█'.repeat(filled) + '░'.repeat(20 - filled) + ']'
}

main().catch(err => { console.error(err); process.exit(1) })

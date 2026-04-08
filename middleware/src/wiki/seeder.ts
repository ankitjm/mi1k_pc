/**
 * Wiki seeder — one-time import of existing agent memory files into the wiki.
 *
 * Reads paperclip-data/agents/*\/memory\/*.md and life\/*.md files
 * and converts them into structured wiki entries.
 *
 * Run once: npm run seed
 */

import fs from 'fs'
import path from 'path'
import { config } from '../config.ts'
import { writeEntry } from './store.ts'

const AGENT_SLUG_MAP: Record<string, string> = {
  'ceo':                'veda-rao',
  'cto':                'cto',
  'cmo':                'cmo',
  'qa-engineer':        'qa-engineer',
  'frontend-engineer':  'frontend-engineer',
  'devops-engineer':    'devops-engineer',
  'hr':                 'hr',
  'creative':           'creative',
  'perfmkt':            'perfmkt',
}

export async function seedFromMemoryFiles(): Promise<void> {
  const agentsDir = path.join(config.paperclipDataRoot, 'agents')
  if (!fs.existsSync(agentsDir)) {
    console.error(`[seeder] agents dir not found: ${agentsDir}`)
    return
  }

  let imported = 0

  for (const agentDir of fs.readdirSync(agentsDir)) {
    const agentSlug = AGENT_SLUG_MAP[agentDir] ?? agentDir
    const agentPath = path.join(agentsDir, agentDir)
    if (!fs.statSync(agentPath).isDirectory()) continue

    // Import memory/ files
    const memDir = path.join(agentPath, 'memory')
    if (fs.existsSync(memDir)) {
      for (const file of fs.readdirSync(memDir)) {
        if (!file.endsWith('.md')) continue
        const filePath = path.join(memDir, file)
        const body = fs.readFileSync(filePath, 'utf8').trim()
        if (!body || body.length < 100) continue

        const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/)
        const date = dateMatch?.[1] ?? new Date().toISOString().slice(0, 10)

        const outPath = writeEntry({
          agent: agentSlug,
          date,
          type: 'memory_import',
          tags: [agentSlug, 'memory', 'daily'],
          source: `agents/${agentDir}/memory/${file}`,
          title: `${agentDir} memory — ${date}`,
          body,
        })
        console.log(`[seeder] imported memory: ${outPath}`)
        imported++
      }
    }

    // Import life/ files (durable knowledge)
    const lifeDir = path.join(agentPath, 'life')
    if (fs.existsSync(lifeDir)) {
      for (const file of fs.readdirSync(lifeDir)) {
        if (!file.endsWith('.md')) continue
        const filePath = path.join(lifeDir, file)
        const body = fs.readFileSync(filePath, 'utf8').trim()
        if (!body || body.length < 50) continue

        const slug = file.replace('.md', '')
        const tags = [agentSlug, 'life', ...slug.split('-')]

        const outPath = writeEntry({
          agent: agentSlug,
          date: new Date().toISOString().slice(0, 10),
          type: 'domain',
          tags,
          source: `agents/${agentDir}/life/${file}`,
          title: `${slug} (${agentDir})`,
          body,
        })
        console.log(`[seeder] imported life doc: ${outPath}`)
        imported++
      }
    }
  }

  console.log(`[seeder] done — ${imported} entries imported to wiki`)
}

// Run directly
if (process.argv[1] === import.meta.filename) {
  seedFromMemoryFiles().catch(err => {
    console.error('[seeder] failed:', err)
    process.exit(1)
  })
}

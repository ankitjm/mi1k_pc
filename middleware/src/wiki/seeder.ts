/**
 * Wiki seeder — imports agent memory and life files into the wiki.
 *
 * Reads paperclip-data/agents/*\/memory\/*.md and life\/*.md files.
 * Runs at daemon startup AND incrementally — only imports files not yet
 * in the wiki, so new agents and new daily memory files are picked up
 * automatically without re-importing existing entries.
 *
 * Run manually: npm run seed
 */

import fs from 'fs'
import path from 'path'
import { config } from '../config.ts'
import { writeEntry, readAll } from './store.ts'
import { query } from '../db.ts'

/**
 * Build a slug map dynamically from the DB — agent name → instruction folder name.
 * Falls back to deriving a slug from the folder name if DB lookup fails.
 */
async function buildSlugMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  try {
    const rows = await query<{ name: string; instr_root: string | null }>(`
      SELECT name, (adapter_config->>'instructionsRootPath') AS instr_root
      FROM agents WHERE company_id = $1
    `, [config.companyId])

    for (const row of rows) {
      if (!row.instr_root) continue
      const folderName = path.basename(row.instr_root)
      const slug = row.name.toLowerCase().replace(/\s+/g, '-')
      map[folderName] = slug
    }
  } catch {
    // DB unavailable — fall back to folder name as slug (good enough)
  }
  return map
}

export async function seedFromMemoryFiles(): Promise<void> {
  const agentsDir = path.join(config.paperclipDataRoot, 'agents')
  if (!fs.existsSync(agentsDir)) {
    console.error(`[seeder] agents dir not found: ${agentsDir}`)
    return
  }

  // Build slug map from DB — works for any agent, current or future
  const slugMap = await buildSlugMap()

  // Track already-imported source paths to avoid duplicates
  const existing = readAll()
  const importedSources = new Set(existing.map(e => e.source).filter(Boolean))

  let imported = 0

  for (const agentDir of fs.readdirSync(agentsDir)) {
    const agentSlug = slugMap[agentDir] ?? agentDir.toLowerCase().replace(/\s+/g, '-')
    const agentPath = path.join(agentsDir, agentDir)
    if (!fs.statSync(agentPath).isDirectory()) continue

    // Import memory/ files
    const memDir = path.join(agentPath, 'memory')
    if (fs.existsSync(memDir)) {
      for (const file of fs.readdirSync(memDir)) {
        if (!file.endsWith('.md')) continue
        const sourceKey = `agents/${agentDir}/memory/${file}`
        if (importedSources.has(sourceKey)) continue  // already in wiki

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
          source: sourceKey,
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
        const sourceKey = `agents/${agentDir}/life/${file}`
        if (importedSources.has(sourceKey)) continue  // already in wiki

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
          source: sourceKey,
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

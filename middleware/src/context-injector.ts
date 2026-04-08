/**
 * Context Injector
 *
 * For each agent with active tasks, writes a CONTEXT.md to their instruction
 * root folder. The file is small (< 600 tokens) and contains only what's
 * relevant to current work.
 *
 * Agents pick it up naturally on next heartbeat via instructionsBundleMode="external".
 * No changes needed to agent configs.
 */

import fs from 'fs'
import path from 'path'
import { query } from './db.ts'
import { config } from './config.ts'
import { readForAgent, searchByKeywords } from './wiki/store.ts'

interface AgentTask {
  agentId: string
  agentName: string
  agentSlug: string
  instructionsRoot: string
  tasks: Array<{ identifier: string; title: string; status: string }>
}

export async function getAgentsWithTasks(): Promise<AgentTask[]> {
  // First: get all agents that have an instruction root
  const agentRows = await query<{
    agent_id: string
    agent_name: string
    instructions_root: string | null
  }>(`
    SELECT id AS agent_id, name AS agent_name,
      (adapter_config->>'instructionsRootPath') AS instructions_root
    FROM agents
    WHERE company_id = $1 AND adapter_config->>'instructionsRootPath' IS NOT NULL
    ORDER BY name
  `, [config.companyId])

  // Second: active tasks (todo / in_progress / blocked)
  const activeRows = await query<{
    agent_id: string; identifier: string; title: string; status: string
  }>(`
    SELECT assignee_agent_id AS agent_id, identifier, title, status
    FROM issues
    WHERE company_id = $1
      AND status IN ('todo', 'in_progress', 'blocked')
      AND assignee_agent_id IS NOT NULL
    ORDER BY status DESC, updated_at DESC
  `, [config.companyId])

  // Third: recent completed tasks (last 5 per agent — shows what they know)
  const doneRows = await query<{
    agent_id: string; identifier: string; title: string; status: string
  }>(`
    SELECT DISTINCT ON (assignee_agent_id, identifier)
      assignee_agent_id AS agent_id, identifier, title, status
    FROM issues
    WHERE company_id = $1
      AND status = 'done'
      AND assignee_agent_id IS NOT NULL
    ORDER BY assignee_agent_id, identifier DESC, updated_at DESC
    LIMIT 100
  `, [config.companyId])

  // Group done tasks by agent, keep latest 5 per agent
  const doneByAgent = new Map<string, typeof doneRows>()
  for (const row of doneRows) {
    if (!doneByAgent.has(row.agent_id)) doneByAgent.set(row.agent_id, [])
    const list = doneByAgent.get(row.agent_id)!
    if (list.length < 5) list.push(row)
  }

  // Build agent map
  const byAgent = new Map<string, AgentTask>()
  for (const a of agentRows) {
    if (!a.instructions_root) continue
    byAgent.set(a.agent_id, {
      agentId: a.agent_id,
      agentName: a.agent_name,
      agentSlug: a.agent_name.toLowerCase().replace(/\s+/g, '-'),
      instructionsRoot: a.instructions_root,
      tasks: [],
    })
  }

  // Add active tasks
  for (const row of activeRows) {
    byAgent.get(row.agent_id)?.tasks.push({
      identifier: row.identifier,
      title: row.title,
      status: row.status,
    })
  }

  // Add recent done tasks (only if agent has no active tasks, to keep file small)
  for (const [agentId, doneTasks] of doneByAgent) {
    const agent = byAgent.get(agentId)
    if (!agent) continue
    const hasActive = agent.tasks.some(t => t.status !== 'done')
    if (!hasActive) {
      for (const t of doneTasks) {
        agent.tasks.push({ identifier: t.identifier, title: t.title, status: t.status })
      }
    }
  }

  return Array.from(byAgent.values())
}

export async function injectContext(agent: AgentTask): Promise<void> {
  const contextPath = path.join(agent.instructionsRoot, 'CONTEXT.md')

  // Build keyword list from task titles
  const keywords = agent.tasks
    .flatMap(t => t.title.toLowerCase().split(/[\s\-_/]+/))
    .filter(k => k.length > 3)
    .slice(0, 12)

  // Pull relevant wiki entries
  const agentEntries = readForAgent(agent.agentSlug, 3)
  const topicEntries = searchByKeywords(keywords, 4)

  // Deduplicate
  const seen = new Set<string>()
  const allEntries = [...agentEntries, ...topicEntries].filter(e => {
    if (seen.has(e.filePath)) return false
    seen.add(e.filePath)
    return true
  })

  const content = buildContextFile(agent, allEntries)

  // Only write if content changed
  const existing = fs.existsSync(contextPath) ? fs.readFileSync(contextPath, 'utf8') : ''
  if (content === existing) return

  fs.mkdirSync(agent.instructionsRoot, { recursive: true })
  fs.writeFileSync(contextPath, content, 'utf8')
  console.log(`[injector] ${agent.agentName}: CONTEXT.md updated (${content.length} chars)`)
}

export async function runInjection(): Promise<void> {
  const agents = await getAgentsWithTasks()

  if (agents.length === 0) {
    console.log('[injector] no agents with active tasks')
    return
  }

  for (const agent of agents) {
    await injectContext(agent)
  }

  console.log(`[injector] done — ${agents.length} agent(s) updated`)
}

// ── Build the CONTEXT.md content ─────────────────────────────────────────────

function buildContextFile(
  agent: AgentTask,
  wikiEntries: ReturnType<typeof readForAgent>
): string {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const lines: string[] = []

  lines.push(`<!-- auto-generated by mi1k-middleware ${now} — do not edit manually -->`)
  lines.push(`# Current Context for ${agent.agentName}`)
  lines.push('')

  // Tasks section
  const activeTasks = agent.tasks.filter(t => t.status !== 'done')
  const doneTasks = agent.tasks.filter(t => t.status === 'done')

  if (activeTasks.length > 0) {
    lines.push('## Your Active Tasks')
    for (const task of activeTasks) {
      const badge = task.status === 'in_progress' ? '🔵' : task.status === 'blocked' ? '🔴' : '⚪'
      lines.push(`- ${badge} **${task.identifier}**: ${task.title} *(${task.status})*`)
    }
    lines.push('')
  }

  if (doneTasks.length > 0) {
    lines.push('## Recent Completed Work')
    for (const task of doneTasks) {
      lines.push(`- ✅ **${task.identifier}**: ${task.title}`)
    }
    lines.push('')
  }

  // Wiki knowledge relevant to current work
  if (wikiEntries.length > 0) {
    lines.push('## Relevant Knowledge')
    for (const entry of wikiEntries.slice(0, 4)) {
      // Include title and first 400 chars of body only — keep context small
      const bodySnippet = entry.body.replace(/^#.*$/m, '').trim().slice(0, 400)
      lines.push(`### ${entry.title}`)
      if (bodySnippet) lines.push(bodySnippet)
      lines.push('')
    }
  }

  return lines.join('\n')
}

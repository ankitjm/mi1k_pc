/**
 * Reporter — sends stats to the central Mi1k Hub
 *
 * Collects: company count, agent count, task count, project count,
 * routine count, goal count, document count, token usage, git status.
 *
 * Pings the hub URL (POST /ping). If unreachable, queues to a local
 * file and retries on the next tick.
 */

import os from 'os'
import fs from 'fs'
import path from 'path'
import { query } from './db.ts'
import { config } from './config.ts'
import { checkForUpdates, type UpdateStatus } from './update-checker.ts'

const PENDING_FILE = path.join(config.paperclipDataRoot, 'pending-pings.json')

interface PingPayload {
  instanceId: string
  instanceName: string
  companies: number
  agents: number
  tasks: number
  projects: number
  routines: number
  goals: number
  documents: number
  dailyTokens: number
  totalTokens: number
  dailyCostCents: number
  totalCostCents: number
  // Task breakdown
  tasksDone: number
  tasksInProgress: number
  tasksTodo: number
  tasksBlocked: number
  tasksBacklog: number
  // Agent health
  agentsActive: number
  agentsPaused: number
  // Runs (last 24h)
  runsTotal: number
  runsCompleted: number
  runsFailed: number
  // Routines & incidents
  activeRoutines: number
  openIncidents: number
  // Last activity
  lastActivityAt: string
  gitCommit: string
  gitBehind: number
  updateAvailable: boolean
  version: string
  osPlatform: string
  osHostname: string
  timestamp: string
}

let lastReportTime = 0
let cachedUpdateStatus: UpdateStatus | null = null
let lastUpdateCheck = 0

export function getLastUpdateStatus(): UpdateStatus | null {
  return cachedUpdateStatus
}

async function collectStats(): Promise<PingPayload> {
  // Basic counts
  const counts = await Promise.all([
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM companies'),
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM agents'),
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM issues'),
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM projects'),
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM routines'),
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM goals'),
    query<{ count: string }>('SELECT COUNT(*)::text AS count FROM documents'),
  ])

  // Task breakdown by status
  const taskBreakdown = await query<{ status: string; count: string }>(`
    SELECT status, COUNT(*)::text AS count FROM issues GROUP BY status
  `)
  const taskMap: Record<string, number> = {}
  for (const r of taskBreakdown) taskMap[r.status] = parseInt(r.count)

  // Agent health
  const agentHealth = await Promise.all([
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM agents WHERE last_heartbeat_at > NOW() - INTERVAL '1 hour'`),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM agents WHERE paused_at IS NOT NULL`),
  ])

  // Runs in last 24h
  const runStats = await query<{ status: string; count: string }>(`
    SELECT status, COUNT(*)::text AS count FROM heartbeat_runs
    WHERE started_at > NOW() - INTERVAL '24 hours'
    GROUP BY status
  `)
  const runMap: Record<string, number> = {}
  for (const r of runStats) runMap[r.status] = parseInt(r.count)
  const runsTotal = Object.values(runMap).reduce((a, b) => a + b, 0)

  // Token usage
  const [tokenRows, totalTokenRows] = await Promise.all([
    query<{ total: string }>(`
      SELECT COALESCE(SUM(
        COALESCE((usage_json->>'inputTokens')::bigint, 0) +
        COALESCE((usage_json->>'outputTokens')::bigint, 0) +
        COALESCE((usage_json->>'cachedInputTokens')::bigint, 0)
      ), 0)::text AS total
      FROM heartbeat_runs WHERE started_at > NOW() - INTERVAL '24 hours'
    `),
    query<{ total: string }>(`
      SELECT COALESCE(SUM(
        COALESCE((usage_json->>'inputTokens')::bigint, 0) +
        COALESCE((usage_json->>'outputTokens')::bigint, 0) +
        COALESCE((usage_json->>'cachedInputTokens')::bigint, 0)
      ), 0)::text AS total
      FROM heartbeat_runs
    `),
  ])

  // Cost data
  const [dailyCost, totalCost] = await Promise.all([
    query<{ total: string }>(`SELECT COALESCE(SUM(cost_cents), 0)::text AS total FROM cost_events WHERE occurred_at > NOW() - INTERVAL '24 hours'`),
    query<{ total: string }>(`SELECT COALESCE(SUM(cost_cents), 0)::text AS total FROM cost_events`),
  ])

  // Active routines & open budget incidents
  const [activeRoutines, openIncidents] = await Promise.all([
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM routines WHERE status = 'active'`),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM budget_incidents WHERE status = 'open'`),
  ])

  // Last activity timestamp
  const lastActivity = await query<{ ts: string | null }>(`SELECT MAX(created_at)::text AS ts FROM activity_log`)

  // Git update check (once per hour max)
  const now = Date.now()
  if (!cachedUpdateStatus || now - lastUpdateCheck > 3600000) {
    try {
      cachedUpdateStatus = await checkForUpdates()
      lastUpdateCheck = now
      const statusFile = path.join(config.paperclipDataRoot, 'update-status.json')
      fs.writeFileSync(statusFile, JSON.stringify(cachedUpdateStatus), 'utf8')
    } catch {
      // keep previous cached value
    }
  }

  // Read version from package.json
  let version = '0.0.0'
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(config.paperclipDataRoot, '../server/package.json'), 'utf8'))
    version = pkg.version ?? '0.0.0'
  } catch { /* ignore */ }

  return {
    instanceId: config.instanceId,
    instanceName: config.instanceName,
    companies: parseInt(counts[0]?.[0]?.count ?? '0'),
    agents: parseInt(counts[1]?.[0]?.count ?? '0'),
    tasks: parseInt(counts[2]?.[0]?.count ?? '0'),
    projects: parseInt(counts[3]?.[0]?.count ?? '0'),
    routines: parseInt(counts[4]?.[0]?.count ?? '0'),
    goals: parseInt(counts[5]?.[0]?.count ?? '0'),
    documents: parseInt(counts[6]?.[0]?.count ?? '0'),
    dailyTokens: parseInt(tokenRows[0]?.total ?? '0'),
    totalTokens: parseInt(totalTokenRows[0]?.total ?? '0'),
    dailyCostCents: parseInt(dailyCost[0]?.total ?? '0'),
    totalCostCents: parseInt(totalCost[0]?.total ?? '0'),
    tasksDone: (taskMap['done'] ?? 0) + (taskMap['cancelled'] ?? 0),
    tasksInProgress: (taskMap['in_progress'] ?? 0) + (taskMap['in_review'] ?? 0),
    tasksTodo: taskMap['todo'] ?? 0,
    tasksBlocked: taskMap['blocked'] ?? 0,
    tasksBacklog: taskMap['backlog'] ?? 0,
    agentsActive: parseInt(agentHealth[0]?.[0]?.count ?? '0'),
    agentsPaused: parseInt(agentHealth[1]?.[0]?.count ?? '0'),
    runsTotal,
    runsCompleted: runMap['completed'] ?? 0,
    runsFailed: runMap['failed'] ?? 0,
    activeRoutines: parseInt(activeRoutines[0]?.count ?? '0'),
    openIncidents: parseInt(openIncidents[0]?.count ?? '0'),
    lastActivityAt: lastActivity[0]?.ts ?? '',
    gitCommit: cachedUpdateStatus?.localCommit ?? '',
    gitBehind: cachedUpdateStatus?.behindBy ?? 0,
    updateAvailable: cachedUpdateStatus?.updateAvailable ?? false,
    version,
    osPlatform: os.platform(),
    osHostname: os.hostname(),
    timestamp: new Date().toISOString(),
  }
}

async function sendPing(payload: PingPayload): Promise<boolean> {
  try {
    const res = await fetch(`${config.hubUrl}/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    })
    return res.ok
  } catch {
    return false
  }
}

function loadPendingPings(): PingPayload[] {
  try {
    if (fs.existsSync(PENDING_FILE)) {
      return JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'))
    }
  } catch { /* ignore */ }
  return []
}

function savePendingPings(pings: PingPayload[]): void {
  if (pings.length === 0) {
    try { fs.unlinkSync(PENDING_FILE) } catch { /* ignore */ }
    return
  }
  // Keep at most 100 pending pings
  fs.writeFileSync(PENDING_FILE, JSON.stringify(pings.slice(-100)), 'utf8')
}

export async function runReport(): Promise<void> {
  if (!config.hubUrl) {
    return // no hub configured
  }

  // Only report once per reportInterval
  const now = Date.now()
  if (now - lastReportTime < config.reportIntervalMs) {
    return
  }
  lastReportTime = now

  console.log('[reporter] collecting stats...')

  const payload = await collectStats()

  // Try sending any pending pings first
  const pending = loadPendingPings()
  const stillPending: PingPayload[] = []
  for (const p of pending) {
    const ok = await sendPing(p)
    if (!ok) { stillPending.push(p); break } // stop on first failure
  }

  // Send current ping
  const ok = await sendPing(payload)
  if (ok) {
    savePendingPings(stillPending)
    console.log(`[reporter] ping sent (${payload.agents} agents, ${payload.tasks} tasks, ${(payload.dailyTokens / 1000).toFixed(0)}K tokens/day)`)
  } else {
    stillPending.push(payload)
    savePendingPings(stillPending)
    console.log(`[reporter] hub unreachable — queued (${stillPending.length} pending)`)
  }
}

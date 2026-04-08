import pg from 'pg'
import { config } from './config.ts'

const { Pool } = pg

let _pool: pg.Pool | null = null

export function getPool(): pg.Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: config.databaseUrl })
  }
  return _pool
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const pool = getPool()
  const res = await pool.query<T>(sql, params)
  return res.rows
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end()
    _pool = null
  }
}

// ── Types mirroring DB rows we care about ────────────────────────────────────

export interface AgentRow {
  id: string
  name: string
  adapter_config: {
    instructionsRootPath?: string
    model?: string
  }
}

export interface RuntimeStateRow {
  agent_id: string
  session_id: string | null
  total_cached_input_tokens: string
}

export interface HeartbeatRunRow {
  id: string
  agent_id: string
  agent_name: string
  status: string
  started_at: string
  cached_input_tokens: number
  new_input_tokens: number
  output_tokens: number
  fresh_session: boolean
  stdout_excerpt: string | null
  log_ref: string | null
}

export interface IssueRow {
  id: string
  identifier: string
  title: string
  status: string
  agent_name: string
  agent_id: string
}

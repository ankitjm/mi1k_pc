/**
 * MI1K Middleware Daemon
 *
 * Runs three jobs on a polling loop:
 *   1. Session Rotator  — clears bloated sessions, saves extracts to wiki
 *   2. Wiki Seeder      — one-time import of memory files (runs on startup only)
 *   3. Context Injector — writes CONTEXT.md per agent with active tasks
 *
 * Start: npm start
 */

import { config } from './config.ts'
import { closePool } from './db.ts'
import { runRotation } from './session-rotator.ts'
import { seedFromMemoryFiles } from './wiki/seeder.ts'
import { runInjection } from './context-injector.ts'
import { runReport } from './reporter.ts'

async function tick() {
  const now = new Date().toISOString().slice(0, 19)
  console.log(`\n[daemon] tick at ${now}`)

  // Incremental seed every tick — skips already-imported files, picks up new agents
  try {
    await seedFromMemoryFiles()
  } catch (err) {
    console.error('[daemon] seed error:', (err as Error).message)
  }

  // Session rotation
  try {
    await runRotation(false)
  } catch (err) {
    console.error('[daemon] rotation error:', (err as Error).message)
  }

  // Context injection
  try {
    await runInjection()
  } catch (err) {
    console.error('[daemon] injection error:', (err as Error).message)
  }

  // Report stats to hub (rate-limited internally)
  try {
    await runReport()
  } catch (err) {
    console.error('[daemon] report error:', (err as Error).message)
  }
}

async function main() {
  console.log('━'.repeat(50))
  console.log('  MI1K Middleware starting')
  console.log(`  Poll interval:      ${config.pollIntervalMs / 1000}s`)
  console.log(`  Rotation threshold: ${(config.sessionRotationThreshold / 1000).toFixed(0)}K cached tokens`)
  console.log(`  Wiki dir:           ${config.wikiDir}`)
  console.log(`  LLM extraction:     ${config.anthropicApiKey ? 'enabled (Haiku)' : 'disabled (no API key)'}`)
  console.log(`  Hub reporting:      ${config.hubUrl || 'disabled'}`)
  console.log('━'.repeat(50))

  // Run immediately, then on interval
  await tick()

  const interval = setInterval(async () => {
    try {
      await tick()
    } catch (err) {
      console.error('[daemon] unhandled tick error:', err)
    }
  }, config.pollIntervalMs)

  // Graceful shutdown
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, async () => {
      console.log(`\n[daemon] received ${sig} — shutting down`)
      clearInterval(interval)
      await closePool()
      process.exit(0)
    })
  }
}

main().catch(err => {
  console.error('[daemon] fatal:', err)
  process.exit(1)
})

/**
 * Update Checker
 *
 * Runs `git fetch` and compares local HEAD with remote origin/main.
 * Returns whether an update is available and how far behind.
 */

import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

export interface UpdateStatus {
  updateAvailable: boolean
  localCommit: string
  remoteCommit: string
  behindBy: number
  lastChecked: string
}

function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { cwd: repoRoot, encoding: 'utf8', timeout: 30000 }).trim()
  } catch {
    return ''
  }
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  // Fetch latest from origin (non-destructive)
  git('fetch origin main --quiet')

  const localCommit = git('rev-parse HEAD')
  const remoteCommit = git('rev-parse origin/main')

  let behindBy = 0
  if (localCommit && remoteCommit && localCommit !== remoteCommit) {
    const count = git(`rev-list --count HEAD..origin/main`)
    behindBy = parseInt(count) || 0
  }

  return {
    updateAvailable: behindBy > 0,
    localCommit: localCommit.slice(0, 8),
    remoteCommit: remoteCommit.slice(0, 8),
    behindBy,
    lastChecked: new Date().toISOString(),
  }
}

/**
 * Wiki store — reads and writes markdown files with YAML-like frontmatter.
 *
 * Structure on disk:
 *   wiki/
 *     agents/         ← per-agent session extracts and memory
 *     domain/         ← domain knowledge (retail, GST, tech stacks…)
 *     brand/          ← brand voice, product, market knowledge
 */

import fs from 'fs'
import path from 'path'
import { config } from '../config.ts'

export interface WikiEntry {
  // Frontmatter
  agent?: string         // e.g. "veda-rao", "cto"
  date: string           // ISO date string
  type: string           // "session_extract" | "domain" | "brand" | "memory_import"
  tags: string[]
  source?: string        // where this came from

  // Body
  title: string
  body: string

  // Derived
  filePath: string
}

// ── Write ────────────────────────────────────────────────────────────────────

export function writeEntry(entry: Omit<WikiEntry, 'filePath'>): string {
  const dir = entryDir(entry)
  fs.mkdirSync(dir, { recursive: true })

  const slug = slugify(entry.title)
  const dateStr = entry.date.slice(0, 10)
  const filename = `${dateStr}-${slug}.md`
  const filePath = path.join(dir, filename)

  const content = serialise(entry)
  fs.writeFileSync(filePath, content, 'utf8')
  return filePath
}

// ── Read ─────────────────────────────────────────────────────────────────────

export function readAll(subdir?: string): WikiEntry[] {
  const root = subdir ? path.join(config.wikiDir, subdir) : config.wikiDir
  if (!fs.existsSync(root)) return []

  const entries: WikiEntry[] = []
  walkDir(root, (filePath) => {
    if (!filePath.endsWith('.md')) return
    const entry = parseEntry(filePath)
    if (entry) entries.push(entry)
  })
  return entries.sort((a, b) => b.date.localeCompare(a.date))
}

export function readForAgent(agentSlug: string, limit = 5): WikiEntry[] {
  return readAll(`agents/${agentSlug}`).slice(0, limit)
}

export function readByTags(tags: string[], limit = 10): WikiEntry[] {
  const all = readAll()
  const lower = tags.map(t => t.toLowerCase())
  return all
    .filter(e => e.tags.some(t => lower.includes(t.toLowerCase())))
    .slice(0, limit)
}

export function searchByKeywords(keywords: string[], limit = 8): WikiEntry[] {
  const all = readAll()
  const lower = keywords.map(k => k.toLowerCase())
  return all
    .filter(e => {
      const text = `${e.title} ${e.tags.join(' ')} ${e.body}`.toLowerCase()
      return lower.some(k => text.includes(k))
    })
    .slice(0, limit)
}

// ── Internal ─────────────────────────────────────────────────────────────────

function entryDir(entry: Omit<WikiEntry, 'filePath'>): string {
  if (entry.agent) return path.join(config.wikiDir, 'agents', entry.agent)
  if (entry.type === 'brand') return path.join(config.wikiDir, 'brand')
  if (entry.type === 'domain') return path.join(config.wikiDir, 'domain')
  return path.join(config.wikiDir, 'misc')
}

function serialise(entry: Omit<WikiEntry, 'filePath'>): string {
  const fm = [
    '---',
    entry.agent ? `agent: ${entry.agent}` : null,
    `date: ${entry.date}`,
    `type: ${entry.type}`,
    `tags: [${entry.tags.join(', ')}]`,
    entry.source ? `source: ${entry.source}` : null,
    '---',
  ].filter(Boolean).join('\n')

  return `${fm}\n\n# ${entry.title}\n\n${entry.body}\n`
}

function parseEntry(filePath: string): WikiEntry | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/m)
    if (!fmMatch) return null

    const fm: Record<string, string> = {}
    fmMatch[1].split('\n').forEach(line => {
      const [k, ...v] = line.split(':')
      if (k) fm[k.trim()] = v.join(':').trim()
    })

    const body = fmMatch[2].trim()
    const titleMatch = body.match(/^#\s+(.+)$/m)

    const tagsRaw = fm.tags ?? '[]'
    const tags = tagsRaw
      .replace(/^\[/, '').replace(/\]$/, '')
      .split(',').map(t => t.trim()).filter(Boolean)

    return {
      agent: fm.agent,
      date: fm.date ?? '',
      type: fm.type ?? 'misc',
      tags,
      source: fm.source,
      title: titleMatch?.[1] ?? path.basename(filePath, '.md'),
      body,
      filePath,
    }
  } catch {
    return null
  }
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
}

function walkDir(dir: string, fn: (filePath: string) => void): void {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkDir(full, fn)
    else fn(full)
  }
}

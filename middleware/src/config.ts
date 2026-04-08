import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const config = {
  // Database
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://paperclip:paperclip@localhost:5432/paperclip',

  // The company we're managing (Khosha Systems)
  companyId: '265f9542-39db-429b-8e2b-580555933d56',

  // Paperclip data root — where agent instruction folders live
  paperclipDataRoot: process.env.PAPERCLIP_DATA_ROOT
    ?? path.resolve(__dirname, '../../paperclip-data'),

  // Wiki storage directory
  wikiDir: process.env.WIKI_DIR
    ?? path.resolve(__dirname, '../../paperclip-data/wiki'),

  // Session rotation: clear session_id when cached tokens exceed this
  sessionRotationThreshold: parseInt(process.env.SESSION_ROTATION_THRESHOLD ?? '200000'),

  // How often the daemon polls (ms)
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS ?? '60000'),

  // Anthropic API key for extraction/research calls
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',

  // Model to use for extraction (cheap — just summarisation)
  extractionModel: 'claude-haiku-4-5-20251001' as const,

  // Max tokens for a generated CONTEXT.md (keep small — this loads on every run)
  maxContextTokens: 600,
}

export type Config = typeof config

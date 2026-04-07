# Mi1k-Employees Customizations

This file tracks all custom modifications made to the Paperclip upstream code.
**IMPORTANT:** When updating from upstream, these files must be preserved or re-applied.

## Custom Adapter Files (new files, not in upstream)

### Server-side adapters
- `server/src/adapters/claude-api/` — Claude API adapter (API key-based)
- `server/src/adapters/openrouter/` — OpenRouter adapter
- `server/src/adapters/openai-compatible/` — Generic OpenAI-compatible adapter

### UI-side adapters
- `ui/src/adapters/claude-api/` — Claude API config UI
- `ui/src/adapters/openrouter/` — OpenRouter config UI
- `ui/src/adapters/openai-compatible/` — OpenAI-compatible config UI

## Custom Pages (new files)
- `ui/src/pages/Documents.tsx` — Document browser page
- `ui/src/pages/Workflows.tsx` — Workflows page
- `ui/src/pages/InstanceAdapters.tsx` — Claude connection management

## Custom Branding (replaced files)
- `ui/src/components/AsciiArtAnimation.tsx` — Mi1k branded panel (replaces paperclip ASCII art)
- `ui/src/components/MilkLogo.tsx` — Mi1k logo component
- `ui/public/brands/milk-logo-dark.png` — Logo asset (dark)
- `ui/public/brands/milk-logo-light.png` — Logo asset (light)

## Modified Upstream Files (merge required)

These files exist in upstream but have custom additions. On update, take upstream version and re-apply additions.

### `packages/shared/src/constants.ts`
- Added to AGENT_ADAPTER_TYPES: `claude_api`, `gemini_local`, `openrouter`, `openai_compatible`

### `server/src/adapters/registry.ts`
- Import 3 custom adapters (claude-api, openrouter, openai-compatible)
- Add them to adaptersByType map

### `server/src/adapters/utils.ts`
- Added `joinPromptSections` to re-exports

### `server/src/services/heartbeat.ts`
- Import `companies` from DB schema
- Inject `paperclipCompanyApiKeys` into runtimeConfig (company-level API key lookup)

### `server/src/routes/companies.ts`
- Added provider API keys CRUD routes (GET/PUT/DELETE /:companyId/provider-api-keys)

### `ui/src/adapters/registry.ts`
- Import and register 3 custom UI adapters

### `ui/src/components/agent-config-primitives.tsx`
- Added labels: `claude_api`, `openrouter`, `openai_compatible`

### `ui/src/components/AgentConfigForm.tsx`
- Added to ENABLED_ADAPTER_TYPES: `claude_api`, `openrouter`, `openai_compatible`, `process`, `http`

### `ui/src/components/OnboardingWizard.tsx`
- Extended AdapterType union with 3 new types
- Added 3 adapter option cards before openclaw_gateway

### `ui/src/components/Sidebar.tsx`
- Added Documents and Workflows nav items with FileText and Zap icons

### `ui/src/App.tsx`
- Import Documents, Workflows, InstanceAdapters pages
- Added routes: /documents, /workflows, /instance/settings/adapters
- Added unprefixed board redirects for documents and workflows

### `ui/src/lib/queryKeys.ts`
- Added: assets.list, assets.workspaceFiles, documents.list, documents.detail, instance.claudeAuthStatus

### `ui/src/api/companies.ts`
- Added: getProviderApiKeys, setProviderApiKey, deleteProviderApiKey

### `ui/src/api/assets.ts`
- Added: CompanyAsset and WorkspaceFile interfaces, list() and listWorkspaceFiles() methods

### `ui/src/pages/CompanySettings.tsx`
- Added "Provider API Keys" section with Anthropic/OpenRouter/OpenAI key management

## Database Customizations
- Migration 0045: Added `provider_api_keys` JSONB column to companies table
- `packages/db/src/schema/companies.ts`: Added `providerApiKeys` column

## Docker/Deployment (never overwrite)
- `docker-compose.production.yml` — mi1k-employees specific (port 19002, volumes)
- `.env` — mi1k-employees specific (DB, auth, URL)
- `company-data/` — mounted company data

## Knowledge Base System (Phase 1 - Onboarding Enhancement)
- `server/src/services/knowledge-base.ts` — File extraction (PDF, DOCX, XLSX, CSV) + URL scraping + context builder
- `server/src/routes/knowledge-base.ts` — API routes for knowledge base building
- `ui/src/api/knowledgeBase.ts` — Frontend API client
- Dependencies added: pdf-parse, mammoth, xlsx, cheerio

### Modified for Knowledge Base
- `server/src/routes/index.ts` — Added knowledgeBaseRoutes export
- `server/src/app.ts` — Mounted knowledge base routes
- `ui/src/components/OnboardingWizard.tsx` — Step 1 enhanced with file upload, links, industry, context fields

## Model Policy System (Phase 2)
- Migration 0046: Added `model_policy` JSONB column to companies table
- `packages/db/src/schema/companies.ts`: Added `modelPolicy` column
- `packages/shared/src/types/company.ts`: Added `modelPolicy` field
- `packages/shared/src/validators/company.ts`: Added `modelPolicy` to update schema

### Modified for Model Policy
- `server/src/routes/companies.ts` — Added GET/PUT model-policy routes
- `server/src/services/heartbeat.ts` — Injects `paperclipCompanyModelPolicy` and `paperclipAgentRole` into runtime config
- `server/src/adapters/claude-api/execute.ts` — Reads model from policy by agent role
- `server/src/adapters/openrouter/execute.ts` — Same
- `server/src/adapters/openai-compatible/execute.ts` — Same
- `ui/src/api/companies.ts` — Added getModelPolicy, updateModelPolicy
- `ui/src/pages/CompanySettings.tsx` — Added Model Policy section

## AI Rewrite System (Phase 3)
- `server/src/routes/ai-rewrite.ts` — Rewrite API endpoint using company OpenRouter/Anthropic key
- `ui/src/api/aiRewrite.ts` — Frontend API client
- `ui/src/components/AiRewriteButton.tsx` — Reusable AI rewrite button component

### Modified for AI Rewrite
- `server/src/routes/index.ts` — Added aiRewriteRoutes export
- `server/src/app.ts` — Mounted ai-rewrite routes
- `ui/src/components/NewIssueDialog.tsx` — Added rewrite button on task title
- `ui/src/components/CommentThread.tsx` — Added rewrite button on comments
- `ui/src/components/OnboardingWizard.tsx` — Added rewrite button on task description

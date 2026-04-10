---
title: "Knowledge Management"
type: concept
updated: 2026-04-07
sources: [claude/Building a Knowledge Graph.md, claude/Obsidian Vault Setup.md]
related: [[Python]], [[Machine Learning]], [[Frontend]]
---

# Knowledge Management

## Obsidian as Personal Knowledge Base

Ankit uses Obsidian to organize personal knowledge, specifically AI chat history:

- **Folder structure by source**: `chatgpt/`, `claude/`, `gemini/` subdirectories
- **Frontmatter**: consistent YAML with tags, dates, message counts, source
- **Graph view**: enable color groups per source for visual differentiation
- **Wikilinks**: `[[Page Name]]` syntax to cross-reference conversations

(source: [[claude/Obsidian Vault Setup]])

## Knowledge Graph from Chat History

Ankit explored building a personal knowledge graph from chat exports:

- Parse chat JSON exports → structured Markdown with YAML frontmatter
- Use Obsidian's graph view to visualize topic connections
- Tag conversations by topic domain
- Cross-reference with wikilinks between related conversations

(source: [[claude/Building a Knowledge Graph]])

## Karpathy LLM Wiki Pattern

Building on the above, Ankit is implementing the Karpathy LLM Wiki pattern:

- **Compile-first**: LLM synthesizes raw conversations into wiki pages (not just indexes them)
- **Three layers**: raw sources (read-only) → wiki pages (LLM-written) → schema (operating rules)
- **Writeback mandate**: every LLM answer must be written back to a wiki page
- **Tools**: Obsidian vault + Claude Code + schema.md + CLAUDE.md

See `schema.md` and `CLAUDE.md` in the workspace root for operating details.

## Key Themes

- Strong interest in personal knowledge management and "second brain" systems
- Moving from passive note storage to active LLM-compiled knowledge
- Using AI tools (Claude Code) to maintain the wiki, not just answer questions

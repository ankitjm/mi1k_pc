# LLM Wiki — Schema & Operating Instructions

This document tells the LLM how to operate the wiki. Read it before doing any wiki work.

---

## Folder Layout

```
vault/
  chatgpt/          ← raw ChatGPT conversation exports (read-only)
  claude/           ← raw Claude conversation exports (read-only)
  gemini/           ← raw Gemini conversation exports (read-only)
  wiki/             ← LLM-maintained synthesized knowledge
    index.md        ← master topic index (always keep current)
    concepts/       ← synthesized concept/technology pages
    projects/       ← project-specific knowledge pages
    people/         ← entity pages (people, companies, tools)
schema.md           ← this file (LLM operating rules)
CLAUDE.md           ← Claude Code entry point
sources/            ← raw JSON exports (before ingest)
scripts/            ← ingest and interlink tooling
```

**Raw sources** (`vault/chatgpt/`, `vault/claude/`, `vault/gemini/`) are **read-only**. The LLM must never modify them.

**Wiki pages** (`vault/wiki/`) are **LLM-maintained**. Humans mostly read; LLM mostly writes.

---

## Core Principle: Compile, Don't Retrieve

> **Wrong**: Answer a question by searching raw conversations each time.  
> **Right**: Compile knowledge from raw sources into wiki pages once, then answer from the wiki.

Every insight extracted from a raw conversation must be written back into the appropriate wiki page. Over time the wiki becomes the authoritative source; raw conversations are just the evidence trail.

---

## Wiki Page Format

All wiki pages use this frontmatter:

```yaml
---
title: "Page Title"
type: concept | project | person | index
updated: YYYY-MM-DD
sources: [relative/path/to/raw/conv.md, ...]
related: [[Other Page]], [[Another Page]]
---
```

Body: structured markdown. Use `##` sections, bullet points, and `[[wikilinks]]` to related pages. Keep pages factual and concise — this is a reference, not a narrative.

---

## Citation Rules

When writing a wiki page entry derived from a conversation:
- Add the source file to the `sources:` frontmatter list
- Inline citation format: `(source: [[chatgpt/Page Title]])`
- Never paraphrase in a way that obscures the original claim

---

## Ingest Workflow (How to Process New Conversations)

When new conversations appear in the raw vault directories:

1. **Read** the new conversation file
2. **Extract** key facts, concepts, decisions, questions, preferences, and recurring themes
3. **Find or create** the appropriate wiki page(s) in `vault/wiki/`
4. **Merge** the new knowledge into that page without duplicating existing entries
5. **Update** `sources:` frontmatter with the new source file
6. **Update** `vault/wiki/index.md` if a new page was created

---

## Query Workflow (How to Answer Questions)

When asked a question about Ankit's context:

1. **Search** `vault/wiki/` for relevant pages (not raw conversations)
2. **Synthesize** an answer from wiki content
3. **Writeback**: if the answer required inference or combination of multiple pages, write the synthesized conclusion back to the relevant wiki page so it's available next time
4. **Cite** which wiki pages informed the answer

---

## Index Maintenance

`vault/wiki/index.md` must always reflect the current state of the wiki:
- List every page under its category (concepts, projects, people)
- One-line description per page
- Update it whenever a new page is created or a major page is updated

---

## Linting Rules

- No orphan pages: every page must be linked from `index.md`
- No empty pages: a page must have at least one substantive entry
- No duplicate pages: merge rather than create a second page on the same topic
- All `[[wikilinks]]` must point to files that exist

---

## Topic Clusters (Seeded)

These are known domain areas to watch for in Ankit's conversations:

- **Programming**: Python, JavaScript/TypeScript, React, databases, APIs, Docker
- **AI/ML**: LLMs, RAG, knowledge graphs, embeddings, fine-tuning, agents
- **Product/Startup**: RetailerOS, mi1k, Paperclip, Indian retail market
- **Personal productivity**: Obsidian, note-taking, knowledge management
- **Business**: Go-to-market, fundraising, product strategy

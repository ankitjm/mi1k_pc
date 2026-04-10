---
title: "Ankit's Brain — Wiki Index"
type: index
updated: 2026-04-07
---

# Ankit's Brain — Wiki Index

This is the master index of Ankit Mehta's personal knowledge wiki, maintained by Claude Code using the Karpathy LLM Wiki pattern. All pages here are synthesized from Ankit's AI chat history.

**How to use**: Browse by category below, or search within Obsidian. For querying with Claude Code, open a terminal in this workspace and run `claude` — it will read `CLAUDE.md` and operate as your wiki assistant.

**Last compiled**: 2026-04-07 from 5 conversations (2 ChatGPT, 2 Claude, 1 Gemini)

---

## Concepts

| Page | Description |
|---|---|
| [[concepts/Python]] | Python data structures, performance patterns, ecosystem choices |
| [[concepts/Frontend]] | React component architecture, atomic design, scalable patterns |
| [[concepts/Machine-Learning]] | Production ML pipelines, MLflow, Kubeflow, idempotency |
| [[concepts/Knowledge-Management]] | Obsidian, knowledge graphs, Karpathy LLM wiki, personal PKM |

## Projects

*(No project pages yet. Will be populated as real conversations are ingested.)*

## People & Entities

*(No entity pages yet. Will be populated as real conversations are ingested.)*

---

## Recurring Themes (Inferred from Chat History)

- **Performance-conscious engineering**: Ankit thinks in Big-O and production reliability terms
- **Scalable architecture**: Interested in patterns that work at scale (atomic design, idempotent pipelines)
- **Knowledge management**: Active interest in PKM systems, second-brain approaches, AI-assisted note-taking
- **Full-stack**: Comfortable across Python backend, React frontend, and ML

---

## How to Grow This Wiki

1. Export your chats from ChatGPT/Claude/Gemini as JSON
2. Drop into `sources/{chatgpt,claude,gemini}/`
3. Run: `cd scripts && python ingest.py`
4. Open Claude Code in this workspace: `claude`
5. Ask Claude to compile new conversations into the wiki

Claude Code will read `CLAUDE.md`, know it's your wiki maintainer, and synthesize the new conversations into updated wiki pages.

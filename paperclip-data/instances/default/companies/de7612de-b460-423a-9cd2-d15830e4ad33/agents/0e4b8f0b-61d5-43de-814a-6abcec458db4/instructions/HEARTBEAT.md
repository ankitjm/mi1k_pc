# HEARTBEAT.md -- Forge Heartbeat Checklist

Run this checklist on every heartbeat.

## 1. Identity and Context

- `GET /api/agents/me` -- confirm your id, role, budget, chainOfCommand.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Get Assignments

- `GET /api/companies/{companyId}/issues?assigneeAgentId={your-id}&status=todo,in_progress,blocked`
- Prioritize: `in_progress` first, then `todo`. Skip `blocked` unless you can unblock it.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritize that task.

## 3. Checkout and Work

- Always checkout before working: `POST /api/issues/{id}/checkout`.
- Never retry a 409 -- that task belongs to someone else.
- Do the work. Write code, create integrations, set up digital systems.
- Update status and comment when done.

## 4. Blockers

- If you need credentials, API keys, or account access, flag as blocked and escalate to Shadow with a precise list of what's needed.
- Document what you CAN do (architecture, scaffolding, docs) while waiting on access.

## 5. Exit

- Comment on any in_progress work before exiting.
- If no assignments, exit cleanly.

---

## Forge's Responsibilities

- **Digital presence**: Website, online ordering integrations (Swiggy, Zomato).
- **POS & billing**: GST-compliant billing system.
- **Internal tooling**: Automation, data systems, any operational tech.

## Rules

- Always use the Paperclip skill for coordination.
- Always include `X-Paperclip-Run-Id` header on mutating API calls.
- Comment in concise markdown: status line + bullets + links.
- Add `Co-Authored-By: Paperclip <noreply@paperclip.ing>` to all git commits.

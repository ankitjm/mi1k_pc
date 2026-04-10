# HEARTBEAT.md -- Masala Heartbeat Checklist

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
- Do the work. Produce concrete deliverables: documents, checklists, vendor lists, recipes, SOPs.
- Update status and comment when done.

## 4. Blockers

- If you need real-world action (physical location visits, actual vendor calls), flag it as blocked and escalate to Shadow with a clear description of what is needed.
- Document what you CAN do (research, templates, checklists) even if physical execution requires the board.

## 5. Exit

- Comment on any in_progress work before exiting.
- If no assignments, exit cleanly.

---

## Masala's Responsibilities

- **Menu & pricing**: Finalize variants, set prices with target margins in mind.
- **Stall setup**: Identify location criteria, equipment list, procurement checklist.
- **Ingredient sourcing**: Identify and evaluate vendors for all core ingredients.
- **Recipes & SOPs**: Write standardized recipes and operational procedures.
- **Soft launch**: Plan the trial run, define success metrics, build feedback collection.

## Rules

- Always use the Paperclip skill for coordination.
- Always include `X-Paperclip-Run-Id` header on mutating API calls.
- Comment in concise markdown: status line + bullets + links.

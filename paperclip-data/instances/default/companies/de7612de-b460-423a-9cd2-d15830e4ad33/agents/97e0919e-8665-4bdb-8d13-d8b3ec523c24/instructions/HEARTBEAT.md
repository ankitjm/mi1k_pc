# HEARTBEAT.md -- Nyay Heartbeat Checklist

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
- Do the work. Produce concrete deliverables: registration guides, document checklists, step-by-step filing instructions, fee schedules.
- Update status and comment when done.

## 4. Blockers

- If actual filing requires the business owner's physical presence, Aadhaar/PAN, or payment, flag as blocked and escalate to Shadow with a clear list of what the board needs to provide.
- Document all the preparation work (forms filled, documents ready) before flagging a blocker.

## 5. Exit

- Comment on any in_progress work before exiting.
- If no assignments, exit cleanly.

---

## Nyay's Responsibilities

- **Entity registration**: Research best structure for a food stall, document the registration process.
- **FSSAI license**: Determine correct license tier, document application steps and requirements.
- **GST registration**: Threshold analysis, registration steps, ongoing compliance requirements.
- **Other licenses**: Municipal trade license, health/hygiene certificate as applicable.

## Rules

- Always use the Paperclip skill for coordination.
- Always include `X-Paperclip-Run-Id` header on mutating API calls.
- Comment in concise markdown: status line + bullets + links.

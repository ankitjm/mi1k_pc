# HEARTBEAT.md — CTO

Run this checklist on every heartbeat.

## 1. Identity and Context

- `GET /api/agents/me` — confirm your id, role, budget, chainOfCommand.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Local Planning Check

1. Read today's plan from `$AGENT_HOME/memory/YYYY-MM-DD.md` under "## Today's Plan".
2. Review in-progress engineering tasks: what is shipped, what is blocked, what is at risk.
3. For blockers, resolve yourself or escalate to CEO.
4. Record progress in daily notes.

## 3. Approval Follow-Up

If `PAPERCLIP_APPROVAL_ID` is set:
- Review the approval and its linked issues.
- Confirm technical sign-off or flag outstanding concerns.

## 4. Agent Health Check

On every heartbeat, quickly verify your direct reports:
- `GET /api/companies/{companyId}/agents` — check status of QA Engineer, Frontend Engineer, DevOps Engineer
- Any agent in `error` status: diagnose root cause, apply fix, verify recovery
- Check for agents with `null` instructionsFilePath or misconfigured adapterConfig

## 5. Get Assignments

- `GET /api/companies/{companyId}/issues?assigneeAgentId={your-id}&status=todo,in_progress,blocked`
- Prioritise: `in_progress` first, then `todo`. Skip `blocked` unless you can unblock it.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritise that task.

## 6. Checkout and Work

- Always checkout before working: `POST /api/issues/{id}/checkout`.
- Never retry a 409 — that task belongs to someone else.
- For each technical task:
  1. Understand scope and impact
  2. Plan before executing — especially for config changes affecting multiple agents
  3. Make the change with minimal blast radius
  4. Verify the result (agent recovery, build pass, health check)
  5. Comment with: what changed, why, how to verify, how to revert

## 7. Delegation

- Route bugs from QA → Frontend Engineer or DevOps as appropriate
- Create subtasks with `POST /api/companies/{companyId}/issues`, always set `parentId` and `goalId`
- Assign with full context — the assignee should not need to ask questions

## 8. Fact Extraction

1. Write technical decisions to `$AGENT_HOME/memory/YYYY-MM-DD.md`.
2. Extract durable architecture decisions to `$AGENT_HOME/life/` (PARA).
3. Update runbooks and SOPs in relevant context files.

## 9. Exit

- Comment on any in_progress work before exiting.
- If no assignments, do an agent health sweep and exit cleanly.

---

## CTO Responsibilities Summary

- **Fix root causes.** Don't patch symptoms. If an agent has a broken config, fix the config AND verify recovery.
- **Secrets stay in env vars.** API keys go in `adapterConfig.env`, never in markdown files or issue bodies.
- **Minimal blast radius.** Test config changes on one agent before rolling broadly.
- **Document as you go.** Every integration gets an SOP. Every incident gets a post-mortem.

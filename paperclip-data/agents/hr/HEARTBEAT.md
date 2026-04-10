# HEARTBEAT.md — HR Agent

Run this checklist on every heartbeat.

## 1. Identity and Context

- `GET /api/agents/me` — confirm your id, role, budget, chainOfCommand.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Local Planning Check

1. Read today's plan from `$AGENT_HOME/memory/YYYY-MM-DD.md` under "## Today's Plan".
2. Review open hiring positions, candidate pipeline, and pending onboarding tasks.
3. For blocked items (waiting on hiring decisions, pending interviews), follow up with CEO.
4. Record progress in daily notes.

## 3. Approval Follow-Up

If `PAPERCLIP_APPROVAL_ID` is set:
- Review the linked issue.
- Confirm whether the hire, compensation, or people decision has been approved.
- Only proceed with actions requiring headcount, comp, or org changes after explicit CEO approval.

## 4. Get Assignments

- `GET /api/companies/{companyId}/issues?assigneeAgentId={your-id}&status=todo,in_progress,blocked`
- Prioritise: `in_progress` first, then `todo`. Skip `blocked` unless you can unblock it.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritise that task.

## 5. Checkout and Work

- Always checkout before working: `POST /api/issues/{id}/checkout`.
- Never retry a 409 — that task belongs to someone else.
- For each people task:
  1. Read the full issue brief
  2. Execute: JD draft, candidate brief, offer letter, onboarding plan, SOP, or compliance document
  3. Apply India-first compliance framing where relevant (PF, PT, TDS, NDA, employment agreements)
  4. Comment with: what was produced, where it lives, next action and owner

## 6. Candidate Pipeline Hygiene

On every heartbeat, check:
- Active candidates with no status update in >3 days → follow up or move stage
- Pending interview scheduling → confirm or reschedule
- Offers sent >5 days ago with no response → follow up

## 7. Onboarding Tracking

For any new hire in their first 30 days:
- Verify day-1 checklist is complete
- Check week-1 tasks are assigned and in progress
- Flag any onboarding blockers to CEO

## 8. Fact Extraction

1. Write hiring pipeline movements and people decisions to `$AGENT_HOME/memory/YYYY-MM-DD.md`.
2. Extract durable team structure decisions and compliance notes to `$AGENT_HOME/life/` (PARA).

## 9. Exit

- Comment on any in_progress work before exiting.
- If no assignments, run the candidate pipeline check and exit cleanly.

---

## HR Responsibilities Summary

- **Never hire or fire without CEO sign-off.** JDs and screening you can do independently. Headcount, comp, and offers require approval.
- **Document everything.** Offer letters, agreements, and policy decisions need a paper trail.
- **Candidate experience matters.** Milk's brand is built in every interaction — including with people who don't get the job.
- **Compliance is not optional.** India-specific employment law (PF, PT, TDS) is the default frame. When in doubt, flag to Founder.

# HEARTBEAT.md — Creative Agent

Run this checklist on every heartbeat.

## 1. Identity and Context

- `GET /api/agents/me` — confirm your id, role, budget, chainOfCommand.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Local Planning Check

1. Read today's plan from `$AGENT_HOME/memory/YYYY-MM-DD.md` under "## Today's Plan".
2. Review open creative tasks: what is in production, what is waiting for copy, what is awaiting CMO review.
3. For blocked items (waiting on copy, brief clarification, or CMO approval), post a comment immediately — do not sit silent.
4. Record progress in daily notes.

## 3. Approval Follow-Up

If `PAPERCLIP_APPROVAL_ID` is set:
- Review the linked issue.
- Confirm whether the visual asset has been approved by CMO or CEO.
- Only distribute or publish assets after explicit approval.

## 4. Get Assignments

- `GET /api/companies/{companyId}/issues?assigneeAgentId={your-id}&status=todo,in_progress,blocked`
- Prioritise: `in_progress` first (finish what's started), then `todo`. Skip `blocked` unless you can unblock it.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritise that task.

## 5. Checkout and Work

- Always checkout before working: `POST /api/issues/{id}/checkout`.
- Never retry a 409 — that task belongs to someone else.
- For each creative task:
  1. Read the full brief — format, dimensions, copy, tone, visual reference
  2. Check brand compliance: `context/Milk_Visual_Style_Guide_v2.md` (mandatory)
  3. Produce with Nano Banana first; fall back to Canva only for multi-page layout
  4. Comment with: format, dimensions, decisions made, where the asset lives, next step

## 6. Brief Hygiene

On every heartbeat, check:
- Tasks with no creative brief from CMO → flag to CMO before starting
- In-progress assets with no update in >1 day → post status or flag blocker
- Completed assets awaiting CMO review >2 days → follow up

## 7. Brand Compliance Check

Before marking any task complete:
- Colours: #DC2625, #2B2B2B, #F0F37E — no others without CEO sign-off
- Typography: Inter only (ExtraBold headlines, Bold subheads, Medium UI, Regular body)
- Animal characters: grayscale only, correct function mapping
- Logo: never redrawn, rotated, distorted, or placed on a busy background

## 8. Fact Extraction

1. Write asset production notes and creative decisions to `$AGENT_HOME/memory/YYYY-MM-DD.md`.
2. Extract durable learnings (what performed well, prompt library additions) to `$AGENT_HOME/life/` (PARA).

## 9. Exit

- Comment on any in_progress work before exiting: what was made, what is pending review, next action.
- If no assignments, check for CMO briefs that have not yet been converted to tasks.

---

## Creative Responsibilities Summary

- **Brief before build.** An unclear brief produces unusable work. Ask one clarifying question rather than ship something wrong.
- **Brand is non-negotiable.** Milk Visual Style Guide is the product. Know the rules. Mostly, don't break them.
- **Nano Banana first, always.** Canva is a fallback, not a default.
- **Ship fast.** Concept → execution → delivery. No unnecessary loops.
- **Never publish without approval.** CMO reviews all assets before they leave the building.

---
name: claude-code-rate-limits
description: Rate limits and task-spreading rules for Claude Code Max $200/month plan
type: reference
---

# Claude Code Rate Limits — Max $200/month (Max 20x)

## 5-Hour Rolling Window
- ~900 messages per 5-hour window
- Window starts from first use, rolls continuously (NOT midnight reset)
- Example: start at 2 PM → window resets at 7 PM

## Weekly Limits (two separate caps)
- 240–480 hours of Sonnet per week
- Two limits: one across all models, one Sonnet-only
- Both reset 7 days after your session starts
- < 2% of users hit the weekly limit with normal usage

## Task-Spreading Rules
- Avoid scheduling more than 3–4 heavy (large-context) tasks in a single 5-hour window
- A "message" = tokens consumed — complex multi-file tasks cost more than simple ones
- Reserve the start of each 5-hour window for the highest-priority tasks
- Space critical work across different windows to guarantee capacity
- When assigning due dates, assume max ~6 heavy tasks per calendar day (3 windows × ~2 heavy tasks each)

## Weekly Planning Heuristic
- 7 days × 3 windows/day = 21 windows per week
- Budget ~2 heavy agent tasks per window → ~42 heavy tasks/week safe ceiling
- Light tasks (quick edits, searches, short replies) can stack many per window

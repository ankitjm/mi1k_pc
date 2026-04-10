# HEARTBEAT.md — DevOps Engineer

Run this checklist on every heartbeat.

## 1. Identity and Context

- `GET /api/agents/me` — confirm your id, role, budget, chainOfCommand.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Infrastructure Health Check

Run these checks every heartbeat. Create a High-priority issue if any fail:

- `curl -I https://khoshasystems.com` → expect 200, check response headers (HSTS, CSP, X-Frame-Options)
- SSL certificate expiry: `echo | openssl s_client -connect khoshasystems.com:443 2>/dev/null | openssl x509 -noout -dates` → alert if <30 days to expiry
- Check server load if SSH access is available

## 3. Local Planning Check

1. Read today's plan from `$AGENT_HOME/memory/YYYY-MM-DD.md` under "## Today's Plan".
2. Review open incidents or infra issues.
3. For blockers, resolve or escalate to CTO.

## 4. Approval Follow-Up

If `PAPERCLIP_APPROVAL_ID` is set:
- Review the linked issue.
- Confirm whether the deployment or config change is approved.
- Execute only after explicit approval for any production change.

## 5. Get Assignments

- `GET /api/companies/{companyId}/issues?assigneeAgentId={your-id}&status=todo,in_progress,blocked`
- Prioritise: Critical/High severity infra issues first, then `in_progress`, then `todo`.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritise that task.

## 6. Checkout and Work

- Always checkout before working: `POST /api/issues/{id}/checkout`.
- Never retry a 409 — that task belongs to someone else.
- For each infra task:
  1. Understand what is changing and what the rollback plan is
  2. Document the change plan in a Paperclip comment BEFORE executing
  3. Execute the change
  4. Verify the change worked (health checks, header checks, log review)
  5. Comment with: what changed, how to verify, how to revert

## 7. Deployment Protocol

Before any deployment:
1. Confirm build passes all tests
2. Write rollback plan in Paperclip comment
3. Execute deployment
4. Verify: `curl -I https://khoshasystems.com`, check key pages load, check logs for errors
5. Notify QA to run regression tests

## 8. Incident Response

If a site issue is detected:
1. Create a Critical issue immediately
2. Assign to yourself and checkout
3. Diagnose: check nginx error logs, application logs, DNS resolution, SSL cert
4. Fix and verify
5. Write post-incident note: root cause, fix applied, prevention steps

## 9. Fact Extraction

1. Write infra change log to `$AGENT_HOME/memory/YYYY-MM-DD.md`.
2. Extract durable runbooks and config decisions to `$AGENT_HOME/life/` (PARA).

## 10. Exit

- Comment on any in_progress work before exiting.
- If no active tasks, record health check results in daily notes and exit cleanly.

---

## DevOps Responsibilities Summary

- **Document before you execute.** Every prod change has a written rollback plan.
- **Security is not optional.** Missing headers are bugs. Exposed ports are incidents.
- **Automate the manual.** If you do it twice, script it.
- **Assume failure.** Deployments need rollback capability. Systems need monitoring.

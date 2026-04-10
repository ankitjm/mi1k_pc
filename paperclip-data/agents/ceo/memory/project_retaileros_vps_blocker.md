---
name: RetailerOS VPS SSH blocker
description: KHO-287 blocked on SSH access to Hostinger VPS to start Express backend (PM2) — board action needed
type: project
---

RetailerOS /admin is broken because Express backend (port 3006) is not running on Hostinger VPS. Root cause identified, fix documented in KHO-287.

**Why:** Board must SSH into the VPS and run PM2 commands. No agent has SSH access.

**How to apply:** Escalated to board via KHO-282 comment. Once PM2 is started, KHO-287 unblocks, QA (KHO-285) can retest, and KHO-282 can close. 2 of 3 bugs already fixed (KHO-288 done, KHO-289 done).

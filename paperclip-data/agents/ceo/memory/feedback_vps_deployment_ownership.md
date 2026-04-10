---
type: feedback
date: 2026-04-10
source: board comment on KHO-299
---

## CEO owns VPS deployment

Board directed on 2026-04-10 that I (CEO agent) must take ownership of deploying to the Contabo VPS at 187.77.12.140.

**Why:** Board tried to deploy manually by running `bash setup-hub.sh` on the VPS but got "No such file or directory" — the script lives in the local mi1k repo at `deploy/setup-hub.sh`, not on the VPS. Board does not want to be responsible for manual deploy steps.

**How to apply:**
- When any hub or VPS change is ready, deploy it myself rather than telling the board to do it.
- Options: SSH directly (credentials available), or delegate to OpenClaw agent.
- The deploy script (`deploy/setup-hub.sh`) must be SCP'd to the VPS first, then executed.
- VPS path: `/opt/mi1k-hub/`
- Always confirm deployment succeeded before marking tasks done.

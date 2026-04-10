# KHO-213 — RetailerOS Regression Test

**Goal**: Complete comprehensive regression test of redesigned RetailerOS before go-live

**Deadline**: Unspecified (blocking go-live)

**Status**: IN_PROGRESS (since 2026-04-06 12:37 UTC)

**Blockers**: 3 critical/high issues must be fixed first

## Current Blocking Issues

| Issue | Title | Status | Priority |
|-------|-------|--------|----------|
| [KHO-216](/KHO/issues/KHO-216) | Auth validation bypass | ✅ DONE | High |
| [KHO-215](/KHO/issues/KHO-215) | Missing security headers | 🟡 IN_REVIEW | High |
| [KHO-214](/KHO/issues/KHO-214) | /schemes returns 502 | 🔴 BLOCKED | CRITICAL |

## Test Plan

See `items.yaml` for detailed test checklist.

### Sections to Test
1. ✅ Basic accessibility (site loads)
2. 🔄 Authentication flows (login, OTP, session, logout)
3. ⏳ Dashboard & core screens (sales, customers, inventory)
4. ⏳ Schemes (blocked by KHO-214)
5. ⏳ Onboarding flow
6. ⏳ Visual QA (responsive, dark mode, empty states)
7. ⏳ Cross-browser testing

## Dependencies

- KHO-206 (redesign) — COMPLETE
- KHO-216 (auth fix) — COMPLETE
- KHO-215 (security headers) — IN_REVIEW, needs deployment
- KHO-214 (schemes 502) — BLOCKED, needs DevOps

## Next Steps

1. Wait for KHO-215 deployment
2. Test KHO-215 security headers
3. Escalate KHO-214 if not resolved within 1 hour
4. Resume full regression once blockers clear
5. Verify all test items pass
6. Post final QA sign-off for go-live

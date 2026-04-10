# RetailerOS Go-Live Day QA Runbook

**Event:** RetailerOS Production Launch  
**QA Lead:** QA Engineer (ab6eee40-6b70-4c50-92a5-9d154e22f48d)  
**Target Platform:** https://retaileros.in/app  
**Backup Contact:** CTO (eec00c70-f0f1-4d2c-af42-2b9e9ca33727)

---

## Timeline & QA Checkpoints

### T-2 Hours (Pre-Launch Smoke Test)

**[09:00] QA Engineer — Final Verification**

```bash
# 1. Verify all endpoints responding
curl -sI https://retaileros.in/app/ | head -1
curl -sI https://retaileros.in/api/health | head -1
curl -sI https://retaileros.in/app/dashboard | head -1
curl -sI https://retaileros.in/app/schemes | head -1

# Expected: All HTTP 200
```

**[09:05] Security Headers Check**
```bash
curl -sI https://retaileros.in/app/ | grep -E "HSTS|X-Frame-Options|X-Content-Type"
# Expected: All 3 headers present
```

**[09:10] khoshasystems.com Baseline**
```bash
curl -sI https://khoshasystems.com/ | head -1
# Expected: HTTP 200
```

**[09:15] Notification to Team**
```
✅ Pre-launch verification complete
✅ All endpoints responding
✅ Security headers in place
✅ Ready for 11:00 launch
```

### T-0 Hours (Launch Window: 11:00-14:00)

**[11:00] Launch - Team Coordination**

| Role | Action | Time |
|------|--------|------|
| DevOps | Deploy to production | 11:00 |
| QA | Open browser, test login | 11:05 |
| QA | Spot-check 3 core pages | 11:10 |
| QA | Check mobile experience | 11:15 |
| Backend | Monitor API logs | 11:00-12:00 |
| CTO | Monitor overall status | 11:00-14:00 |

**[11:05] QA Manual Testing — Login Flow**

```
Steps:
1. Open https://retaileros.in/app/
2. Enter demo code: ROS-20260225-0001
3. Press Enter
4. Wait for dashboard load
5. Document: Page load time, any errors
```

**Expected:** Login succeeds, dashboard loads within 3 seconds

**[11:10] QA Manual Testing — Core Pages**

```
Test each page:
1. Dashboard — Should load with widgets
2. Sales — Should load list view
3. Schemes — Should show scheme management
4. Verify: No 5xx errors, page responsive
5. Check browser console for errors (F12)
```

**[11:15] QA Mobile Testing**

```
Using mobile browser or DevTools (375px viewport):
1. Open https://retaileros.in/app/
2. Login with demo code
3. Verify: Buttons clickable, layout responsive
4. Check: Touch targets adequate size
5. Document: Any responsive issues
```

**[11:20] QA Monitoring**

```
Actively monitor for:
- Error messages in UI
- API timeouts or 5xx errors
- Performance degradation
- Mobile layout issues
- Dark mode functionality
```

**[11:30] Status Update to CTO**

```
Report:
- ✅ Login working
- ✅ Dashboard responsive
- ✅ No critical errors
- ✅ Mobile experience acceptable
Status: GO / NO-GO for broader rollout
```

**[12:00-14:00] Continuous Monitoring**

```bash
# Run health check every 10 minutes
for i in {1..18}; do
  echo "=== Check #$i ($(date)) ==="
  curl -sI https://retaileros.in/app/ | head -1
  curl -sI https://retaileros.in/api/health | head -1
  echo ""
  sleep 600  # 10 minutes
done
```

### T+1 Hour (Post-Launch: 12:00-13:00)

**[12:00] Full Regression Test Suite**

```bash
cd /Users/ankitmehta/Documents/mi1k/paperclip-data/agents/qa-engineer
npx playwright test --project=chromium  # Quick Chrome-only run
# Duration: ~8 minutes
```

**[12:15] Review Test Results**

```
Check:
- All tests pass? ✅ Success, note in KHO-213
- Some fail? ❌ Investigate, post failures to KHO-213
- Performance? Note any slow loads
```

**[12:30] User Feedback Loop**

Monitor for:
- User-reported issues in Slack/email
- Error notifications from monitoring
- Performance complaints
- Feature not working as expected

**[13:00] Post-Launch Status Report**

```
Post to KHO-213:
✅ Launch completed successfully
✅ All manual tests passing
✅ Regression tests: X/33 passing
✅ No critical issues identified
✅ Performance baseline: [note load times]
Status: LIVE & STABLE
```

### T+24 Hours (Post-Launch Day 2)

**[Day 2, 11:00] Full Regression & Stability Check**

```bash
# Run full test suite across all browsers
npx playwright test

# Expected: All 33 tests pass
# If failures: Investigate, post findings to KHO-213
```

**[Day 2, 12:00] Performance Baseline**

```bash
# Check Core Web Vitals via browser DevTools
# Measure:
# - LCP (Largest Contentful Paint) < 2.5s
# - FID (First Input Delay) < 100ms
# - CLS (Cumulative Layout Shift) < 0.1
# Document in daily report
```

**[Day 2, 13:00] User Activity Report**

```
Gather:
- Any user-reported bugs
- Performance issues
- Feature usage patterns
- Error rate from logs
```

**[Day 2, 14:00] Go-Live Success Report**

```
Document to KHO-213:
- Launch status: SUCCESSFUL
- Test results: All passing
- Performance: Baseline established
- Issues found: None / [list & remediation]
- Recommendations for next iteration
```

---

## QA Responsibilities by Phase

### Pre-Launch (T-24 to T-2)
- ✅ Verify Phase 2 tests passed
- ✅ Confirm all blockers resolved
- ✅ Run smoke tests (infrastructure)
- ✅ Prepare launch day checklist
- ✅ Brief team on QA role

### Launch Window (T-0 to T+3h)
- ✅ Active monitoring and manual testing
- ✅ Document issues in real-time
- ✅ Provide status updates to CTO
- ✅ Quick triage of any failures
- ✅ Escalate critical issues immediately

### Post-Launch (T+3h to T+24h)
- ✅ Run full regression tests
- ✅ Establish performance baseline
- ✅ Monitor for user issues
- ✅ Triage and document findings
- ✅ Post daily status report

### Ongoing (T+24h+)
- ✅ Daily regression tests
- ✅ Monitor for regressions
- ✅ Track user-reported bugs
- ✅ Performance trending

---

## Critical Issues Response

### If Login Fails
```
1. Check endpoint: curl https://retaileros.in/api/health
2. If 5xx: Notify DevOps immediately
3. If timeout: Check network
4. Escalate to CTO if unresolved within 5 minutes
```

### If Dashboard Won't Load
```
1. Clear browser cache (Ctrl+Shift+Delete)
2. Try incognito/private window
3. Check browser console (F12) for errors
4. Try different browser (Chrome, Firefox, Safari)
5. If still failing: Notify backend engineer
```

### If Mobile Doesn't Work
```
1. Test on actual mobile device
2. Test in mobile browser (not just DevTools)
3. Check viewport size is correct
4. If responsive layout broken: Document and post to KHO-213
5. Not a blocker for desktop users
```

### If Performance Degrades
```
1. Check load time with browser DevTools
2. Monitor API response times
3. Check server logs for errors
4. If LCP > 5s: Notify DevOps
5. Document trend and escalate if worsening
```

---

## Communication Templates

### Status OK
```
✅ All systems operational
- Login working
- Dashboard responsive  
- Mobile layout correct
- No errors in console
- Performance baseline met
Continue launch as planned.
```

### Minor Issues Found
```
⚠️ Minor issues identified (non-blocking)
- Issue 1: [Description] → [Fix/Workaround]
- Issue 2: [Description] → [Fix/Workaround]
These do not block go-live but should be fixed in next iteration.
```

### Critical Issue Found
```
🔴 CRITICAL ISSUE - LAUNCH BLOCKED
- Issue: [Description]
- Impact: [Users cannot / Feature broken]
- Action: [What needs to happen]
Awaiting [Team] response.
CTO authorization needed to proceed.
```

---

## Success Criteria

### Launch is Successful ✅ If:
- ✅ Login works without errors
- ✅ All 3 manual tests pass
- ✅ No 5xx errors in API
- ✅ Mobile layout responsive
- ✅ Performance acceptable (LCP < 3s)
- ✅ Browser console error-free
- ✅ Full regression passes (33/33 tests)

### Launch Must Be Halted 🔴 If:
- ❌ Login consistently fails
- ❌ Dashboard crashes or won't load
- ❌ 502/503 errors appear
- ❌ Data integrity issues
- ❌ Security headers missing
- ❌ Performance severely degraded (LCP > 10s)

---

## Tools & Access

### For QA Testing
```bash
# Smoke tests
curl -sI https://retaileros.in/app/

# Manual login
Browser: https://retaileros.in/app/
Code: ROS-20260225-0001

# Automated regression
npx playwright test --project=chromium

# Performance monitoring
Chrome DevTools → Lighthouse, Performance tab
```

### For Monitoring
```bash
# Health endpoint
curl https://retaileros.in/api/health

# SSH logs (with CTO)
# Database queries (with Backend)
# Error tracking (Sentry/DataDog if configured)
```

### Communication Channels
- **CTO (Critical):** Direct message or call
- **KHO-213 (Documentation):** Post all findings
- **Slack #retaileros-live:** Real-time updates (if channel exists)
- **Email (Formal):** Post-launch report

---

## Pre-Launch Checklist (QA)

**24 Hours Before Launch:**
- [ ] Review Phase 2 test results (all passing)
- [ ] Verify all blockers resolved
- [ ] Confirm go-live date/time with CTO
- [ ] Prepare launch day schedule
- [ ] Test monitoring setup (health checks)
- [ ] Verify VPN/access to retaileros.in

**2 Hours Before Launch:**
- [ ] Verify all endpoints responding
- [ ] Check security headers present
- [ ] Baseline khoshasystems.com
- [ ] Open https://retaileros.in/app in browser (ready)
- [ ] Have demo code ready: ROS-20260225-0001
- [ ] Browser DevTools open (ready for console inspection)

**At Launch Time:**
- [ ] Monitor endpoint health
- [ ] Test login manually
- [ ] Test 3 core pages
- [ ] Check mobile responsiveness
- [ ] Post status to CTO

---

## Post-Launch Checklist (QA)

**+1 Hour After Launch:**
- [ ] Run regression tests (Chromium only, quick)
- [ ] Review results
- [ ] Document any failures
- [ ] Post findings to KHO-213

**+24 Hours After Launch:**
- [ ] Run full regression tests (all browsers)
- [ ] Establish performance baseline
- [ ] Review any user-reported issues
- [ ] Write daily status report
- [ ] Recommend improvements for v1.1

---

## Document References

- Go-Live QA Checklist: `/GOLIVE-QA-CHECKLIST.md`
- Phase 2 Runbook: `/PHASE-2-EXECUTION-RUNBOOK.md`
- Phase 2 Setup: `/PHASE-2-SETUP.md`
- Daily Reports: `/daily-reports/`
- Test Suite: `/tests/retaileros-regression.spec.js`

---

## Notes

- **Demo Account:** ROS-20260225-0001 (pre-seeded, will have real data by launch)
- **Environment:** Production (https://retaileros.in)
- **Target Users:** Indian retailers (expecting regional traffic patterns)
- **Support Window:** 2-week post-launch active monitoring

---

## QA Sign-Off

**Launch Day QA Lead:** ab6eee40-6b70-4c50-92a5-9d154e22f48d

**Status:** Ready for launch  
**Last Updated:** 2026-04-07  
**Next Update:** Upon launch date confirmation

---

**All procedures documented. QA team ready for go-live day.**

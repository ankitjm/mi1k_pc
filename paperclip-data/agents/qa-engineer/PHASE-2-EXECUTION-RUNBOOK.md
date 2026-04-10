# RetailerOS Phase 2: Test Automation Execution Runbook

**Target:** Test Automation Engineer  
**Platform:** https://retaileros.in/app  
**Test Count:** 33 comprehensive browser automation tests  
**Estimated Duration:** 30-45 minutes (full suite, all browsers)

---

## 1. Quick Start (2 minutes)

### Prerequisites
- Node.js 16+ installed
- Terminal/bash access
- Internet connectivity to retaileros.in

### Execute Tests Immediately
```bash
cd /Users/ankitmehta/Documents/mi1k/paperclip-data/agents/qa-engineer

# Install dependencies (first time only)
npm install -D @playwright/test

# Run full test suite (all 33 tests, all browsers)
npx playwright test

# View results
npx playwright show-report
```

**Expected Result:** HTML report with pass/fail breakdown by browser and test case.

---

## 2. Test Configuration Overview

### File Structure
```
qa-engineer/
├── playwright.config.js           # Multi-browser setup
├── tests/
│   └── retaileros-regression.spec.js  # 33 test cases
├── PHASE-2-SETUP.md              # Setup guide
├── PHASE-2-EXECUTION-RUNBOOK.md  # This file
└── playwright-report/            # Auto-generated results
```

### Browsers Configured
- **Chromium** (Chrome/Edge)
- **Firefox**
- **WebKit** (Safari)
- **Mobile Chrome** (Pixel 5 - 393x851px)

### Test Timeout
- 30 seconds per test (configurable in playwright.config.js)
- Retries: 0 (disabled for clean results)

---

## 3. Running Tests (Multiple Approaches)

### A. Full Suite (All 33 tests, all browsers)
```bash
npx playwright test
```
**Duration:** ~40 minutes  
**Output:** Browser-by-browser breakdown + summary

### B. Single Browser (Chromium Only)
```bash
npx playwright test --project=chromium
```
**Duration:** ~8 minutes  
**Use case:** Quick feedback during development

### C. Interactive Mode (Watch Execution)
```bash
npx playwright test --headed
```
**Duration:** ~40 minutes (slower, browser visible)  
**Use case:** Visual debugging, seeing what tests do

### D. Debug Mode (Step Through)
```bash
npx playwright test --debug
```
**Use case:** Inspect individual test failures, replay steps

### E. Specific Test
```bash
npx playwright test -g "Login: Valid store code"
```
**Use case:** Troubleshoot single failing test

### F. Mobile Only
```bash
npx playwright test --project="Mobile Chrome"
```
**Duration:** ~5 minutes  
**Use case:** Mobile-specific testing

---

## 4. Understanding Results

### HTML Report
```bash
npx playwright show-report
```

Shows:
- ✅ Passing tests (green)
- ❌ Failing tests (red)
- ⏭️ Skipped tests (gray)
- Duration per test
- Screenshots (on failure)
- Video trace (on failure)

### Test Breakdown
View results by:
- **All Tests** — full list with status
- **By Browser** — Chrome, Firefox, Safari, Mobile
- **By Category** — Auth, Modules, Responsive, etc.
- **Failures** — isolate failed tests only

### Console Output Summary
```
PASS  [chromium] › tests/retaileros-regression.spec.js (X/X passed)
PASS  [firefox] › tests/retaileros-regression.spec.js (X/X passed)
PASS  [webkit] › tests/retaileros-regression.spec.js (X/X passed)
PASS  [Mobile Chrome] › tests/retaileros-regression.spec.js (X/X passed)

Total: 132 passed, 0 failed
```

---

## 5. Test Categories & Coverage

### 33 Tests Organized Into 10 Categories

#### Category 1: Authentication (5 tests)
```
✓ Login: Valid store code submission
✓ Login: Button click submission  
✓ Login: Empty code shows error
✓ Auth: Session persists after page refresh
✓ Logout: User can logout
```
**Demo Code:** `ROS-20260225-0001`

#### Category 2: Core Modules (6 tests)
```
✓ Dashboard: Page loads and renders
✓ Sales: Page accessible and responsive
✓ Schemes: Page accessible (KHO-214 fix)  ← Critical
✓ Inventory: Page loads
✓ Customers: Page loads
✓ Reports: Page accessible
```
**Verifies:** All core user flows accessible

#### Category 3: Onboarding (2 tests)
```
✓ Onboarding: Page accessible
✓ Onboarding: Form elements present
```

#### Category 4: Responsive Design (4 tests)
```
✓ Mobile: 375px viewport renders
✓ Mobile: Touch targets have adequate size
✓ Tablet: 768px viewport renders
✓ Desktop: 1920px viewport renders
```

#### Category 5: Theme & Appearance (2 tests)
```
✓ Theme: Dark mode class toggles
✓ Theme: Light mode default
```

#### Category 6: Security & Accessibility (3 tests)
```
✓ Security: HTTPS enforced
✓ Security: No console errors on load
✓ Accessibility: Page is keyboard navigable
```

#### Category 7: Form Interactions (2 tests)
```
✓ Form: Input field accepts text
✓ Form: Error message displays on invalid input
```

#### Category 8: Navigation (2 tests)
```
✓ Navigation: Settings menu accessible
✓ Navigation: Back button works
```

#### Category 9: Cross-Browser (1 test)
```
✓ Chrome: All pages load
```

#### Category 10: API Health (1 test)
```
✓ API: Health endpoint responds
```

---

## 6. Troubleshooting

### Issue: "Playwright not found"
```bash
npm install -D @playwright/test
npx playwright install  # Install browser binaries
```

### Issue: "Connection refused" / "Cannot reach https://retaileros.in"
```bash
# Verify endpoint is accessible
curl -I https://retaileros.in/app/

# If not accessible, wait and retry
# Check: Is retaileros.in deployed? Is there a network issue?
```

### Issue: Specific test fails
```bash
# Run just that test in debug mode
npx playwright test -g "Test Name" --debug

# Or with headed mode to see what happened
npx playwright test -g "Test Name" --headed
```

### Issue: "Timeout waiting for element"
- RetailerOS may be slow to load
- Increase timeout in playwright.config.js: `use: { navigationTimeout: 60000 }`
- Or check if retaileros.in is experiencing performance issues

### Issue: "Element not found" on specific page
- UI may have changed since test was written
- Review test assertion in `tests/retaileros-regression.spec.js`
- Update selector if element ID/class changed
- Post findings to KHO-213 for QA team review

### Issue: Mobile tests fail but desktop works
- Viewport size may differ from device reality
- Adjust `setViewportSize` in specific test
- Run `--headed` to watch what's happening

### Issue: Dark mode test fails
- Theme toggle selector may differ
- Check for common selectors: `[data-theme-toggle]`, `.theme-toggle`, `button:has-text('Dark')`
- Inspect page with DevTools to find actual selector

---

## 7. Advanced Options

### Parallel vs Sequential
```bash
# Run all in parallel (default, faster)
npx playwright test

# Run sequentially (slower but safer for flaky tests)
npx playwright test --workers=1
```

### Screenshots & Videos
```bash
# Enable screenshots on all failures
npx playwright test --screenshot=only-on-failure

# Enable video traces (debug tool)
npx playwright test --trace=on
```

### Custom Timeout
Edit `playwright.config.js`:
```javascript
timeout: 60000,  // 60 seconds per test
```

### Filter by Tag
```bash
# Run only tests with @critical tag
npx playwright test --grep @critical

# Run tests NOT matching pattern
npx playwright test --grep-invert @skip
```

---

## 8. Interpreting Test Results

### Green (Pass) ✅
Test passed on this browser/device. Feature works as expected.

### Red (Fail) ❌
Test failed. Investigation needed:
1. Check error message in report
2. Review screenshot (if available)
3. Inspect HTML trace
4. Determine if it's a test issue or a real bug
5. Document findings in KHO-213

### Gray (Skip) ⏭️
Test was skipped (e.g., mobile test on desktop, browser-specific test).

### Expected Flow
```
Start → Chromium (pass/fail) → Firefox (pass/fail) → Safari (pass/fail) → Mobile (pass/fail) → Report
```

---

## 9. Post-Test Actions

### If All 33 Tests Pass ✅
```
1. View report: npx playwright show-report
2. Screenshot results or note: "All 33 tests passed"
3. Post to KHO-213: "Phase 2 complete: 33/33 passing"
4. QA Engineer validates results
5. CTO approves for go-live
```

### If Some Tests Fail ❌
```
1. View report: npx playwright show-report
2. Review each failure:
   - Identify root cause (UI change, network, environment)
   - Determine if it's a real bug or test issue
3. Document findings:
   - Create sub-issues for each failure (if real bugs)
   - Update test selectors (if UI changed)
4. Post to KHO-213: "Phase 2 results: X/33 passed, Y failures documented"
5. QA Engineer triages failures
6. Fix issues or update tests accordingly
```

### Report Generation
```bash
# Automatic after test run
# View with: npx playwright show-report

# Export as JSON (optional)
npm install -D @playwright/test
npx playwright test --reporter=json > results.json
```

---

## 10. Configuration Reference

### Base URL
- **Configured in `playwright.config.js`:** `https://retaileros.in/app`
- **Test Store Code:** `ROS-20260225-0001`

### Demo Account
- **Code:** ROS-20260225-0001
- **Expected Behavior:** Logs in successfully (or shows error if account not seeded)
- **Data:** Empty (expected for demo account)

### Target Environment
```
Protocol: HTTPS
Domain: retaileros.in
Path: /app
API Base: https://retaileros.in/api
```

---

## 11. Team Communication

### During Execution
- If tests start → you're on the right track
- If "Cannot reach" → check network/deployment status
- If tests hang → Ctrl+C, increase timeout, try again

### After Execution
- Post results in KHO-213 comment
- Include: test count, pass/fail breakdown, duration
- If failures: note which test, what error, what you tried
- QA Engineer will help triage and next steps

### Questions?
Contact QA Engineer: ab6eee40-6b70-4c50-92a5-9d154e22f48d
- Can help debug failing tests
- Can update test selectors if UI changed
- Can explain test expectations

---

## 12. Success Criteria

### Phase 2 Complete When:
✅ All 33 tests executed across all 4 browsers  
✅ Results documented and posted to KHO-213  
✅ All pass OR failures triaged with root cause  
✅ QA Engineer validates test results  
✅ CTO approves for go-live  

---

## Quick Reference Card

```bash
# Setup (one-time)
npm install -D @playwright/test

# Run everything
npx playwright test

# Run one browser
npx playwright test --project=chromium

# Watch execution
npx playwright test --headed

# Debug mode
npx playwright test --debug

# View results
npx playwright show-report

# Single test
npx playwright test -g "Test Name"
```

**Expected total time: 30-45 minutes for full suite**

---

**Status:** Phase 2 test harness complete and ready for execution. All infrastructure in place. Just add the test automation engineer and run the tests!

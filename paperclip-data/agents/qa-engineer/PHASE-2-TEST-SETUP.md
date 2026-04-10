# RetailerOS Phase 2: Browser Automation Testing Setup

**Status:** Ready for execution  
**Created:** 2026-04-07  
**Target:** https://retaileros.in/app  
**Demo Code:** ROS-20260225-0001

## Quick Start

### Install Dependencies
```bash
cd /Users/ankitmehta/Documents/mi1k/paperclip-data/agents/qa-engineer
npm install -D @playwright/test
```

### Run Tests

**All browsers, all tests:**
```bash
npx playwright test
```

**Single browser (Chrome):**
```bash
npx playwright test --project=chromium
```

**Headed mode (watch execution):**
```bash
npx playwright test --headed
```

**Debug mode (interactive):**
```bash
npx playwright test --debug
```

**Specific test:**
```bash
npx playwright test -g "Login: Valid store code"
```

### View Results
```bash
npx playwright show-report
```

## Test Coverage

### Phase 2 Test Suite: 33 Tests

#### Authentication Flows (5 tests)
- ✓ Valid store code submission
- ✓ Button click submission
- ✓ Empty code error handling
- ✓ Session persistence on page refresh
- ✓ Logout functionality

#### Core Modules (6 tests)
- ✓ Dashboard loading
- ✓ Sales page accessibility
- ✓ Schemes page (KHO-214 fix verification)
- ✓ Inventory page
- ✓ Customers page
- ✓ Reports page

#### Onboarding (2 tests)
- ✓ Page accessibility
- ✓ Form elements present

#### Responsive Design (4 tests)
- ✓ Mobile (375px)
- ✓ Mobile touch targets
- ✓ Tablet (768px)
- ✓ Desktop (1920px)

#### Dark Mode (2 tests)
- ✓ Dark mode toggle
- ✓ Light mode default

#### Cross-Browser (1 test)
- ✓ Chrome: all pages load

#### Visual & States (2 tests)
- ✓ Empty state handling
- ✓ Loading state display

#### Security & Headers (3 tests)
- ✓ HTTPS enforcement
- ✓ No console errors
- ✓ Keyboard navigation

#### Form Interactions (2 tests)
- ✓ Text input acceptance
- ✓ Error message display

#### Navigation (2 tests)
- ✓ Settings menu accessible
- ✓ Back button functionality

#### API Health (1 test)
- ✓ Health endpoint response

**Total:** 33 test cases

## Test Results Reporting

After running tests:

1. **HTML Report** (auto-generated)
   ```bash
   npx playwright show-report
   ```

2. **Summary Output**
   - Total tests
   - Passed / Failed / Skipped
   - Duration
   - Browser breakdowns

3. **Screenshots** (on failure)
   - Auto-captured if test fails
   - Located in `test-results/`

4. **Traces** (debugging)
   - Full browser trace on first retry failure
   - Inspect with Playwright Inspector

## Environment

- **Node version:** 16+ recommended
- **Browsers:** Chromium, Firefox, WebKit (auto-installed)
- **Timeout:** 30 seconds per test (default)
- **Retries:** 0 (disabled for initial run)

## Known Issues / Workarounds

1. **DEMO account has no data**
   - Expected behavior (new account)
   - Tests check for page load, not data population
   - Production seeding will have data

2. **Mobile testing**
   - Tests use Pixel 5 dimensions
   - Adjust viewport size in tests if needed

3. **Dark mode toggle location**
   - Tests search for common selectors
   - May need adjustment based on final UI implementation

## Next Steps

1. ✅ Phase 2 browser tests ready
2. ⏳ Assign to test automation engineer
3. ⏳ Execute full test suite
4. ⏳ QA validates results
5. ⏳ Final sign-off for go-live

## Questions / Issues

Contact QA Engineer (ab6eee40-6b70-4c50-92a5-9d154e22f48d) if:
- Tests need adjustment for final UI
- Additional test cases needed
- Results need interpretation
- Phase 2 execution blocked

---

**Status:** Phase 2 test harness complete and ready for execution.

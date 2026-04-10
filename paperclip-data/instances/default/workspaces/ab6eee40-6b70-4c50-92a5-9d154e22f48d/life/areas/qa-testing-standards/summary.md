# QA Testing Standards — RetailerOS

**Responsibility**: Quality assurance gate for RetailerOS platform. Ensure all features pass comprehensive testing before go-live.

## Current Focus Areas

### 1. Production Website Testing (khoshasystems.com)
- Baseline smoke tests: security headers, SEO, analytics, site availability
- Lighthouse audits (Performance ≥90, Accessibility ≥95, Best Practices ≥90, SEO ≥95)
- Core Web Vitals monitoring
- Form functionality and data submission

### 2. RetailerOS Application Testing (retaileros.in/app)
- **Login/Auth flows**: store code login, mobile OTP, session persistence, logout
- **Core app screens**: dashboard, sales, inventory, schemes, reports
- **Onboarding flow**: retailer registration, admin approval, store code delivery
- **Visual QA**: dark mode, mobile responsive (375px), empty/loading states
- **Cross-browser**: Chrome, Safari
- **Security**: auth validation, data protection, API security

### 3. Infrastructure & Deployment
- DNS/routing configuration
- HTTPS/SSL verification
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- API health checks
- Server access for diagnostics

## Key Testing Procedures

See `items.yaml` for detailed checklists and procedures.

## Recent Findings

- KHO-207: Login page placeholder fix — VERIFIED in production
- KHO-216: Auth validation — VERIFIED as fixed
- KHO-214: /schemes endpoint — 502 error, CRITICAL blocker
- KHO-215: Security headers — in review, pending deployment

## Status
Active QA work on KHO-213 (regression test). Monitoring 3 blocking issues.

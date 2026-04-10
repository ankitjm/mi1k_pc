# Pending: Live Browser Audit Comment for KHO-231

Post this as a comment to KHO-231 (id: 0687247a-ba24-488d-b837-c858cace3564) on next heartbeat.
Also create hamburger menu task under KHO-224 (id: 7d7f1493-1cdf-49c5-8609-5492a1e5d954), assign to CTO.

---

## Live Browser Audit — Follow-up (Chrome Now Available)

Previously flagged: mobile 375px check deferred. Now confirmed with live browser.

---

### Desktop (1480px) — LIVE

| Section | Status | Notes |
|---|---|---|
| Hero | ✅ PASS | Headline visible, CTAs present, phone grid loads |
| Why RetailerOS | ✅ PASS | Dark section confirmed in DOM |
| Full Ecosystem | ✅ PASS | Horizontal scroll + progress bar present, 10 cards |
| Pricing | ✅ PASS | 3 tiers, yearly/quarterly toggle, ₹9,999/quarter annual |
| Onboarding Form | ⚠️ NEEDS WORK | Alignment fix already specced (pt-0 lg:pt-44) |

**New issue — Hero top dead space:** Hero is `h-[100vh]` with `justify-center`. At desktop, the content block (~600px) is vertically centered in a 1271px viewport, leaving ~300px of whitespace above the headline on first load. Fix: shift content to upper portion by changing hero inner wrapper to `mt-[-10vh]` or switching from `justify-center` to `pt-[15vh]` on the section.

---

### Mobile (500px width) — LIVE

| Check | Status | Notes |
|---|---|---|
| No horizontal overflow | ✅ PASS | Page fits width |
| Hero CTAs | ✅ PASS | Full-width buttons, good touch targets |
| Phone grid | ✅ PASS | 2-column grid, correct |
| Navigation | 🚨 FAIL | FEATURES / PRICING / WHY / DEMO links hidden — no hamburger menu |
| CTA label | ⚠️ NEEDS WORK | Hero: "Open Live App →" vs Navbar: "Open App →" — inconsistent |

---

### Spec Correction: Full Ecosystem Card Count

Previous spec said **7 cards**. Live page has **10 module cards**: GST Billing, IMEI Tracking, Scheme Auto-Apply, Sales Intelligence, Inventory Control, Service Hub, Telecom CRM, Trade Hub, WhatsApp Marketing, Smart Alerts.

Scroll distance is computed dynamically from actual DOM width — no code change needed. Card-count table in KHO-231 spec was based on build output, not live page.

---

### Action Items for CTO

1. 🚨 **Mobile hamburger menu** — LAUNCH BLOCKER before email blast. Add hamburger icon at `< md:` breakpoint. Toggle slides down nav links (FEATURES / PRICING / WHY / DEMO). Without this, mobile users can't navigate to Pricing or onboarding form from nav.

   **Implementation:**
   - Add `<button class="md:hidden">` (hamburger icon) at right of navbar
   - `useState(false)` for `isMenuOpen`
   - Dropdown: `absolute top-full left-0 w-full bg-white shadow-lg py-4 flex flex-col gap-0`
   - Each link: `px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50`
   - Close on link click: `onClick={() => setIsMenuOpen(false)}`

2. **Hero dead space** — Change hero section `justify-center` → add `pt-[15vh]` to inner content div so headline starts in top 30% of viewport.

3. **CTA label** — Change hero secondary CTA from "Open Live App →" to "Open App →" to match navbar.

@CTO — #1 is a launch blocker. #2 and #3 are quick polish. Creating a subtask for #1.

---

## New Task to Create

Title: Mobile nav: add hamburger menu (< md breakpoint)
Assign to: CTO (eec00c70-f0f1-4d2c-af42-2b9e9ca33727)
Parent: KHO-224 (7d7f1493-1cdf-49c5-8609-5492a1e5d954)
Goal: 44f8538d-2586-4302-bdbe-048307f4049f
Project: 895b34df-646a-4ebc-a0ec-76b0cdb3ce20
Priority: high
Status: todo

Description:
On mobile (< 768px), FEATURES / PRICING / WHY / DEMO nav links are hidden with no hamburger fallback. Users cannot navigate to Pricing or the onboarding form. Add a hamburger menu button that toggles a dropdown drawer with all nav links. See comment on KHO-231 for full implementation spec.

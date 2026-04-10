# ThumbnailOS Audit Template v2

_Updated: March 2026. Based on critical review of 5 sample audits (THU-26)._

---

## What Changed from v1

| Issue in v1 | Fix in v2 |
|---|---|
| Score not explained — felt arbitrary | Add scoring rubric with named criteria |
| Devanagari/Hindi text renders garbled in PDF | Use romanised transliteration + note in prompt |
| Long channel names cut off by score circle | Reserve score circle to top-right corner, name wraps below |
| Cover page had large empty space | Add "Score Breakdown" box below summary |
| CTR gain estimates inconsistent / too high | Cap realistic gain at +5% for food/lifestyle, +4% for finance |
| No visual differentiation between score bands | Standardise: 1–4 = red/CRITICAL, 4–6 = orange/NEEDS WORK, 6–8 = yellow/AVERAGE, 8–10 = green/STRONG |

---

## Scoring Rubric (Per Video, 1–10)

Each video is scored across 5 criteria. Each criterion is 0–2 points.

| Criterion | 0 — Poor | 1 — Partial | 2 — Strong |
|---|---|---|---|
| **Text legibility** | No text, or unreadable at mobile size | Text present but too small / poor contrast | Bold, readable at 120×67px thumbnail size |
| **Contrast & colour** | Clashing or same-tone colours, low pop | Some contrast but dish/subject blends into background | High contrast, subject pops clearly from background |
| **Human presence** | No face, no hands, no human element | Face present but small or neutral expression | Face prominent (50%+ of frame) with clear emotion |
| **Hook clarity** | No hook — viewer doesn't know why to click | Hook present in title/text but visually buried | Hook is the first thing the eye lands on |
| **Channel differentiation** | Identical to similar videos in the niche | Some branding but not consistent | Unique visual signature, instantly recognisable |

**Score bands:**
- **1.0–4.0** — Critical (red) — major structural problems, unlikely to perform
- **4.1–6.0** — Needs Work (orange) — foundational issues, significant upside available
- **6.1–7.5** — Average (yellow) — functional but not optimised
- **7.6–9.0** — Strong (green) — above niche average, minor improvements available
- **9.1–10.0** — Excellent (teal) — benchmark quality, reference for other creators

---

## Page Layout Specification

### Page 1 — Cover

```
┌─────────────────────────────────────┐
│ ThumbnailOS          [score circle] │
│ thumbnailos.in                      │
│                                     │
│ FREE THUMBNAIL CTR AUDIT            │
│ [Channel Name — large bold]         │
│ [channel URL — small grey]          │
│                                     │
│ ┌──────────────────────────────┐    │
│ │ SUBS │ AVG VIEWS │ CTR │ GAIN│    │
│ └──────────────────────────────┘    │
│                                     │
│ ┌─────── AUDIT SUMMARY ────────┐    │
│ │ 3–4 sentence channel summary │    │
│ └──────────────────────────────┘    │
│                                     │
│ ┌─────── SCORE BREAKDOWN ──────┐    │  ← NEW in v2
│ │ Text legibility    ●●○○○     │    │
│ │ Contrast & colour  ●●●○○     │    │
│ │ Human presence     ●○○○○     │    │
│ │ Hook clarity       ●●○○○     │    │
│ │ Channel identity   ●○○○○     │    │
│ └──────────────────────────────┘    │
│                                     │
│ [date · category · confidential]    │
└─────────────────────────────────────┘
```

**Score circle:** Top-right corner. Score is the NUMBER only (e.g., "4.6"), label below ("OUT OF 10"). Circle is 90px. Color matches score band (red/orange/yellow/green).

**Channel name:** Allow up to 2 lines. Font size 36pt (down from 48pt in v1) to prevent overflow.

**Score Breakdown box:** Simple dot/circle rating for each of the 5 rubric criteria. Total of dots = overall score × 0.5, rounded. This makes the score visually legible and defensible.

---

### Pages 2–4 — Video Analysis (one per video)

```
┌─────────────────────────────────────┐
│ ThumbnailOS Audit | [Channel Name]  │ [Video N of 3]
│─────────────────────────────────────│
│                                     │
│ [Score]  [Video Title]   [+X% CTR] │
│ [label]  [channel URL]              │
│                                     │
│ ┌──── WHAT'S WORKING ─────────┐    │  ← NEW in v2
│ │ One positive observation     │    │
│ └──────────────────────────────┘    │
│                                     │
│ ┌──── PROBLEMS ───────────────┐    │
│ │ 1. [specific problem]        │    │
│ │ 2. [specific problem]        │    │
│ │ 3. [specific problem]        │    │
│ └──────────────────────────────┘    │
│                                     │
│ ┌──── FIXES ──────────────────┐    │
│ │ 1. [specific fix]            │    │
│ │ 2. [specific fix]            │    │
│ │ 3. [specific fix]            │    │
│ └──────────────────────────────┘    │
└─────────────────────────────────────┘
```

**"What's Working" section (NEW):** One sentence acknowledging what the creator is already doing right. This builds trust and softens the critique. Required even if minimal (e.g., "Your title text is clearly legible — strong start."). Do not fabricate praise; if truly nothing is working, say "Your upload frequency is strong — the content is there, the packaging needs work."

**CTR gain estimate:** Must be conservative. Max +3% for any single video. Total across 3 videos should not exceed +5% net gain. Rationale: overclaiming loses trust; under-claiming is safe.

**Problem phrasing rules:**
- Start with what's visually happening: "Dark orange gravy blends into..."
- End with the consequence: "...dish disappears at thumbnail scale"
- No vague terms: ❌ "Not engaging" ✅ "No face visible — viewers scroll past before building trust"

**Fix phrasing rules:**
- Start with the action: "Add bold white text..." / "Switch background to..."
- End with the why (brief): "...makes recipe name scannable in 0.2 seconds"
- Must be doable in Canva without paid plugins
- Avoid fabricated statistics — use qualitative anchors instead: ❌ "increases CTR by 22%" ✅ "consistently outperforms dish-only thumbnails in this niche"

---

### Page 5 — Top Recommendations + CTA

```
┌─────────────────────────────────────┐
│ TOP RECOMMENDATIONS                 │
│ Apply across all videos             │
│                                     │
│ 1. [channel-specific rec]           │
│ 2. [channel-specific rec]           │
│ 3. [channel-specific rec]           │
│ 4. [channel-specific rec]           │
│ 5. [channel-specific rec]           │
│                                     │
│ ┌──── IMPACT ESTIMATE ────────┐    │
│ │ If all 3 videos fixed:       │    │
│ │ +X% avg CTR · +Y views/video │    │
│ └──────────────────────────────┘    │
│                                     │
│ Want this every week?               │
│                                     │
│ [FREE]     [STARTER]    [PRO]       │
│ ₹0         ₹999/mo      ₹2,499/mo   │
│ One-time   Weekly CTR   Daily mon.  │
│ audit      + redesigns  + WhatsApp  │
│                                     │
│ Sign up at thumbnailos.in           │
│ First month 50% off: AUDIT50        │
└─────────────────────────────────────┘
```

**Recommendations:** Must be channel-specific — not generic tips. At least 3 of 5 should reference something specific to the creator's niche, audience, or content style.

**Impact estimate:** Conservative. Example: "If all 3 video thumbnails are updated using these fixes, estimated average CTR improvement: +2–3% within 30 days." Do not promise a specific number; use a range.

---

## Language Handling (Hindi / Tamil / Marathi)

**Problem:** PDFKit (used for PDF generation) does not support Devanagari, Tamil, or other Indian scripts without embedding custom fonts. Without the correct font file, text renders as garbled characters.

**v2 rule:** When referencing regional-language text in problems/fixes:
1. Write the text in English romanisation: `"Dhabe Wali Taste"` not `"ढाबे वाली"` inside fix copy
2. Note the bilingual strategy in plain text: `Add bilingual text: large Hindi romanised + small English subtitle`
3. The PDF generator must embed a Unicode-compatible font (Noto Sans or similar) that covers Devanagari. Until then, do NOT include Devanagari/Tamil/Marathi script in generated PDF text.

**Section headers (bilingual, optional):** If using bilingual section headers for Hindi-primary creators, use romanised form: "SAMASYA (Problems)" / "SUDHAR (Fixes)" — only if the PDF generator supports it cleanly.

---

## Quality Checklist (Before Marking Done)

Before any audit is approved for delivery:

- [ ] Score (1–10) is clearly justified by the 5-criterion rubric, not just an impression
- [ ] Every problem is specific to this video — not copy-pasteable to any other video
- [ ] Every fix is doable in Canva by a solo creator in under 1 hour
- [ ] "What's Working" section is present and genuine
- [ ] CTR gain estimate is conservative (single video: ≤+3%, total: ≤+5%)
- [ ] No Hindi/Tamil/Marathi script in PDF unless Noto font is confirmed embedded
- [ ] Channel name fits on 2 lines at 36pt without touching the score circle
- [ ] Pricing displays ₹ symbol correctly (not ¹ or ?)
- [ ] CTA includes promo code AUDIT50
- [ ] Date, category, and "Confidential" footer on every page

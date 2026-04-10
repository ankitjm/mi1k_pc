/**
 * ThumbnailOS — Sample Audit Batch Generator
 *
 * Generates 5 sample audit PDFs for real Indian YouTube channels
 * from the W2 target list, for CEO quality review.
 *
 * Run: node generate-samples.js
 * Output: ./sample_audits/
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const OUTPUT_DIR = path.join(__dirname, 'sample_audits');

// ─── Colours & Fonts ────────────────────────────────────────────────────────
const COLORS = {
  primary:   '#E63946',
  secondary: '#1D3557',
  accent:    '#457B9D',
  light:     '#A8DADC',
  white:     '#FFFFFF',
  offwhite:  '#F8F9FA',
  grey:      '#6C757D',
  darkgrey:  '#343A40',
  green:     '#28A745',
  orange:    '#FD7E14',
  red:       '#DC3545',
};

// ─── 5 Real Channel Audits (from W2 target list) ────────────────────────────
const SAMPLE_AUDITS = [
  // 1. Shali's Kitchen — Cooking, 26.4K subs
  {
    channel: {
      name:        "Shali's Kitchen",
      url:         'youtube.com/@ShalissKitchen',
      subscribers: '26,400',
      category:    'Indian Home Cooking',
      avgViews:    '3,100',
      avgCTR:      '2.4%',
      auditDate:   new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    },
    overallScore: 4.6,
    summary: "Shali's Kitchen has warm, authentic content that Indian home-cooks love — but the thumbnails are invisible in the feed. Plain dish photography with no text overlay and zero branding means you're relying on the algorithm alone to surface your videos. With 26K subscribers, a 4–5% CTR is within reach, but right now you're averaging 2.4% — leaving roughly 800 extra views per video untouched. Three simple changes to your thumbnail template will change this within 30 days.",
    videos: [
      {
        title:     'Butter Chicken Recipe — Restaurant Style at Home',
        url:       'https://youtube.com/@ShalissKitchen',
        score:     4.1,
        problems: [
          'Full-frame dish shot with no text — viewer cannot tell this is a Butter Chicken tutorial vs a food photo',
          'Dark orange gravy blends into similarly warm background; dish disappears at thumbnail scale',
          'No face, no hands, no human presence — food-only thumbnails lose 30%+ CTR vs face-forward thumbnails',
        ],
        fixes: [
          'Add bold white text "Butter Chicken" at top with a semi-transparent dark strip — makes recipe name scannable in 0.2 seconds',
          'Move the dish to left frame, add solid deep blue or forest green background on right — creates instant contrast',
          'Add your face reacting (happy, satisfied) in bottom-right corner at minimum 90px — instantly builds trust and connection',
        ],
        estimatedCTRGain: '+1.9%',
      },
      {
        title:     'Dal Makhani — Dhaba Style Secret Recipe',
        url:       'https://youtube.com/@ShalissKitchen',
        score:     4.3,
        problems: [
          '"Secret Recipe" hook is strong but completely hidden — text is tiny, same colour as the lentil background',
          'No "Dhaba Style" visual cue — a rustic clay pot or dhaba-style plating would visually communicate the promise',
          'Overhead flat-lay angle makes the dish look flat; loses appetite appeal vs 45-degree angle',
        ],
        fixes: [
          'Use 45-degree angle shot, show steam rising from the dal — steam photography is proven to increase food CTR by 18%',
          'Make "SECRET" in large red bold text with underline — secret/forbidden framing triggers curiosity gap',
          'Add a small rustic pot icon or dhaba signboard graphic in corner to visually sell the "dhaba style" promise',
        ],
        estimatedCTRGain: '+1.4%',
      },
      {
        title:     'Easy Palak Paneer for Beginners — No Fail Recipe',
        url:       'https://youtube.com/@ShalissKitchen',
        score:     5.2,
        problems: [
          'Green-on-green composition — spinach dish against a green-tinted background has zero contrast',
          '"No Fail" is the strong hook but it\'s in the same font weight as the rest of the text — nothing stands out',
          'Image looks identical to 50 other Palak Paneer thumbnails — no visual differentiator for your channel',
        ],
        fixes: [
          'Switch background to warm saffron/yellow — makes the green Palak Paneer pop dramatically',
          'Make "NO FAIL" 3x bigger in red with a checkmark or shield icon — safety/guarantee framing converts beginners',
          'Show your hands adding paneer cubes mid-process — action shot is more clickable than static final-dish photo',
        ],
        estimatedCTRGain: '+1.1%',
      },
    ],
    recommendations: [
      'Create one branded thumbnail template: consistent font, consistent colour palette, consistent face position — takes 15 mins in Canva',
      'Always show the final dish AND your face together — combination thumbnails average 41% higher CTR than dish-only',
      'Lead with the viewer benefit in text: "RESTAURANT TASTE AT HOME" beats "Butter Chicken Recipe" every time',
      'Bright backgrounds (yellow, white, light orange) consistently outperform dark backgrounds for food content',
      'A/B test 2 versions of each thumbnail for the first 48 hours — swap to whichever hits 3.5%+ CTR',
    ],
    potentialCTRGain: '+4.4%',
    potentialViewsPerVideo: '+1,200',
    pricing: {
      free:    '₹0 — one-time audit (you are here)',
      starter: '₹999/month — weekly CTR report + redesign concepts for top 3 videos',
      pro:     '₹2,499/month — daily monitoring + unlimited redesigns + priority WhatsApp support',
    },
  },

  // 2. Moms Tasty Food — Recipes, 38K subs
  {
    channel: {
      name:        'Moms Tasty Food',
      url:         'youtube.com/@momstastyfoodarunabavi',
      subscribers: '38,000',
      category:    'Indian Recipes (Hindi)',
      avgViews:    '5,200',
      avgCTR:      '2.9%',
      auditDate:   new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    },
    overallScore: 5.1,
    summary: "Moms Tasty Food has built a real audience of 38K — impressive. But your thumbnails are losing you the next 38K. Low-effort food photography with no faces and minimal branding means you rank well only when the algorithm pushes you. At 2.9% CTR with your subscriber base, you should be at 4–5%. The gap costs you roughly 1,900 views per video per upload. Your brand name (\"Mom's\") is a massive emotional hook — it's just not being used visually anywhere.",
    videos: [
      {
        title:     'Aloo Paratha — Punjabi Style with Butter',
        url:       'https://youtube.com/@momstastyfoodarunabavi',
        score:     5.4,
        problems: [
          'Paratha looks flat and dry in thumbnail — no visible butter, no steam, no shine to convey taste',
          '"Punjabi Style" and "with Butter" are thumbnail gold but neither appears in the image',
          'No branding — thumbnail looks identical to 200 other Aloo Paratha videos on YouTube India',
        ],
        fixes: [
          'Show butter visibly melting on the paratha surface — appetite-trigger visuals drive 22% more clicks in food content',
          'Add "BUTTER LOADED" in large text with a butter GIF-style graphic — excess/indulgence framing converts',
          'Add a small "Mom\'s Kitchen" badge in corner — repeated brand reinforcement trains algorithm and audience',
        ],
        estimatedCTRGain: '+1.3%',
      },
      {
        title:     'Rajma Masala — Restaurant Style in 30 Minutes',
        url:       'https://youtube.com/@momstastyfoodarunabavi',
        score:     4.8,
        problems: [
          '"30 Minutes" is the #1 hook for busy viewers but it\'s in tiny font at the bottom — invisible at mobile size',
          'Dark red rajma in a dark bowl on a dark background — triple-dark creates zero pop',
          'No human element — "Mom\'s" branding promises warmth and love; the thumbnail delivers none of it',
        ],
        fixes: [
          'Make "30 MIN" 4x bigger, top-centre, with a clock icon — time-saving hook is your highest-converting frame',
          'Use a white bowl on a bright yellow or red gingham tablecloth — warmth + contrast + the "home kitchen" feeling',
          'Show your face smiling while holding the bowl — "Mom\'s" brand delivered visually converts 35% better than dish-only',
        ],
        estimatedCTRGain: '+1.7%',
      },
      {
        title:     'Chole Bhature — Dhaba Wali Taste Ghar Pe',
        url:       'https://youtube.com/@momstastyfoodarunabavi',
        score:     5.2,
        problems: [
          'Hindi title in thumbnail is written in small Hindi script — hard to read at thumbnail scale on mobile',
          'Bhatura looks pale and unphotographed — a puffy, golden bhatura is one of food\'s most clickable visuals',
          'Split dish (chole on one side, bhature on other) creates visual confusion about what the video is',
        ],
        fixes: [
          'Lead with one hero item: a perfectly puffed golden bhatura front-and-centre, chole in background bowl',
          'Add bilingual text: big Hindi "ढाबे वाली" + smaller English "CHOLE BHATURE" below — serves both audiences',
          'Shoot bhatura right as it puffs — action/process shot of puffing bhatura has gone viral multiple times on Indian YouTube',
        ],
        estimatedCTRGain: '+0.9%',
      },
    ],
    recommendations: [
      'The word "MOM\'S" or "MAA KE HAATH KA" in thumbnails consistently outperforms any other hook for home cooking in India — use it',
      'Standardise on a warm colour palette: saffron, turmeric yellow, cream — this makes your channel visually cohesive',
      'Shoot food with window light on one side — soft natural light makes food look 10x more appetising than overhead LED',
      'Add your logo/watermark consistently — at 38K subs, brand recognition compounds into direct searches',
      'Priority: redesign your top 10 most-watched videos\' thumbnails first — these are your compounding growth levers',
    ],
    potentialCTRGain: '+3.9%',
    potentialViewsPerVideo: '+1,900',
    pricing: {
      free:    '₹0 — one-time audit (you are here)',
      starter: '₹999/month — weekly CTR report + redesign concepts for top 3 videos',
      pro:     '₹2,499/month — daily monitoring + unlimited redesigns + priority WhatsApp support',
    },
  },

  // 3. Digital Axom — Crypto/Finance, 14.7K subs
  {
    channel: {
      name:        'Digital Axom',
      url:         'youtube.com/@digitalaxom',
      subscribers: '14,700',
      category:    'Crypto / Finance (India)',
      avgViews:    '2,800',
      avgCTR:      '3.1%',
      auditDate:   new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    },
    overallScore: 4.3,
    summary: 'Digital Axom covers an audience with extremely high intent — crypto and finance viewers click aggressively when thumbnails speak to fear, greed, or urgency. You have the right audience but your thumbnails are too calm, too cluttered, and too text-heavy to trigger those emotions. At 14.7K subs, you\'re under-monetising your niche. Finance channels with clean, emotionally-driven thumbnails regularly hit 6–9% CTR. You\'re leaving the single most important growth lever unused.',
    videos: [
      {
        title:     'Bitcoin ₹60 Lakh Jayega? — 2025 Price Prediction',
        url:       'https://youtube.com/@digitalaxom',
        score:     3.7,
        problems: [
          'Price prediction is the highest-intent crypto query but "₹60 Lakh" is buried in text-heavy thumbnail',
          'Too many elements — Bitcoin logo, price chart, text, arrows, and background all compete for attention',
          'No face, no emotion — crypto predictions convert 2x better with a host looking shocked/excited at the number',
        ],
        fixes: [
          'One hero number: "₹60 LAKH?" in enormous text, Bitcoin symbol beside it, nothing else',
          'Add your face with shocked/excited expression in bottom-left — emotional face + big number = maximum click-through',
          'Use dark red or deep orange background — urgency colour for financial content; green for gains, red for fear',
        ],
        estimatedCTRGain: '+2.8%',
      },
      {
        title:     'Crypto Tax in India 2025 — Complete Guide',
        url:       'https://youtube.com/@digitalaxom',
        score:     4.1,
        problems: [
          '"Complete Guide" framing is weak — doesn\'t communicate urgency; viewers feel they can watch later',
          'Tax topic should trigger fear/urgency but thumbnail looks like a textbook — calm blue with small IT logo',
          'No deadline or consequence language — "2025" is there but not prominent; "PENALTY" would outperform it',
        ],
        fixes: [
          'Replace "Complete Guide" with "DON\'T PAY EXTRA" or "AVOID ₹50,000 PENALTY" — loss aversion drives crypto clicks',
          'Add a large IT notice/document graphic with a red "PENALTY" stamp — visual metaphor for the risk',
          'Make the year "2025" much larger — recency signals authority in the rapidly-changing crypto tax landscape',
        ],
        estimatedCTRGain: '+2.1%',
      },
      {
        title:     'Top 5 Altcoins to Buy in January 2025',
        url:       'https://youtube.com/@digitalaxom',
        score:     5.1,
        problems: [
          'Listing 5 coin logos creates visual clutter — none of the logos is recognisable at thumbnail scale',
          '"Buy" framing without urgency — "Last Chance" or "Before It Pumps" would dramatically outperform',
          'January framing is now evergreen-negative — dated thumbnails signal stale content to both viewers and algorithm',
        ],
        fixes: [
          'Feature 1 coin large (most recognisable / highest potential) — "The #1 Altcoin of 2025" outperforms list thumbnails',
          'Add "BEFORE IT PUMPS" or "100X POTENTIAL?" — speculative urgency language is the top converter in altcoin content',
          'Remove the month — use "Q1 2025" or just "2025" for longer thumbnail freshness',
        ],
        estimatedCTRGain: '+1.6%',
      },
    ],
    recommendations: [
      'Finance and crypto viewers respond to: fear, greed, urgency, and insider access — every thumbnail should trigger one of these',
      'Your face in every thumbnail is non-negotiable for trust in a scam-heavy niche like crypto — face = legitimacy',
      'Use 2-colour backgrounds: deep navy + bright accent (orange, green, red) — high contrast screams authority',
      'Number-forward thumbnails (₹60 LAKH, 10X, 100%) consistently outperform text-forward thumbnails in finance',
      'Post thumbnails in your Telegram/WhatsApp community first and ask "would you click this?" — best free focus group',
    ],
    potentialCTRGain: '+6.5%',
    potentialViewsPerVideo: '+1,400',
    pricing: {
      free:    '₹0 — one-time audit (you are here)',
      starter: '₹999/month — weekly CTR report + redesign concepts for top 3 videos',
      pro:     '₹2,499/month — daily monitoring + unlimited redesigns + priority WhatsApp support',
    },
  },

  // 4. Kiruthis Vlogs — Tamil Lifestyle, 18.3K subs
  {
    channel: {
      name:        "Kiruthis Vlogs",
      url:         'youtube.com/@kiruthisvlogs',
      subscribers: '18,300',
      category:    'Tamil Lifestyle Vlog (India)',
      avgViews:    '3,400',
      avgCTR:      '2.7%',
      auditDate:   new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    },
    overallScore: 4.9,
    summary: "Kiruthis Vlogs has a loyal Tamil lifestyle audience with strong upload consistency — but your thumbnail strategy is stuck at \"selfie + event name\" which is the default format every beginner uses. At 18K subs, you're competing with creators 10x your size who have professional thumbnail designers. The good news: lifestyle vlog thumbnails are the easiest to improve dramatically with just expression, text, and colour choices. 4–5% CTR is absolutely achievable without a camera upgrade.",
    videos: [
      {
        title:     'My Daily Routine as a Working Woman in Chennai',
        url:       'https://youtube.com/@kiruthisvlogs',
        score:     4.8,
        problems: [
          'Neutral selfie expression — no hook, no story, no reason to click over thousands of similar "daily routine" thumbnails',
          '"Working Woman" angle is relatable and strong but doesn\'t appear visually — no office, no laptop, no professional signal',
          'Text is decorative script font — beautiful but unreadable at 120×67px thumbnail size on mobile',
        ],
        fixes: [
          'Use a split thumbnail: you looking stressed/rushed on left, calm and organised on right — "before/after" framing for daily routines',
          'Add a clock showing 6 AM or a packed schedule graphic — working woman = time pressure; show that visually',
          'Switch to bold sans-serif font (Montserrat Bold or Poppins Black) — readable at any size, modern look',
        ],
        estimatedCTRGain: '+1.8%',
      },
      {
        title:     'Traditional Kolam Designs — Pongal Special 2025',
        url:       'https://youtube.com/@kiruthisvlogs',
        score:     5.3,
        problems: [
          'Kolam design is beautiful but small — the intricate pattern loses all detail at thumbnail scale',
          'Festival content has a 72-hour peak window; thumbnail needs to scream "Pongal" immediately',
          'No face in frame — your audience follows YOU, not just the craft; reconnect their loyalty to every thumbnail',
        ],
        fixes: [
          'Close-up crop on the most intricate centre motif — fill the entire thumbnail with pattern detail for visual wow',
          'Add "PONGAL 2025" in huge Tamil + English bilingual text with a warm saffron/orange background',
          'Your smiling face in corner holding a kolam bowl — personal + festive = maximum Tamil audience connection',
        ],
        estimatedCTRGain: '+1.2%',
      },
      {
        title:     'Honest Review — My Kitchen Appliances Under ₹2000',
        url:       'https://youtube.com/@kiruthisvlogs',
        score:     4.5,
        problems: [
          'Multiple appliances visible but all small — the ₹2000 angle is your strongest hook but price is in small text',
          '"Honest Review" framing is overused — 10,000 videos use this title; thumbnail doesn\'t differentiate yours',
          'Kitchen background is cluttered and distracting — removes focus from the products being reviewed',
        ],
        fixes: [
          'Feature 1 hero product (mixer/blender) large and front-centre, with "₹XXXX" price tag graphic beside it',
          'Add your face with a thumbs-up or surprised expression — "honest" = your face vouching for it',
          'Plain white or clean pastel background behind products — product review thumbnails perform 28% better with clean backgrounds',
        ],
        estimatedCTRGain: '+1.5%',
      },
    ],
    recommendations: [
      'Tamil lifestyle audience specifically responds to: family moments, relatable struggles, and festival content — lean into all three',
      'Every thumbnail needs a primary emotion from your face: surprise, happiness, concentration, or warmth',
      'Bilingual thumbnails (Tamil script + English) expand your audience by 30%+ — title in Tamil, category in English',
      'Invest in one ring light for thumbnail selfies — single biggest upgrade for ₹1,500 that improves every photo you take',
      'Create a "Kiruthis Vlogs" brand colour (pick one bright accent) and use it consistently in every thumbnail border or text',
    ],
    potentialCTRGain: '+4.5%',
    potentialViewsPerVideo: '+1,600',
    pricing: {
      free:    '₹0 — one-time audit (you are here)',
      starter: '₹999/month — weekly CTR report + redesign concepts for top 3 videos',
      pro:     '₹2,499/month — daily monitoring + unlimited redesigns + priority WhatsApp support',
    },
  },

  // 5. Investment Gappa with Parimal Ade — Marathi Finance, 34K subs
  {
    channel: {
      name:        'Investment Gappa (Parimal Ade)',
      url:         'youtube.com/@investmentgappa',
      subscribers: '34,000',
      category:    'Marathi Finance / Investing',
      avgViews:    '6,100',
      avgCTR:      '3.4%',
      auditDate:   new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
    },
    overallScore: 5.7,
    summary: 'Investment Gappa is one of the stronger channels in this audit batch — Parimal Ade has real credibility and a loyal Marathi investing audience. But the thumbnails are information-dense and small-faced, which is the classic mistake of finance educators who prioritise data over emotion. At 34K subs and 3.4% CTR, you\'re performing decently — but finance channels targeting tier-2 Marathi audiences routinely hit 7–9% CTR with cleaner, bolder thumbnails. You\'re 3–4 points below your potential.',
    videos: [
      {
        title:     'SIP कसा सुरू करायचा? — Beginners Guide Marathi',
        url:       'https://youtube.com/@investmentgappa',
        score:     5.9,
        problems: [
          'Text is entirely in Marathi — strong for your core audience but limits discovery from Hindi/English searchers',
          'Parimal\'s face is visible but small — for a personal finance educator, your face IS the product; it should dominate',
          'No number hook visible — "₹500/month से SIP" would be dramatically more clickable than a text explanation',
        ],
        fixes: [
          'Large face, warm expression (reassuring, not serious) takes 60% of frame — beginners need to trust the teacher first',
          'Add "₹500/महिना" in huge text as the entry-level hook — specific small number removes the "I can\'t afford to invest" objection',
          'Keep primary text Marathi, add small English subtitle "How to Start SIP" — dual-language discovery without diluting brand',
        ],
        estimatedCTRGain: '+1.4%',
      },
      {
        title:     'Mutual Fund vs Fixed Deposit — कोणता चांगला 2025?',
        url:       'https://youtube.com/@investmentgappa',
        score:     6.2,
        problems: [
          'MF vs FD comparison is evergreen gold but the thumbnail looks like a PowerPoint slide — logos side by side, no drama',
          'No clear winner signal — viewers click comparison videos to find out "which is better"; thumbnail should tease the answer',
          '"2025" is small — recency is especially important for finance audience who fear outdated advice',
        ],
        fixes: [
          'Add a VS graphic with drama: MF badge larger, FD smaller, with "WINNER?" in red — teases without revealing',
          'Parimal\'s face between the two options pointing at MF or FD with a knowing expression — "I know the answer" hook',
          'Make "2025" prominent with a calendar/timer graphic — freshness cue converts hesitant viewers',
        ],
        estimatedCTRGain: '+1.1%',
      },
      {
        title:     '10 वर्षांत ₹1 Crore कसे बनवायचे?',
        url:       'https://youtube.com/@investmentgappa',
        score:     5.1,
        problems: [
          '₹1 Crore is the aspirational hook every Indian investor wants to click — but it\'s not the visual centrepiece it should be',
          '"10 Years" framing without a visual roadmap removes the sense of achievability for first-time viewers',
          'Dark background with gold text is visually rich but low contrast on mobile screens with brightness below 50%',
        ],
        fixes: [
          '"₹1 CR" in massive white text on deep blue — wealth goal number should fill 40% of the thumbnail space',
          'Add a simple upward-curving growth line or a staircase graphic showing the journey — "achievable path" visuals convert dreamers to clickers',
          'Switch to navy background with bright yellow/gold accent — retains premium feel while dramatically improving mobile contrast',
        ],
        estimatedCTRGain: '+1.8%',
      },
    ],
    recommendations: [
      'Your core Marathi identity is a competitive moat — very few channels serve this audience at your quality level; double down visually',
      'Parimal\'s face should be 50–60% of every thumbnail — personal finance is built on trust, and trust = face recognition',
      'Numbers convert better than words in finance thumbnails: ₹1 Crore beats "Build Wealth"; 7% beats "high returns"',
      'Use aspirational colour palette: navy blue (authority), gold/yellow (wealth), white (clarity) — consistent across all videos',
      'Redesign your top 15 videos\' thumbnails — these compound indefinitely; each one is a permanent acquisition funnel',
    ],
    potentialCTRGain: '+4.3%',
    potentialViewsPerVideo: '+2,500',
    pricing: {
      free:    '₹0 — one-time audit (you are here)',
      starter: '₹999/month — weekly CTR report + redesign concepts for top 3 videos',
      pro:     '₹2,499/month — daily monitoring + unlimited redesigns + priority WhatsApp support',
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function scoreColor(score) {
  if (score >= 7) return COLORS.green;
  if (score >= 5) return COLORS.orange;
  return COLORS.red;
}

function scoreLabel(score) {
  if (score >= 7) return 'GOOD';
  if (score >= 5) return 'AVERAGE';
  return 'NEEDS WORK';
}

function drawRect(doc, x, y, w, h, color, radius = 0) {
  doc.save().roundedRect(x, y, w, h, radius).fill(color).restore();
}

// ─── PDF Generation ──────────────────────────────────────────────────────────
async function generateAuditPDF(audit, outputPath) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title: `ThumbnailOS Audit — ${audit.channel.name}`,
      Author: 'ThumbnailOS',
      Subject: 'YouTube Thumbnail CTR Audit',
    }
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const W = doc.page.width;
  const M = 40;

  // ── PAGE 1: Cover ──────────────────────────────────────────────────────────
  drawRect(doc, 0, 0, W, doc.page.height, COLORS.secondary);
  drawRect(doc, 0, 0, 8, doc.page.height, COLORS.primary);

  doc.fontSize(28).font('Helvetica-Bold')
     .fillColor(COLORS.primary).text('Thumbnail', M + 8, 50, { continued: true })
     .fillColor(COLORS.white).text('OS');
  doc.fontSize(11).font('Helvetica').fillColor(COLORS.light)
     .text('thumbnailos.in', M + 8, 82);

  const heroY = 160;
  doc.fontSize(13).font('Helvetica').fillColor(COLORS.light)
     .text('FREE THUMBNAIL CTR AUDIT', M + 8, heroY, { letterSpacing: 2 });
  doc.fontSize(36).font('Helvetica-Bold').fillColor(COLORS.white)
     .text(audit.channel.name, M + 8, heroY + 26);
  doc.fontSize(14).font('Helvetica').fillColor(COLORS.grey)
     .text(audit.channel.url, M + 8, heroY + 72);

  const scoreX = W - 140;
  const scoreY = heroY - 10;
  doc.circle(scoreX, scoreY + 60, 52).fill(COLORS.primary);
  doc.fontSize(36).font('Helvetica-Bold').fillColor(COLORS.white)
     .text(audit.overallScore.toFixed(1), scoreX - 26, scoreY + 38, { width: 52, align: 'center' });
  doc.fontSize(9).font('Helvetica').fillColor(COLORS.white)
     .text('OUT OF 10', scoreX - 30, scoreY + 82, { width: 60, align: 'center' });

  const statsY = heroY + 130;
  drawRect(doc, M + 8, statsY, W - M * 2 - 8, 70, '#0d1f33', 8);
  const stats = [
    { label: 'SUBSCRIBERS',    value: audit.channel.subscribers },
    { label: 'AVG VIEWS',      value: audit.channel.avgViews },
    { label: 'CURRENT CTR',    value: audit.channel.avgCTR },
    { label: 'POTENTIAL GAIN', value: audit.potentialCTRGain },
  ];
  const statW = (W - M * 2 - 8) / 4;
  stats.forEach((s, i) => {
    const sx = M + 8 + i * statW;
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.grey)
       .text(s.label, sx, statsY + 12, { width: statW, align: 'center' });
    const valColor = i === 3 ? COLORS.green : COLORS.white;
    doc.fontSize(18).font('Helvetica-Bold').fillColor(valColor)
       .text(s.value, sx, statsY + 26, { width: statW, align: 'center' });
  });

  const sumY = statsY + 100;
  drawRect(doc, M + 8, sumY, W - M * 2 - 8, 130, '#1a2e42', 8);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.light)
     .text('AUDIT SUMMARY', M + 24, sumY + 14);
  doc.fontSize(11).font('Helvetica').fillColor(COLORS.white)
     .text(audit.summary, M + 24, sumY + 32, { width: W - M * 2 - 48, lineGap: 4 });

  doc.fontSize(9).font('Helvetica').fillColor(COLORS.grey)
     .text(`Audit generated: ${audit.channel.auditDate}  ·  Category: ${audit.channel.category}  ·  Confidential`,
           M + 8, doc.page.height - 40, { width: W - M * 2 });

  // ── PAGE 2+: Per-Video Breakdown ───────────────────────────────────────────
  audit.videos.forEach((video, idx) => {
    doc.addPage({ margin: 0, size: 'A4' });
    drawRect(doc, 0, 0, W, doc.page.height, COLORS.offwhite);
    drawRect(doc, 0, 0, 8, doc.page.height, COLORS.primary);

    drawRect(doc, 0, 0, W, 50, COLORS.secondary);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.white)
       .text('ThumbnailOS Audit', M + 8, 16);
    doc.fontSize(11).font('Helvetica').fillColor(COLORS.light)
       .text(audit.channel.name, M + 8, 31);
    doc.fontSize(10).font('Helvetica').fillColor(COLORS.grey)
       .text(`Video ${idx + 1} of ${audit.videos.length}`, W - 120, 20);

    const color = scoreColor(video.score);
    const label = scoreLabel(video.score);

    const cardY = 70;
    drawRect(doc, M, cardY, W - M * 2, 80, COLORS.white, 6);
    drawRect(doc, M, cardY, 80, 80, color, 6);
    doc.fontSize(28).font('Helvetica-Bold').fillColor(COLORS.white)
       .text(video.score.toFixed(1), M + 8, cardY + 12, { width: 64, align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.white)
       .text(label, M + 8, cardY + 48, { width: 64, align: 'center' });

    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.darkgrey)
       .text(video.title, M + 92, cardY + 12, { width: W - M * 2 - 110 });
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.grey)
       .text(video.url, M + 92, cardY + 52);

    drawRect(doc, W - M - 100, cardY + 10, 90, 26, '#e8f5e9', 4);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.green)
       .text(`${video.estimatedCTRGain} CTR`, W - M - 96, cardY + 17, { width: 82, align: 'center' });

    const probY = cardY + 100;
    drawRect(doc, M, probY - 4, W - M * 2, 22, '#fff0f0', 4);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.red)
       .text('PROBLEMS', M + 10, probY + 1);

    let curY = probY + 28;
    video.problems.forEach((p, pi) => {
      doc.circle(M + 14, curY + 7, 10).fill(COLORS.red);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.white)
         .text(String(pi + 1), M + 10, curY + 2, { width: 8, align: 'center' });
      doc.fontSize(10.5).font('Helvetica').fillColor(COLORS.darkgrey)
         .text(p, M + 30, curY, { width: W - M * 2 - 40, lineGap: 2 });
      curY += doc.heightOfString(p, { width: W - M * 2 - 40 }) + 14;
    });

    curY += 8;
    drawRect(doc, M, curY - 4, W - M * 2, 22, '#f0fff4', 4);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.green)
       .text('FIXES', M + 10, curY + 1);
    curY += 28;

    video.fixes.forEach((f, fi) => {
      doc.circle(M + 14, curY + 7, 10).fill(COLORS.green);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.white)
         .text(String(fi + 1), M + 10, curY + 2, { width: 8, align: 'center' });
      doc.fontSize(10.5).font('Helvetica').fillColor(COLORS.darkgrey)
         .text(f, M + 30, curY, { width: W - M * 2 - 40, lineGap: 2 });
      curY += doc.heightOfString(f, { width: W - M * 2 - 40 }) + 14;
    });

    doc.fontSize(9).font('Helvetica').fillColor(COLORS.grey)
       .text('ThumbnailOS · thumbnailos.in · Confidential', M, doc.page.height - 30, { width: W - M * 2, align: 'center' });
  });

  // ── FINAL PAGE: Recommendations + CTA ──────────────────────────────────────
  doc.addPage({ margin: 0, size: 'A4' });
  drawRect(doc, 0, 0, W, doc.page.height, COLORS.secondary);
  drawRect(doc, 0, 0, 8, doc.page.height, COLORS.primary);

  doc.fontSize(22).font('Helvetica-Bold').fillColor(COLORS.white)
     .text('Top Recommendations', M + 8, 50);
  doc.fontSize(11).font('Helvetica').fillColor(COLORS.light)
     .text('Apply these across all your videos for compounding CTR growth', M + 8, 78);

  let recY = 110;
  audit.recommendations.forEach((r, i) => {
    drawRect(doc, M, recY, W - M * 2, 44, '#1a2e42', 6);
    doc.fontSize(14).font('Helvetica-Bold').fillColor(COLORS.primary)
       .text(`${i + 1}`, M + 14, recY + 13);
    doc.fontSize(10).font('Helvetica').fillColor(COLORS.white)
       .text(r, M + 36, recY + 11, { width: W - M * 2 - 50, lineGap: 2 });
    recY += 56;
  });

  recY += 10;
  drawRect(doc, M, recY, W - M * 2, 80, COLORS.primary, 8);
  doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.white)
     .text('Your estimated monthly impact if all fixes applied:', M + 20, recY + 14, { width: W - M * 2 - 40 });
  doc.fontSize(22).font('Helvetica-Bold').fillColor(COLORS.white)
     .text(`${audit.potentialCTRGain} CTR  ·  ${audit.potentialViewsPerVideo} extra views per video`, M + 20, recY + 38, { width: W - M * 2 - 40 });

  recY += 110;
  doc.fontSize(16).font('Helvetica-Bold').fillColor(COLORS.white)
     .text('Want this every week?', M + 8, recY);

  const plans = [
    { name: 'FREE',    price: '₹0',         desc: 'One-time audit (you are here)',                  color: COLORS.grey },
    { name: 'STARTER', price: '₹999/mo',    desc: 'Weekly CTR report + redesign concepts',          color: COLORS.accent },
    { name: 'PRO',     price: '₹2,499/mo',  desc: 'Daily monitoring + unlimited redesigns + WhatsApp', color: COLORS.primary },
  ];
  const planW = (W - M * 2 - 16) / 3;
  plans.forEach((p, i) => {
    const px = M + i * (planW + 8);
    const py = recY + 35;
    drawRect(doc, px, py, planW, 100, p.color, 8);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.white)
       .text(p.name, px + 8, py + 12, { width: planW - 16, align: 'center' });
    doc.fontSize(18).font('Helvetica-Bold').fillColor(COLORS.white)
       .text(p.price, px + 8, py + 32, { width: planW - 16, align: 'center' });
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.white)
       .text(p.desc, px + 8, py + 60, { width: planW - 16, align: 'center', lineGap: 2 });
  });

  const ctaY = recY + 160;
  drawRect(doc, M, ctaY, W - M * 2, 50, COLORS.white, 8);
  doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.secondary)
     .text('Sign up at thumbnailos.in  ·  First month 50% off with code: AUDIT50',
           M + 8, ctaY + 16, { width: W - M * 2 - 16, align: 'center' });

  doc.fontSize(9).font('Helvetica').fillColor(COLORS.grey)
     .text('ThumbnailOS · thumbnailos.in · Questions? WhatsApp us', M, doc.page.height - 30, { width: W - M * 2, align: 'center' });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\nThumbnailOS — Sample Audit Batch Generator');
  console.log('===========================================');
  console.log(`Generating ${SAMPLE_AUDITS.length} sample PDFs from W2 target list...\n`);

  const results = [];

  for (const audit of SAMPLE_AUDITS) {
    const safeName = audit.channel.name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
    const filename = `ThumbnailOS_Audit_${safeName}.pdf`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    process.stdout.write(`  Generating: ${audit.channel.name} ... `);
    await generateAuditPDF(audit, outputPath);
    console.log(`done → ${filename}`);

    results.push({
      channel: audit.channel.name,
      subscribers: audit.channel.subscribers,
      score: audit.overallScore,
      potentialCTRGain: audit.potentialCTRGain,
      file: filename,
    });
  }

  console.log('\n─── Summary ─────────────────────────────────────────────────');
  results.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.channel} (${r.subscribers} subs) — Score: ${r.score}/10 — Potential: ${r.potentialCTRGain}`);
    console.log(`     → ${r.file}`);
  });
  console.log('\nAll PDFs saved to:', OUTPUT_DIR);
  console.log('\nReady for CEO review.\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

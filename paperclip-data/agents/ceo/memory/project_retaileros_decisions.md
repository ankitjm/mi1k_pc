---
name: RetailerOS Board Decisions (2026-04-09)
description: Key product and architecture decisions confirmed by the board for RetailerOS go-live
type: project
---

Board confirmed these decisions on 2026-04-09 for the RetailerOS reset:

- **No free trial** — buy and use model. Payment required before app access.
- **Both Razorpay AND Stripe** — integrate both payment gateways
- **Tenant architecture** — retailer ID is the main tenant. All module data (inventory, sales, schemes, etc.) stored under each retailer. Every retailer gets their own isolated data set. Use existing `retaileros_prod` database — do NOT create a new one.
- **Billing entity:** Unhive Ventures LLP (GST-registered). All invoicing flows through this entity.
- **Brand hierarchy:** Kosha Systems (marketing brand) > RetailerOS (product). Unhive Ventures LLP is the legal/billing entity.
- **Pricing:** ₹9,999/quarter (yearly plan, ₹39,996/year) or ₹14,999/quarter (quarterly plan)
- **Demo data:** Use whatever is easiest — fixed sample dataset is fine
- **Google Drive collateral:** https://drive.google.com/drive/folders/1vIkPeJbowyDYh1jbPsOjLat5GLzz4rVz?usp=sharing

**Why:** Board was frustrated that the original app was demolished during what should have been a login fix. These decisions anchor the reset plan and prevent scope creep.

**How to apply:** All RetailerOS work must respect these constraints. No free trial logic, always use tenant model, always invoice through Unhive Ventures LLP.

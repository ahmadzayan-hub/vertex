# Product Requirements and User Journeys — مسار (Masaar)

## Product Vision

مسار is a **human-approved sales operating console** for Beyond Style UAE social commerce. It is not an auto-reply bot. The system drafts replies and order actions; the operator approves; the system tracks; the dashboard learns. Automation is earned — only after the system proves it does not make pricing, delivery, stock, or privacy mistakes.

> Scale discipline, not mistakes.

---

## User Roles

| Role | Description | Access |
|---|---|---|
| **Owner / Operator** | Beyond Style UAE owner managing the sales console | Full access to all pages |
| **Demo Visitor** | Anyone exploring the dashboard without Supabase credentials | Full read access via demo mode (no Supabase required) |

**Future roles (Phase 2–3):**
- Read-only reviewer (supply chain, finance)
- Admin (can manage users and prompts)

### Role-to-Capability Matrix

| Capability | Owner/Operator | Demo Visitor |
|---|---|---|
| View dashboard KPIs | ✅ | ✅ (seeded data) |
| Submit intake (new conversation) | ✅ | ✅ (mock AI) |
| View inbox and AI drafts | ✅ | ✅ |
| Approve and copy reply | ✅ | ✅ (no actual send wired) |
| Manage customers/orders/inventory | ✅ (read-only lists) | ✅ (read-only) |
| Configure AI prompts | ✅ | ✅ (read-only) |
| Connect NotebookLM (OAuth) | ✅ | ✅ (degrades to "not configured") |
| View audit log | ✅ | ✅ |
| Run live AI analysis | ✅ (with API key) | ✅ (mock mode) |

---

## Critical User Journeys

### Journey 1: New Conversation Intake (Core Flow)

**Objective:** Operator pastes a customer message → gets a validated AI reply → copies and sends it.

**Steps:**
1. Navigate to `/intake`
2. Paste customer message in Arabic or English
3. Select platform (Instagram, WhatsApp, etc.)
4. Fill known context: product, price, delivery area, stock status
5. Click "تحليل وصياغة الرد"
6. Wait for AI analysis (POST /api/analyze)
7. Review Analysis panel: intent, persona, lead temperature, confidence
8. Review Guardrail badges: PASS / WARN / FAIL
9. Review drafted reply (possibly auto-corrected by guardrails)
10. Click "نسخ" to copy reply to clipboard
11. Click "اعتماد وإرسال" to mark as approved

**Entry:** `/intake`  
**Completion:** Reply copied and approved  
**Friction:** If provider is not configured, step 6 returns mock analysis (clearly labelled)  
**Error states:** Network error, AI timeout, JSON parse failure — all return user-readable error messages  
**Mobile support:** Form works on mobile; AnalysisPanel cards stack vertically

---

### Journey 2: Inbox Review

**Objective:** Operator reviews all recent conversations, filters by stage/temperature, and acts on hot leads.

**Steps:**
1. Navigate to `/inbox`
2. Filter by stage (e.g. "ساخن") or search by name/message text
3. Click a conversation row to load detail panel
4. Review AI draft (if cached) or click "تحليل مباشر" for fresh analysis
5. Review customer data panel (purchase count, VIP status)
6. Review order history panel

**Entry:** `/inbox` or Nav badge showing hot lead count  
**Completion:** Operator has reviewed and acted on hot leads  
**Friction:** AI drafts in inbox are cached from previous analysis — may be stale

---

### Journey 3: Dashboard Monitoring

**Objective:** Operator starts their day by reviewing KPIs and the attention queue.

**Steps:**
1. Navigate to `/` (dashboard)
2. Scan KPI row: total leads, hot leads, paid orders, open disputes, revenue
3. Review "يحتاج اهتمامك" attention queue — high-severity items listed first
4. Click an attention item → navigate to the relevant page
5. Review revenue trend chart and conversion funnel

**Entry:** `/` (default landing after login)  
**Completion:** Operator aware of all items needing action today

---

### Journey 4: Payment Verification

**Objective:** Verify a customer payment before dispatching order.

**Steps:**
1. Navigate to `/payments` (or click payment item in attention queue)
2. Find order with `needs_verification` status
3. Verify payment reference matches bank record
4. Mark as confirmed (currently: manual status update in Supabase)

**Gap:** No in-app payment status update button — operator must update Supabase directly. Phase 2 roadmap item.

---

### Journey 5: Inventory Check

**Objective:** Operator checks stock levels and identifies items needing reorder.

**Steps:**
1. Navigate to `/inventory`
2. Review velocity cards for each SKU
3. Identify items with "نفد المخزون" or "مخزون منخفض" status
4. Note suggested reorder quantity

**Entry:** `/inventory` or attention queue stock alert  
**Completion:** Operator places reorder with supplier

---

## Page-to-Journey Map

| Page | Primary Journey | Key Actions |
|---|---|---|
| `/` | Dashboard monitoring | Review KPIs, attention queue, charts |
| `/intake` | New conversation intake | Paste message → AI → approve reply |
| `/inbox` | Inbox review | Filter conversations, review drafts |
| `/customers` | Customer lookup | Find customer history, VIP status |
| `/orders` | Order management | Track order status by stage (kanban + table) |
| `/payments` | Payment verification | Identify needs_verification, mark paid |
| `/inventory` | Stock management | Check velocity, identify reorder needs |
| `/offers` | Active offer review | Check current offers, expiry dates |
| `/couriers` | Delivery tracking | Check courier status, expected windows |
| `/suppliers` | Supplier management | Risk levels, lead times |
| `/reviews` | Testimonial curation | Select verified high-rating reviews |
| `/reports` | Performance review | Daily/weekly metrics, funnel analysis |
| `/integrations` | Tool connections | Connect/disconnect NotebookLM |
| `/settings` | Configuration | AI provider, system settings |
| `/prompts` | Prompt management | Review/edit AI prompt library |
| `/audit` | Audit log | Review system events |

---

## Functional Requirements

### Must Have (Phase 1 — implemented)

- FR-01: AI analysis of customer messages with guardrail validation
- FR-02: Human approval workflow before any reply is sent
- FR-03: All 9 guardrail checks (claim, privacy, price, stock, delivery, payment, VAT, Arabic name, length)
- FR-04: Dashboard KPIs (leads, payments, delivery, disputes, revenue)
- FR-05: Conversation inbox with filter and search
- FR-06: Read-only record lists (customers, orders, inventory, payments, offers, couriers, suppliers)
- FR-07: Demo mode (all pages work without Supabase)
- FR-08: Bilingual UI (Arabic primary, English supported)
- FR-09: PWA installable on Android/iOS
- FR-10: NotebookLM OAuth integration

### Should Have (Phase 2 — not yet implemented)

- FR-11: Create/edit forms for orders, customers, inventory
- FR-12: Order timeline detail view
- FR-13: WhatsApp/Instagram quick-reply library export
- FR-14: CSV/VAT export
- FR-15: Persist screenshot uploads to Supabase Storage
- FR-16: Review collection flow

### Nice to Have (Phase 3+)

- FR-17: Meta Business API integration
- FR-18: Automated follow-up scheduling (with human approval)
- FR-19: Inventory sync with suppliers

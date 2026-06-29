# StarGym Athens — Πλήρης Τεκμηρίωση Έργου

> Live: https://stargymathens.gr · Preview: Lovable preview · Repo: αυτό το GitHub repository
> Τελευταία ενημέρωση: 2026-06-29

Το έγγραφο αυτό περιγράφει **ολόκληρο το σύστημα**: αρχιτεκτονική, δομή κώδικα, βάση δεδομένων (πίνακες, RLS, functions), edge functions, integrations, ροές χρηστών και διαδικασία deployment. Σκοπός: ο οποιοσδήποτε developer να μπορέσει να καταλάβει & να συνεχίσει το project μόνο από το GitHub.

---

## 1. Επισκόπηση

**StarGym Athens** είναι μια bilingual (Ελληνικά/Αγγλικά) πλατφόρμα γυμναστηρίου με:

- Δημόσιο site (CMS-driven Page Builder)
- Σύστημα κρατήσεων μαθημάτων με waitlist
- Customer Portal (κρατήσεις, AI Fitness Coach, αποθηκευμένα προγράμματα)
- Trainer Portal (διαχείριση μαθημάτων, μηνύματα)
- Admin Dashboard (μέλη, CRM, invoices, newsletter, cron jobs, page builder)
- E-Shop (Shopify Storefront API)
- PWA με install prompt
- Αυτοματισμοί (class reminders, CRM workflows)
- Πλήρες σύστημα invoicing με PDF
- Email με self-hosted SMTP

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 + TypeScript 5 |
| UI | Tailwind CSS v3, shadcn/ui, Radix UI |
| State | React Query, Zustand (cart) |
| Routing | React Router v6 |
| Backend | Supabase (self-hosted σε Ubuntu) |
| Auth | Supabase Auth (email + Google OAuth) |
| DB | PostgreSQL με RLS |
| Edge Functions | Deno (Supabase Functions) |
| Email | Self-hosted SMTP (αυστηρά) |
| AI | Lovable AI Gateway (Gemini μοντέλα) |
| E-Shop | Shopify Storefront API |
| PDF | jsPDF |
| Deployment | Ubuntu + Docker (custom bash script) |

---

## 2. Δομή Project

```
.
├── public/                       # Static assets, robots.txt, sitemap.xml, favicon
├── scripts/
│   └── install-ubuntu.sh         # Self-hosted Supabase deployment script
├── src/
│   ├── App.tsx                   # Routing (όλα τα routes εδώ)
│   ├── main.tsx                  # Entry point + PWA bootstrap
│   ├── pwa.ts                    # Service worker registration
│   ├── index.css                 # Design tokens (Black & Gold theme)
│   │
│   ├── pages/                    # Top-level routes
│   │   ├── Home.tsx              # Landing
│   │   ├── Auth.tsx              # Login/Signup (με email verification)
│   │   ├── DynamicPage.tsx       # CMS-driven pages (/page/:slug)
│   │   ├── Shop.tsx              # E-shop grid (Shopify)
│   │   ├── ProductDetail.tsx     # Product page
│   │   ├── CustomerPortal.tsx    # Member dashboard
│   │   ├── TrainerPortal.tsx     # Trainer dashboard
│   │   ├── Admin.tsx             # Admin home
│   │   ├── admin/                # Admin sub-pages (CRM, Invoices, Settings, ...)
│   │   ├── customer/             # FitnessAssistant, SavedPrograms, Profile
│   │   └── trainer/              # Trainer classes/bookings/profile
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives — DON'T edit, re-style via tokens
│   │   ├── Navigation.tsx        # Public top nav (dynamic από DB)
│   │   ├── Footer.tsx
│   │   ├── *BottomNav.tsx        # Mobile bottom nav per role
│   │   ├── app-sidebar-*.tsx     # Desktop sidebars per role
│   │   ├── DynamicSection.tsx    # Renders CMS section types
│   │   ├── InstallPromptBanner.tsx
│   │   ├── ChatbotWidget.tsx
│   │   ├── admin/                # Admin widgets
│   │   ├── page-builder/         # CMS editor components
│   │   ├── email-editor/         # Newsletter visual editor
│   │   ├── template-builder/     # Reusable email template builder
│   │   ├── shop/CartDrawer.tsx
│   │   └── trainer/              # Trainer-specific UI
│   │
│   ├── hooks/
│   │   ├── usePageSections.ts    # CMS data + 2s live polling
│   │   ├── useRecaptcha.ts       # Google reCAPTCHA v3
│   │   ├── useCartSync.ts        # Shopify cart sync
│   │   └── use-toast.ts
│   │
│   ├── contexts/
│   │   └── LanguageContext.tsx   # i18n (EL/EN) + translations
│   │
│   ├── integrations/
│   │   ├── supabase/
│   │   │   ├── client.ts         # AUTO-GENERATED — never edit
│   │   │   └── types.ts          # AUTO-GENERATED — never edit
│   │   └── shopify/
│   │       └── storefront.ts     # Shopify Storefront API client
│   │
│   ├── stores/
│   │   └── cartStore.ts          # Zustand cart (persist + Shopify sync)
│   │
│   └── utils/
│       ├── invoicePDFGenerator.ts
│       └── programPDFGenerator.ts
│
├── supabase/
│   ├── config.toml               # Edge function JWT settings
│   ├── functions/                # 23 Deno edge functions (βλέπε §6)
│   └── migrations/               # Όλο το schema history
│
├── index.html                    # SEO meta + tracking pixels
├── tailwind.config.ts            # Design tokens binding
├── vite.config.ts
└── package.json
```

### Κανόνες αρχιτεκτονικής

- **Design tokens μόνο**: ποτέ hardcoded χρώματα στα components. Όλα τα χρώματα/gradients/shadows ορίζονται στο `src/index.css` και mapping στο `tailwind.config.ts`.
- **Auto-generated αρχεία**: `src/integrations/supabase/client.ts`, `types.ts`, `.env` (`VITE_SUPABASE_*`). Δεν τα αγγίζουμε ποτέ.
- **Roles**: Ποτέ role checks στο client-side storage. Όλοι οι έλεγχοι μέσω `user_roles` πίνακα + `has_role()` SQL function.
- **Bilingual content**: Κάθε content field έχει `_en` & `_el` παραλλαγές.

---

## 3. Authentication & Roles

### Roles (`app_role` enum)

- `admin` — πλήρης πρόσβαση
- `trainer` — διαχείριση δικών του classes + bookings
- `member` — κρατήσεις, profile, AI coach

Ένας user μπορεί να έχει **πολλαπλούς ρόλους ταυτόχρονα** (π.χ. admin + trainer). Όλοι αποθηκεύονται στο `user_roles` table — **ποτέ** στο `profiles`.

### Έλεγχος ρόλου (security definer)

```sql
public.has_role(_user_id uuid, _role app_role) RETURNS boolean
-- SECURITY DEFINER, search_path=public
```

Χρησιμοποιείται μέσα σε **όλες** τις RLS policies για αποφυγή recursion στο `user_roles`.

### Auth flow

1. **Signup**: ενεργοποιείται/απενεργοποιείται μέσω `app_settings.signup_enabled`. Όταν είναι disabled, ΟΛΑ τα signup UI κρύβονται (Auth page, Navigation). Default = disabled (fail-safe).
2. **Email verification**: υποχρεωτική. Στέλνεται κωδικός 6-ψηφίων μέσω `send-email` edge function στον πίνακα `email_verification_codes`.
3. **Login**: email/password ή Google OAuth.
4. **Password reset**: 2 μονοπάτια
   - Admin link (10-min token, πίνακας `password_reset_tokens`)
   - Self-service (κωδικός μέσω email, πίνακας `password_change_codes`)
5. **`handle_new_user()` trigger** στο `auth.users`: δημιουργεί `profiles` εγγραφή + αναθέτει `member` role.

### Admin enforced via Edge Functions

Όλα τα `admin-*` edge functions κάνουν:
1. Verify JWT μέσω anon client.
2. `select role from user_roles where user_id=... and role='admin'` μέσω service role.
3. Αν αποτύχει → 403.

---

## 4. Βάση Δεδομένων — Πίνακες

Συνολικά **37 πίνακες** στο `public` schema. Όλοι έχουν RLS enabled.

### 4.1 Users & Auth

| Πίνακας | Σκοπός | Βασικές στήλες |
|---|---|---|
| `profiles` | Public user data | id (FK auth.users), email, full_name, phone, avatar_url, birth_date |
| `user_roles` | Many-to-many ρόλοι | user_id, role (app_role enum) |
| `email_verification_codes` | Signup verification | user_id, email, code, expires_at |
| `password_reset_tokens` | Admin reset links | user_id, token, expires_at |
| `password_change_codes` | Self-service password change | user_id, code, expires_at |
| `admin_activity_log` | Audit trail | admin_id, action_type, target_user_id, details (jsonb) |

### 4.2 Classes & Bookings

| Πίνακας | Σκοπός |
|---|---|
| `classes` | Καταχωρημένα μαθήματα (name, description, trainer_id, max_capacity, ...) |
| `class_schedules` | Επαναλαμβανόμενα slots (day_of_week, time) |
| `bookings` | Κρατήσεις (user_id, class_id, booking_date, status) — unique index για duplicate prevention |
| `waitlist` | Λίστα αναμονής με auto-position trigger |
| `class_status_changes` | Ιστορικό αλλαγών status (cancelled, postponed) για ειδοποιήσεις |
| `trainers` | Public trainer profiles (όχι ίδιο με user_roles) |

**Booking κανόνες**:
- Auto-confirmed κατά την κράτηση.
- Cancellation: μόνο 24+ ώρες πριν (UI-enforced).
- Duplicate prevention μέσω unique index `(user_id, class_id, booking_date)`.

### 4.3 Memberships & Payments

| Πίνακας | Σκοπός |
|---|---|
| `membership_tiers` | Available packages (name, price, duration, features) |
| `user_subscriptions` | User's active tier (user_id, tier_id, start/end_date, status) |
| `service_packages` | Add-on υπηρεσίες (PT, nutrition, ...) |
| `invoices` | Τιμολόγια (invoice_number, user_id, total, tax, status, pdf_url) |
| `invoice_items` | Line items |
| `invoice_settings` | Branding, prefix, next number, tax rate (admin-only) |

### 4.4 CMS & Pages

| Πίνακας | Σκοπός |
|---|---|
| `page_sections` | Δομικές μονάδες όλων των δυναμικών σελίδων (page_key, section_key, type, title_en/el, content_en/el, image_url, settings jsonb, sort_order) |
| `site_settings` | Global key/value (footer links, social icons, phone numbers) |
| `app_settings` | System config (SMTP, reCAPTCHA, signup toggle) — admin-only |
| `content_blocks` | Reusable blocks |

Το `usePageSections(pageKey)` hook κάνει **2-second polling** για live preview στο Page Builder.

### 4.5 CRM & Marketing

| Πίνακας | Σκοπός |
|---|---|
| `customer_segments` | Filter rules για επιλογή μελών |
| `customer_tags` + `customer_tag_assignments` | Tagging system |
| `crm_interactions` | Επικοινωνίες με customer |
| `crm_notes` | Σημειώσεις στο customer profile |
| `crm_workflows` + `crm_workflow_executions` | Automated drip campaigns |
| `newsletter_campaigns` | Email campaigns με draft state |
| `newsletter_subscribers` | Opt-in list |
| `email_templates` | Custom bilingual templates |
| `email_events` | Tracking opens/clicks |
| `automations` | Cron-driven tasks (schedule cron expression, automation_type) |

### 4.6 AI & Coach

| Πίνακας | Σκοπός |
|---|---|
| `saved_programs` | Custom workout plans (user_id, content, equipment) |
| `ai_coach_usage` | Rate limiting per user |
| `ai_coach_alerts_sent` | Budget alert dedup (year_month, threshold 80/95%) |

---

## 5. Row-Level Security (RLS)

Όλοι οι πίνακες έχουν RLS **enabled**. Patterns:

### User-owned data
```sql
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```
Παραδείγματα: `bookings` (own), `saved_programs`, `profiles`.

### Admin-only data
```sql
USING (has_role(auth.uid(), 'admin'::app_role))
```
Παραδείγματα: `app_settings`, `password_reset_tokens`, `invoice_settings`, `automations`, `admin_activity_log`.

### Trainer-scoped data
```sql
USING (
  has_role(auth.uid(), 'trainer'::app_role)
  AND class_id IN (SELECT id FROM classes WHERE trainer_id = auth.uid())
)
```
Παραδείγματα: `bookings` (για δικά του classes), `class_schedules`, `class_status_changes`.

### Public read
```sql
USING (true)  -- ή authenticated
```
Παραδείγματα: `class_schedules`, `trainers`, `membership_tiers`, `page_sections` (visible only).

### GRANT pattern (απαραίτητο πέρα από RLS)
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;
GRANT ALL ON public.<table> TO service_role;
-- GRANT SELECT TO anon μόνο για public-read tables
```

---

## 6. Database Functions

| Function | Type | Σκοπός |
|---|---|---|
| `has_role(uuid, app_role)` | STABLE, SECURITY DEFINER | Role check χωρίς recursion |
| `handle_new_user()` | TRIGGER, SECURITY DEFINER | Δημιουργεί profile + member role στο signup |
| `assign_waitlist_position()` | TRIGGER | Auto-assign position στο waitlist |
| `update_updated_at_column()` | TRIGGER | Auto-update `updated_at` timestamps |
| `generate_invoice_number()` | SECURITY DEFINER, admin-gated | Atomic invoice numbering με prefix |
| `refresh_campaign_analytics()` | SECURITY DEFINER | Refresh materialized view |
| `get_cron_jobs()` | SECURITY DEFINER, admin-gated | Surface `cron.job` table στο admin UI |
| `update_cron_schedule(bigint, text)` | SECURITY DEFINER, admin-gated | Edit cron schedule from UI |

> Όλες οι SECURITY DEFINER functions έχουν `REVOKE EXECUTE FROM PUBLIC, anon` (security fix 2026-06-29).

---

## 7. Edge Functions (`supabase/functions/`)

Όλες σε Deno. JWT verification ορίζεται στο `supabase/config.toml`.

### Auth & Users (admin-only)
- `admin-create-user` — bypass disabled signup
- `admin-delete-user` — auth + profile cleanup (prevents self-delete)
- `admin-update-user`
- `admin-get-users` — listUsers API
- `admin-toggle-user-status` — ban/unban
- `admin-reset-password` — generate 10-min token link
- `reset-password-with-token` — PUBLIC (no JWT)
- `send-password-change-code` — self-service code

### Email (SMTP-only, αυστηρά)
- `send-email` — generic
- `send-mass-email` — newsletter / bulk
- `send-invoice-email` — με PDF attachment
- `send-contact-form` — PUBLIC, με reCAPTCHA
- `send-class-reminders` — cron-triggered daily

### Notifications
- `notify-booking-status`
- `notify-waitlist` — όταν ελευθερωθεί θέση
- `notify-class-deletion` — bulk delete warning
- `notify-class-status-change` — cancel/postpone

### AI (Lovable AI Gateway)
- `fitness-assistant` — PUBLIC, AI coach για custom workouts
- `ai-coach-budget-check` — PUBLIC, rate limiting + budget alerts στο 80%/95%
- `gym-chatbot` — PUBLIC, RAG με live DB (schedules, trainers, prices)
- `translate-content` — Gemini auto-translation EL ↔ EN

### Other
- `verify-recaptcha` — PUBLIC, Google reCAPTCHA v3 (score ≥ 0.5)
- `crm-workflow-executor` — runs scheduled CRM drips

### Security pattern (κάθε admin function)
```ts
// 1. Auth header check
const authHeader = req.headers.get('Authorization');
// 2. Client με user JWT
const supabaseClient = createClient(URL, ANON_KEY, { global: { headers: {...} } });
const { data: { user } } = await supabaseClient.auth.getUser();
// 3. Role check μέσω service role
const supabaseAdmin = createClient(URL, SERVICE_ROLE_KEY, ...);
const { data } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', user.id).eq('role','admin').maybeSingle();
if (!data) throw new Error('Unauthorized');
// 4. Zod validation στο body
// 5. Εκτέλεση action
```

---

## 8. Frontend Routing (`src/App.tsx`)

| Route | Page | Access |
|---|---|---|
| `/` | Home | Public |
| `/auth` | Login/Signup | Public |
| `/page/:slug` | DynamicPage (CMS) | Public |
| `/shop` | Shop | Public |
| `/product/:handle` | ProductDetail | Public |
| `/memberships`, `/pricing`, `/contact`, `/privacy-policy` | Static-ish | Public |
| `/install` | PWA install guide | Public |
| `/verify-email`, `/reset-password` | Auth flows | Public |
| `/portal` | CustomerPortal | Member |
| `/my-bookings` | MyBookings | Member |
| `/portal/fitness-assistant` | AI Coach | Member |
| `/portal/saved-programs` | SavedPrograms | Member |
| `/trainer` | TrainerPortal | Trainer |
| `/trainer/classes`, `/trainer/bookings` | | Trainer |
| `/admin` | Admin home | Admin |
| `/admin/members`, `/crm`, `/invoices`, `/packages`, `/email-templates`, `/newsletter`, `/page-builder`, `/cron-jobs`, `/settings`, ... | | Admin |

Protection μέσω `<ProtectedRoute>` wrapper που ελέγχει role.

---

## 9. CMS (Page Builder)

**Concept**: όλες οι public pages render-άρονται από `page_sections` rows.

### Flow
1. Admin → `/admin/page-builder` → επιλογή page → drag/drop sections.
2. Κάθε section έχει `section_type` (hero, gallery, cta, text, video, matterport, ...).
3. `DynamicSection.tsx` switch-άρει στο type και render-άρει.
4. `DynamicPage.tsx` φορτώνει όλα τα sections για το slug μέσω `usePageSections`.
5. **Live preview**: 2-second polling + key-based cache busting.

### Multilingual
- Κάθε string έχει `_en` & `_el` columns.
- `translate-content` edge function (Gemini) προτείνει αυτόματη μετάφραση.
- `LanguageContext` διαλέγει βάσει user preference.

### Navigation
- Δυναμικό από DB (`site_settings` + visible pages).
- Header & footer τα διαβάζουν runtime.

### Supported section types
hero (με video bg), text, image, gallery (3D carousel + lightbox), cta, matterport (3D tour iframe), video, contact-form, pricing, trainers, classes-schedule, custom HTML.

---

## 10. E-Shop (Shopify)

### Setup
- Shopify development store: `stargym-fspk5`
- Storefront API token στο `src/integrations/shopify/storefront.ts`
- Endpoint: `https://stargym-fspk5.myshopify.com/api/2024-10/graphql.json`

### Cart
- `src/stores/cartStore.ts` — Zustand με localStorage persist
- `useCartSync` — re-sync όταν tab γίνει visible
- Mutations: `cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`
- Checkout: redirect στο Shopify-hosted checkout URL

### Pages
- `/shop` — product grid (`PRODUCTS_QUERY`)
- `/product/:handle` — single product (`PRODUCT_BY_HANDLE_QUERY`)
- `CartDrawer` — Sheet από top nav

---

## 11. AI Features

### AI Coach (Fitness Assistant)
- Endpoint: `fitness-assistant` edge function
- Model: Lovable AI Gateway (Gemini)
- Constraint: μόνο εξοπλισμός που υπάρχει στο γυμναστήριο (system prompt)
- Output: structured workout plan → save στο `saved_programs` → PDF export
- **Rate limiting**: per-user daily/monthly caps μέσω `ai_coach_usage`
- **Budget guard**: `ai-coach-budget-check` στέλνει admin SMTP alerts στο 80% & 95% του Lovable AI budget

### Chatbot (`ChatbotWidget.tsx`)
- Floating widget παντού
- `gym-chatbot` edge function διαβάζει live από `classes`, `class_schedules`, `trainers`, `membership_tiers`
- Mobile: full-screen 100dvh
- Auto-wrap long messages

---

## 12. PWA

- `vite-plugin-pwa` config
- Service worker: `src/pwa.ts`
- Install prompt:
  - `beforeinstallprompt` event captured globally
  - `InstallPromptBanner.tsx` εμφανίζεται **μόνο** στο `/page/ai-coach`
  - Auto-trigger native prompt μία φορά per session (sessionStorage flag)
  - Manual fallback instructions per platform (iOS Safari / Android Chrome / Desktop)

---

## 13. Email System

**Αυστηρά SMTP** — όχι Resend ή άλλα cloud services.

### Config
`app_settings` rows:
- `smtp_host`, `smtp_port`, `smtp_user`, `smtp_password`, `smtp_from`, `smtp_secure`

### Templates
- `email_templates` table — bilingual, admin-editable, με variable interpolation
- Visual editor: `src/components/email-editor/`
- Reusable building blocks: `src/components/template-builder/`

### Newsletter
- `/admin/newsletter` — visual composer, draft state, test send, scheduling
- Cron-triggered execution μέσω `automations` table

### Invoices
- `src/utils/invoicePDFGenerator.ts` — jsPDF, dynamic branding από `invoice_settings`
- Auto-attached στο `send-invoice-email`

---

## 14. Automations & Cron

Πίνακας `automations` (admin-managed):

| automation_type | Schedule | Action |
|---|---|---|
| `class_reminders` | `0 10 * * *` | Email reminders για αυριανά classes |
| `newsletter_send` | per campaign | Send queued newsletter |
| `crm_workflow` | per workflow | Execute drip step |

UI: `/admin/cron-jobs` — διαβάζει `cron.job` table μέσω `get_cron_jobs()` SECURITY DEFINER function. Edit μέσω `update_cron_schedule()`.

---

## 15. Security Posture

### Implemented
- ✅ RLS σε όλους τους πίνακες
- ✅ `has_role()` security definer αντί για inline checks
- ✅ Roles σε ξεχωριστό πίνακα (όχι στο profiles)
- ✅ Admin edge functions: JWT + role + Zod validation
- ✅ reCAPTCHA v3 στα public forms (score ≥ 0.5)
- ✅ Time-limited password reset tokens (10 min)
- ✅ Email verification υποχρεωτική
- ✅ `REVOKE EXECUTE` από `anon` σε όλες τις SECURITY DEFINER functions
- ✅ `app_settings` & `password_reset_tokens`: admin-only access
- ✅ AI rate limiting + budget guard
- ✅ `signup_enabled` default = false (fail-safe)
- ✅ jsPDF 4.2.1+ (αντιμετώπιση Path Traversal & HTML Injection CVEs)

### Forbidden patterns
- ❌ Role checks στο localStorage/sessionStorage
- ❌ Hardcoded admin credentials
- ❌ FK σε `auth.users` από public tables (χρήση `profiles` αντί)
- ❌ Resend ή άλλο email service — μόνο SMTP
- ❌ Edit `src/integrations/supabase/{client,types}.ts`
- ❌ ALTER DATABASE statements σε migrations

---

## 16. Deployment

### Self-hosted Ubuntu
- `scripts/install-ubuntu.sh` — installer για Docker + self-hosted Supabase stack
- Δεν χρησιμοποιούμε Supabase Cloud features (π.χ. managed dashboards)
- Storage bucket limit: 60 MB (cms-images)

### Lovable preview
- Auto-deploys σε κάθε change
- Published URL: https://stargym.lovable.app
- Custom domains: https://stargymathens.gr, https://www.stargymathens.gr

### Migrations
- Folder: `supabase/migrations/`
- Filename pattern: `YYYYMMDDHHMMSS_<uuid>.sql`
- Κάθε migration: idempotent όπου δυνατόν

---

## 17. Environment Variables

### Frontend (auto-managed, μην τα αλλάξεις)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Edge functions (Supabase secrets)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`
- `LOVABLE_API_KEY` — Lovable AI Gateway

### Runtime config (στο DB, όχι env)
- SMTP credentials → `app_settings`
- reCAPTCHA keys → `app_settings`
- Shopify token → στον κώδικα (`src/integrations/shopify/storefront.ts`) ως publishable

---

## 18. Συνεργασία με Git / Lovable

- Bidirectional sync: αλλαγές στο Lovable → push στο GitHub αυτόματα, push στο GitHub → sync στο Lovable.
- Lovable rollback διαθέσιμο μέσω version history.
- Database export: μόνο CSV per table (Cloud → Database → Tables).

### Local development
```bash
# Clone
git clone <repo>
cd <repo>

# Install
npm install   # ή bun install

# Run
npm run dev   # http://localhost:8080
```

Backend δεν τρέχει local — όλα τα Supabase calls πάνε στο remote project (self-hosted instance).

---

## 19. Quick-Reference Commands

```bash
# Run dev server
npm run dev

# Build production
npm run build

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

### Συνηθισμένα tasks

| Task | Where |
|---|---|
| Νέο page (CMS) | Admin → Page Builder → New Page |
| Νέο role | Admin → CRM → user → toggle role checkboxes |
| Επεξεργασία cron | Admin → Cron Jobs |
| Email template | Admin → Email Templates |
| Νέο product | Shopify admin (όχι από Lovable) |
| Σχήμα DB | Νέο migration στο `supabase/migrations/` |

---

## 20. Επαφή & Επόμενα Βήματα

- Αν προστεθεί νέο feature, ενημέρωσε αυτό το αρχείο στα §3, §4 (αν αλλάξει schema), §7 (αν νέο edge function), §8 (αν νέο route).
- Πριν από κάθε major release: τρέξε security scan και fix-αρε ότι προκύψει.
- Διατήρησε bilingual content (EN + EL) σε όλες τις νέες CMS sections.

---

**End of documentation.**

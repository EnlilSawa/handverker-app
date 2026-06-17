# EFERO — Codebase Audit

**Date:** 18 June 2026
**Scope:** Multi-tenant isolation & RLS, Supabase edge functions, auth flows, app store logic, type safety.
**Stack:** Expo / React Native (web + native), Supabase (Postgres + RLS + Edge Functions), Resend, Stripe.

TypeScript `tsc --noEmit` passes with **0 errors**. The issues below are mostly in the data/security layer, not the UI code.

---

## Priority summary

| # | Severity | Issue | Area |
|---|----------|-------|------|
| 1 | 🔴 Critical | Signup trigger trusts client-supplied `role` / `company_id` → cross-tenant admin takeover | DB trigger |
| 2 | 🟠 High | `send-welcome-email` is an unauthenticated open relay from the `efero.no` domain | Edge function |
| 3 | 🟠 High | `send-invoice-email` / `send-quote-email` have no in-function authorization | Edge function |
| 4 | 🟠 High | Invoice numbering uses one global sequence, not per-company | DB / compliance |
| 5 | 🟡 Medium | `get_email_by_phone` granted to `anon` → phone→email enumeration | DB |
| 6 | 🟡 Medium | Public storage buckets leak `company_id` and customer job photos | Storage |
| 7 | 🟡 Medium | Conflicting/legacy RLS SQL files can re-introduce the v16 leak if re-run | Ops |
| 8 | 🔵 Low | `removeTechnician` orphans the `auth.users` row | App logic |
| 9 | 🔵 Low | `convertQuoteToJob` finds the new job by array position | App logic |

---

## 🔴 1. Signup metadata privilege escalation (cross-tenant takeover)

**Where:** `supabase/schema.sql` + `fix_trigger_v2.sql` — `handle_new_user()` trigger.

The trigger populates a new profile straight from client-controlled signup metadata:

```sql
COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'technician'),
(NEW.raw_user_meta_data->>'company_id')::UUID
```

The app's own `register()` only sends `{ name, phone }`, so the UI is safe. But `supabase.auth.signUp` is a **public endpoint** reachable with the anon key that ships in the client bundle. An attacker can call it directly with:

```js
supabase.auth.signUp({ email, password, options: {
  data: { role: 'admin', company_id: '<victim-company-uuid>' }
}})
```

The trigger then creates them as an **admin of another company**. Combined with the (correct) v16 RLS policies — `is_admin_user() AND company_id = current_user_company_id()` — they get full read/write to that company's jobs, invoices, customers, and profiles.

This is practically exploitable because **`company_id` UUIDs leak publicly** via logo URLs (`company-logos/<company_id>/logo_…`, see issue 6).

**Fix:** harden the trigger to ignore client-supplied role/company on self-signup — always insert `role = 'technician'`, `company_id = NULL`. Company assignment should only happen through `setup_company()` (admin path) and `create_technician_with_password()` (server-side), both of which already enforce authorization correctly.

---

## 🟠 2. `send-welcome-email` — unauthenticated open relay

**Where:** `supabase/functions/send-welcome-email/index.ts`

The function reads `{ to, name, companyName }` from the request body and sends an email from `Efero <kontakt@efero.no>` with no authentication and no caller check. `name` and `companyName` are interpolated raw into the HTML body.

Anyone with the public anon key can send arbitrary "Welcome to Efero" emails from the verified `efero.no` domain to any recipient. Risks: phishing/spam under your brand, HTML injection into the body, and damage to your Resend domain reputation (deliverability for *real* invoices).

**Fix:** require a valid JWT (`getUser`) and derive the recipient/company server-side from the caller's profile — the same pattern already used in `invite-technician`. Don't accept `to`/`companyName` from the client.

---

## 🟠 3. `send-invoice-email` & `send-quote-email` — no in-function authorization

**Where:** `supabase/functions/send-invoice-email/index.ts`, `send-quote-email/index.ts`

Both run with the **service-role key** (bypassing RLS) and act on a client-supplied `invoiceId` / `quoteId` with no check that the caller is an admin of that record's company. `send-invoice-email` additionally emails a **client-supplied `pdfBase64`** as the attachment.

Consequences for any holder of the anon key:
- Trigger invoice/quote emails to customers of *any* company (enumerating IDs).
- Attach an arbitrary PDF sent from the company's branded address — a clean phishing vector.

Note: platform `verify_jwt` does **not** save you here — the public anon key is itself a valid project JWT, so the gateway check passes without a real user.

**Fix:** in each function, read the `Authorization` JWT, `getUser()`, load the caller's profile, and confirm `profile.role = 'admin'` and `profile.company_id = invoice.company_id` before sending. Generating the PDF server-side (from the row) rather than trusting `pdfBase64` would close the spoofing path entirely.

---

## 🟠 4. Invoice numbering is global, not per-company

**Where:** `supabase/schema.sql` — `next_invoice_number()` + `invoice_number_seq`.

```sql
CREATE SEQUENCE invoice_number_seq START 1;
-- function ignores its company_id argument:
'INV-' || year || '-' || LPAD(nextval('invoice_number_seq')…)
```

The `company_id` parameter is ignored and a single sequence is shared across all tenants. Each company therefore sees a gappy, non-sequential series (1, 4, 7…). Norwegian bookkeeping rules (bokføringsforskriften) require an **unbroken, sequential** invoice number series per seller — so this is a real compliance problem for an invoicing product, plus it leaks total platform invoice volume.

**Fix:** make numbering per-company — e.g. a `companies.next_invoice_seq` counter incremented atomically inside `next_invoice_number(company_id)`, or a per-company sequence. Make `invoice_number` unique per `(company_id, invoice_number)` rather than globally.

---

## 🟡 5. `get_email_by_phone` exposed to `anon`

**Where:** `schema.sql` — `GRANT EXECUTE … TO anon`.

Used so users can log in with a phone number, but it's an unauthenticated oracle: given any phone number it returns the associated email. That's a PII disclosure / enumeration primitive.

**Fix:** rate-limit, or move the phone→email resolution behind the sign-in flow rather than an anon-callable RPC. At minimum, return null without distinguishing "no match" from errors and monitor call volume.

---

## 🟡 6. Public storage buckets leak IDs and customer photos

**Where:** `appStore.ts` — `uploadCompanyLogo` (`company-logos/<company_id>/…`) and `uploadJobImage` (`job-images/<job_id>/…`), both using `getPublicUrl`.

Logo URLs embed `company_id` in a public path — this is the leak that makes issue 1 practically targetable. `job-images` are job/customer site photos exposed at public URLs to anyone who has the link, with no access control.

**Fix:** use private buckets with signed URLs (and RLS-backed access), or at least randomize paths so IDs aren't embedded. Job photos in particular should not be world-readable.

---

## 🟡 7. Legacy SQL files can re-introduce the cross-tenant leak

**Where:** `supabase/fix_rls.sql` (and other loose `fix_*.sql` files).

`fix_rls.sql` is the file that *caused* the v16 isolation breach (admin policies without a company filter). It still sits in the repo with no "superseded" marker. Re-running it during a future fix would silently re-open full cross-tenant access.

**Fix:** delete or clearly archive superseded `fix_*.sql` files, and adopt an ordered, idempotent migration set (or Supabase CLI migrations) so the live policy state is reproducible. Consider verifying the deployed policies directly (`select * from pg_policies`) since the repo has several overlapping definitions and the live state can't be confirmed from files alone.

---

## 🔵 8. `removeTechnician` orphans the auth user

**Where:** `appStore.ts` → `removeTechnician` deletes the `profiles` row only. The `auth.users` row survives, so the credential still authenticates (the app then dead-ends because `loadData` finds no profile). Cleaner to delete via an admin RPC/edge function that removes the auth user too.

## 🔵 9. `convertQuoteToJob` relies on array position

**Where:** `appStore.ts` → after `addJob`, it grabs `jobs[jobs.length - 1]` as "the new job." This happens to work because `addJob` appends, but it's fragile against any reordering/concurrent load. Have `addJob` return the created job and use that id directly.

---

## What's solid

- **v16 RLS** correctly re-scopes admin access by company via the `current_user_company_id()` SECURITY DEFINER helper (avoids recursion). The isolation model itself is right.
- **Superadmin functions (v17)** all check `is_superadmin()` first, store the owner email server-side in `app_config` (RLS-locked), and only expose the client email flag as a cosmetic link toggle. Good design.
- **`stripe-webhook`** verifies the Stripe signature with `constructEventAsync` before acting.
- **`invite-technician`** and **`create-stripe-checkout`** correctly validate the JWT and the caller's company/role.
- **`.env`** is gitignored and contains only public `EXPO_PUBLIC_*` keys; no service-role key in the client.
- **TypeScript** compiles clean; failed invoice generation correctly rolls back job status.

---

## Suggested order of work

1. **Issue 1** (trigger hardening) — small, contained SQL change; closes the worst hole.
2. **Issues 2 & 3** (edge-function authz) — add JWT + role checks; reuse the `invite-technician` pattern.
3. **Issue 6** (private buckets) — removes the `company_id` leak that makes 1 targetable.
4. **Issue 4** (per-company invoice numbers) — before you have real paying customers and historical numbers to migrate.
5. **Issues 5, 7** then the low-severity cleanups.

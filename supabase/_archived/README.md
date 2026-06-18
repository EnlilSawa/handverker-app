# ⚠️ Arkiverte SQL-filer — IKKE KJØR DISSE

Disse filene er **utdaterte** og beholdt kun for historikk. Å kjøre dem mot
produksjonsdatabasen kan **gjeninnføre sikkerhetshull** eller overskrive nyere
fikser. Den autoritative tilstanden er `schema.sql` + de nummererte
`migration_v*.sql`-filene, kjørt i rekkefølge. Bekreft alltid live policy-tilstand
direkte med `SELECT * FROM pg_policies;` framfor å stole på løse filer.

| Fil | Hvorfor arkivert | Erstattet av |
|-----|------------------|--------------|
| `fix_rls.sql` | **FARLIG** — dette er filen som FORÅRSAKET v16 cross-tenant-lekkasjen (admin-policyer uten firma-filter, `FOR ALL USING (is_admin_user())`). Re-kjøring åpner full tilgang på tvers av firmaer igjen. | `migration_v16.sql` (firma-scopede policyer via `current_user_company_id()`) |
| `fix_trigger.sql`, `fix_trigger_v2.sql` | Eldre `handle_new_user()` som leste `role`/`company_id` fra klient-metadata (privilegieeskalering, audit #1). | `migration_v18.sql` (tvinger `technician`/`NULL`) |
| `fix_profiles.sql`, `fix_data.sql`, `fix_users.sql`, `cleanup.sql` | Engangs-datareparasjoner kjørt manuelt under tidlig utvikling. Ikke idempotente, ikke relevante for nåværende skjema. | — |
| `migration_v10.sql` | Aldri kjørt i prod — erstattet av enklere policyer kjørt direkte (se memory). | direkte-kjørte policyer / `migration_v16.sql` |

**Verifisert 2026-06-18:** live policyer på `profiles/jobs/invoices/companies` er korrekt
firma-scopet (alle bruker `current_user_company_id()`/`is_admin_user()`), dvs.
`fix_rls.sql`-policyene er IKKE aktive. Audit-funn #7 lukket.

# Håndverker-app

Mobilfirst SaaS for norske håndverkerbedrifter (rørleggere, elektrikere, snekkere).

## Kom i gang

```bash
cd handverker-app
npm install
npx expo start
```

Scan QR-koden med **Expo Go**-appen (iOS/Android).

## Demo-kontoer

| Rolle    | E-post                    | Passord      |
|----------|---------------------------|--------------|
| Admin    | kjetil@vvsservice.no      | hva som helst |
| Tekniker | magnus@vvsservice.no      | hva som helst |
| Tekniker | erik@vvsservice.no        | hva som helst |

## Funksjoner

### Admin (Kjetil)
- **Jobbtavle** — Kanban med Ny / Pågår / Ferdig, swipe mellom kolonner
- **Statistikkbokser** — Jobber i dag, ubetalte fakturaer, månedlig inntekt
- **Opprett jobb** — Skjema med kundeinformasjon, tekniker-picker, dato/tid
- **Team** — Legg til / fjern teknikere
- **Fakturaer** — Filtrer på status, se detaljer, marker som betalt
- **Statistikk** — Inntekt per tekniker, jobbstatus-oversikt
- **Innstillinger** — Bedriftsinfo, timepris, fremmøtegebyr, betalingsbetingelser

### Tekniker (Magnus)
- **Mine jobber** — Kun egne jobber for i dag
- **Start jobb** — Marker jobb som Pågår
- **Fullfør jobb** — Skriv inn timer + materiell → faktura genereres automatisk
- **Kart** — Naviger til kunde med Google Maps
- **Timelogg** — Se ukens timer og historikk

### Faktura
- Auto-generert når tekniker markerer ferdig
- Inkluderer arbeidstimer × timepris, materiell, fremmøtegebyr
- MVA 25% beregnes automatisk
- «Betal med Vipps»-knapp (kobles til Vipps eCom API)
- Admin kan sende faktura på SMS (Twilio/Sveve) og markere betalt

## Produksjon: Supabase-integrasjon

1. Opprett prosjekt på [supabase.com](https://supabase.com)
2. Kjør `supabase/schema.sql` i SQL Editor
3. Lag `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://DITT-PROSJEKT.supabase.co',
  'din-anon-nøkkel'
);
```

4. Erstatt mock-data i `src/store/appStore.ts` med Supabase-kall
5. Aktiver Supabase Auth for e-post+passord innlogging

## Teknisk stack

| Lag           | Teknologi                          |
|---------------|------------------------------------|
| Frontend      | React Native + Expo                |
| State         | Zustand                            |
| Navigasjon    | React Navigation v6                |
| Database      | PostgreSQL via Supabase            |
| Auth          | Supabase Auth                      |
| SMS           | Twilio / Sveve                     |
| Betaling      | Vipps eCom API                     |
| Push          | Expo Notifications                 |

## Prosjektstruktur

```
src/
├── theme/colors.ts          Fargepalett
├── types/index.ts           TypeScript-typer
├── utils/formatters.ts      Dato/valuta-formatering (norsk)
├── store/appStore.ts        Zustand-store med all state
├── navigation/
│   ├── RootNavigator.tsx    Auth-gate
│   ├── AdminNavigator.tsx   5 faner for admin
│   └── TechnicianNavigator.tsx  4 faner for tekniker
├── screens/
│   ├── auth/LoginScreen.tsx
│   ├── admin/               JobBoard, NewJob, Team, Invoices, Statistics, Settings
│   ├── technician/          TechJobs, TechMap, TechTimes, TechProfile
│   └── shared/InvoiceDetailScreen.tsx
└── components/
    ├── JobCard.tsx           Kanban-jobbkort (admin)
    ├── TechJobCard.tsx       Jobbkort med handlinger (tekniker)
    ├── StatBox.tsx           Statistikkboks
    └── InvoiceCard.tsx       Fakturakort i liste
supabase/schema.sql           PostgreSQL-skjema med RLS-policyer
```

## Fargepalett

- Primær (blå): `#378ADD`
- Suksess/ferdig (grønn): `#639922`
- Pågår/advarsel (oransje): `#BA7517`
- Fare: `#E53935`

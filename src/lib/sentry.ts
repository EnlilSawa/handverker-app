import * as Sentry from '@sentry/react-native';

// Feilsporing via Sentry. Rapporterer KUN fra produksjonsbygg — lokal utvikling
// (__DEV__) skal ikke forurense dashboardet. DSN-en er ikke hemmelig (den kan
// bare sende events inn), men holdes i .env så den kan byttes uten kodeendring.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const enabled = !__DEV__ && !!dsn;

export function initSentry() {
  if (!enabled) return;
  Sentry.init({
    dsn,
    environment: 'production',
    // Kun feilrapportering — ingen performance-tracing eller session replay.
    tracesSampleRate: 0,
    // Personvern: aldri IP/brukerdata automatisk. Vi tagger kun company_id.
    sendDefaultPii: false,
  });
}

// Tagges etter innlogging så vi ser hvor mange firma en feil rammer.
// ALDRI navn/e-post — kun firma-id (personvern). null ved utlogging.
export function setSentryCompany(companyId: string | null) {
  if (!enabled) return;
  Sentry.setTag('company_id', companyId ?? undefined);
}

// Manuell rapportering av håndterte feil (toast-feil, fangede exceptions).
export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (!enabled) return;
  const err = error instanceof Error ? error : new Error(String(error));
  Sentry.captureException(err, context ? { extra: context } : undefined);
}

// Rapporter og returner feilen — for `throw reported(new Error(...))`-mønsteret
// i appStore, der skjermene fanger og viser feilen selv.
export function reported<T>(error: T, context?: Record<string, unknown>): T {
  reportError(error, context);
  return error;
}

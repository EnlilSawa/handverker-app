// Sentry sin wrapper rundt expo/metro-config — annoterer bundlene med debug-ID-er
// så feil-stacktraces kan kobles til riktig bygg i Sentry-dashboardet.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// @supabase/supabase-js bruker @opentelemetry/api som valgfri dep — stub den ut
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@opentelemetry/api') {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

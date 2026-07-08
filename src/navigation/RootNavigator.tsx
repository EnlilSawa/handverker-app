import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ConfirmEmailScreen } from '../screens/auth/ConfirmEmailScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { UpdatePasswordScreen } from '../screens/auth/UpdatePasswordScreen';
import { OnboardingWizard } from '../screens/onboarding/OnboardingWizard';
import { PaywallScreen } from '../screens/paywall/PaywallScreen';
import { AdminNavigator } from './AdminNavigator';
import { TechnicianNavigator } from './TechnicianNavigator';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

type AuthView = 'login' | 'register' | 'confirm_email' | 'forgot_password';

export function RootNavigator() {
  const currentUser = useAppStore((s) => s.currentUser);
  const company     = useAppStore((s) => s.company);
  const companyId   = useAppStore((s) => s.companyId);
  const initialized = useAppStore((s) => s.initialized);
  const initSession = useAppStore((s) => s.initSession);
  const loadData    = useAppStore((s) => s.loadData);

  const [authView, setAuthView] = useState<AuthView>('login');
  const [pendingEmail, setPendingEmail] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const logout = useAppStore((s) => s.logout);

  useEffect(() => {
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Bruker klikket «tilbakestill passord»-lenken i e-posten → vis ny-passord-skjerm
        setRecoveryMode(true);
      } else if (event === 'SIGNED_IN') {
        // Etter e-postbekreftelse: last data og gå til app
        loadData();
        setAuthView('login');
      } else if (event === 'TOKEN_REFRESHED') {
        loadData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Tilbakestilling av passord — vises uavhengig av innloggingsstatus
  if (initialized && recoveryMode) {
    return (
      <UpdatePasswordScreen
        onDone={async () => {
          await logout();
          setRecoveryMode(false);
          setAuthView('login');
        }}
      />
    );
  }

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Ikke innlogget ──────────────────────────────────────────────────────────

  if (!currentUser) {
    if (authView === 'confirm_email') {
      return (
        <ConfirmEmailScreen
          email={pendingEmail}
          onGoToLogin={() => setAuthView('login')}
        />
      );
    }

    if (authView === 'forgot_password') {
      return <ForgotPasswordScreen onGoToLogin={() => setAuthView('login')} />;
    }

    // Selv-registrering er fjernet — Efero oppretter kundekontoer selv i superadmin
    // («Opprett kunde»). Kunden logger inn med innloggingen de får av Efero.
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login">
          {() => <LoginScreen onGoToForgot={() => setAuthView('forgot_password')} />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  // ── Onboarding-veiviser ────────────────────────────────────────────────────
  // Vises i to tilfeller:
  //   (a) fersk påmelding uten firma ennå (ny bruker får role='technician' fra
  //       triggeren som standard — vi sjekker companyId i tillegg til company for
  //       å unngå at teknikere med firma havner her ved midlertidig lastingsfeil), og
  //   (b) admin som har opprettet firma, men ikke fullført veiviseren
  //       (onboarding_completed = false) — f.eks. lukket appen før suksess-steget.
  // Teknikere får ALDRI veiviseren, selv om admins firma er midt i onboarding.
  const isFreshSignup = !company && !companyId;
  const isAdminMidOnboarding =
    !!company && company.onboardingCompleted === false && currentUser.role === 'admin';
  if (isFreshSignup || isAdminMidOnboarding) {
    return <OnboardingWizard />;
  }

  // ── Kontoen deaktivert av Efero (f.eks. manglende betaling) → tilgang stengt ─
  // Fakturamodell: alle kunder er 'active' som standard og får full tilgang.
  // Efero-eieren setter et firma til 'canceled'/'expired' i superadmin-dashbordet
  // for å stenge tilgangen; da (og bare da) vises "kontoen er satt på pause"-skjermen.
  if (
    company &&
    (company.subscriptionStatus === 'canceled' || company.subscriptionStatus === 'expired')
  ) {
    return <PaywallScreen />;
  }

  // ── Innlogget med aktiv tilgang ────────────────────────────────────────────
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {currentUser.role === 'admin' ? (
        <Stack.Screen name="Admin" component={AdminNavigator} />
      ) : (
        <Stack.Screen name="Technician" component={TechnicianNavigator} />
      )}
    </Stack.Navigator>
  );
}

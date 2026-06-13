import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
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

function isTrialExpired(trialEndsAt?: string): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) < new Date();
}

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

    if (authView === 'register') {
      return (
        <RegisterScreen
          onGoToLogin={() => setAuthView('login')}
          onEmailSent={(email) => {
            setPendingEmail(email);
            setAuthView('confirm_email');
          }}
        />
      );
    }

    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login">
          {() => (
            <LoginScreen
              onGoToRegister={() => setAuthView('register')}
              onGoToForgot={() => setAuthView('forgot_password')}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  // ── Ny bruker uten firma → onboarding-wizard ──────────────────────────────
  // Nye brukere får role='technician' fra triggeren som standard — vi sjekker
  // companyId (fra profilen) i tillegg til company (lastet objekt) for å unngå
  // at teknikere med firma havner her ved midlertidig lastingsfeil.
  if (!company && !companyId) {
    return <OnboardingWizard />;
  }

  // ── Prøveperiode utløpt og ikke aktivt abonnement → betalingsvegg ──────────
  if (
    company &&
    company.subscriptionStatus !== 'active' &&
    isTrialExpired(company.trialEndsAt)
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

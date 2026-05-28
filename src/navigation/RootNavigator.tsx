import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { OnboardingWizard } from '../screens/onboarding/OnboardingWizard';
import { PaywallScreen } from '../screens/paywall/PaywallScreen';
import { AdminNavigator } from './AdminNavigator';
import { TechnicianNavigator } from './TechnicianNavigator';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

function isTrialExpired(trialEndsAt?: string): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) < new Date();
}

export function RootNavigator() {
  const currentUser  = useAppStore((s) => s.currentUser);
  const company      = useAppStore((s) => s.company);
  const initialized  = useAppStore((s) => s.initialized);
  const initSession  = useAppStore((s) => s.initSession);
  const loadData     = useAppStore((s) => s.loadData);

  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') loadData();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Ikke innlogget
  if (!currentUser) {
    if (showRegister) {
      return <RegisterScreen onGoToLogin={() => setShowRegister(false)} />;
    }
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login">
          {() => <LoginScreen onGoToRegister={() => setShowRegister(true)} />}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  // Admin uten firma → onboarding-wizard
  if (currentUser.role === 'admin' && !company) {
    return <OnboardingWizard />;
  }

  // Prøveperiode utløpt og ikke aktivt abonnement → betalingsvegg
  if (
    company &&
    company.subscriptionStatus !== 'active' &&
    isTrialExpired(company.trialEndsAt)
  ) {
    return <PaywallScreen />;
  }

  // Innlogget med aktiv tilgang
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

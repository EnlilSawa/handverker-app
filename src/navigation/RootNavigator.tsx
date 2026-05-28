import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { AdminNavigator } from './AdminNavigator';
import { TechnicianNavigator } from './TechnicianNavigator';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const currentUser = useAppStore((s) => s.currentUser);
  const initialized = useAppStore((s) => s.initialized);
  const initSession = useAppStore((s) => s.initSession);
  const loadData = useAppStore((s) => s.loadData);

  useEffect(() => {
    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') {
        loadData();
      }
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

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!currentUser ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : currentUser.role === 'admin' ? (
        <Stack.Screen name="Admin" component={AdminNavigator} />
      ) : (
        <Stack.Screen name="Technician" component={TechnicianNavigator} />
      )}
    </Stack.Navigator>
  );
}

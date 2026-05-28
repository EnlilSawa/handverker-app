import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/appStore';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { AdminNavigator } from './AdminNavigator';
import { TechnicianNavigator } from './TechnicianNavigator';

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const currentUser = useAppStore((s) => s.currentUser);

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

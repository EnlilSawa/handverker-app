import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SuperadminProvider } from '../screens/superadmin/SuperadminContext';
import { SuperadminScreen } from '../screens/superadmin/SuperadminScreen';
import { SuperadminCompanyDetailScreen } from '../screens/superadmin/SuperadminCompanyDetailScreen';

const Stack = createNativeStackNavigator();

export function SuperadminNavigator() {
  return (
    <SuperadminProvider>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="SuperadminHome" component={SuperadminScreen} />
        <Stack.Screen name="SuperadminCompanyDetail" component={SuperadminCompanyDetailScreen} />
      </Stack.Navigator>
    </SuperadminProvider>
  );
}

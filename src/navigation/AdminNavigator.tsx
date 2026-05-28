import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { JobBoardScreen } from '../screens/admin/JobBoardScreen';
import { NewJobScreen } from '../screens/admin/NewJobScreen';
import { TeamScreen } from '../screens/admin/TeamScreen';
import { InvoicesScreen } from '../screens/admin/InvoicesScreen';
import { InvoiceDetailScreen } from '../screens/shared/InvoiceDetailScreen';
import { StatisticsScreen } from '../screens/admin/StatisticsScreen';
import { SettingsScreen } from '../screens/admin/SettingsScreen';

const Tab = createBottomTabNavigator();
const JobsStack = createNativeStackNavigator();
const InvoiceStack = createNativeStackNavigator();

function JobsStackNavigator() {
  return (
    <JobsStack.Navigator screenOptions={{ headerShown: false }}>
      <JobsStack.Screen name="JobBoard" component={JobBoardScreen} />
      <JobsStack.Screen name="NewJob" component={NewJobScreen} />
    </JobsStack.Navigator>
  );
}

function InvoiceStackNavigator() {
  return (
    <InvoiceStack.Navigator screenOptions={{ headerShown: false }}>
      <InvoiceStack.Screen name="InvoiceList" component={InvoicesScreen} />
      <InvoiceStack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
    </InvoiceStack.Navigator>
  );
}

export function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.white,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Jobber: 'briefcase-outline',
            Team: 'people-outline',
            Faktura: 'document-text-outline',
            Statistikk: 'bar-chart-outline',
            Innstillinger: 'settings-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Jobber" component={JobsStackNavigator} />
      <Tab.Screen name="Team" component={TeamScreen} />
      <Tab.Screen name="Faktura" component={InvoiceStackNavigator} />
      <Tab.Screen name="Statistikk" component={StatisticsScreen} />
      <Tab.Screen name="Innstillinger" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

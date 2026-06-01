import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { TechJobsScreen } from '../screens/technician/TechJobsScreen';
import { TechMapScreen } from '../screens/technician/TechMapScreen';
import { TechTimesScreen } from '../screens/technician/TechTimesScreen';
import { TechProfileScreen } from '../screens/technician/TechProfileScreen';
import { InvoiceDetailScreen } from '../screens/shared/InvoiceDetailScreen';

const Tab = createBottomTabNavigator();
const JobsStack = createNativeStackNavigator();

function TechJobsStackNavigator() {
  return (
    <JobsStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <JobsStack.Screen name="TechJobList" component={TechJobsScreen} />
      <JobsStack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
    </JobsStack.Navigator>
  );
}

export function TechnicianNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneContainerStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: '#2D6BE4',
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarStyle: {
          borderTopWidth: 0.5,
          borderTopColor: '#EBEBEB',
          backgroundColor: '#FFFFFF',
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ color }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Jobber: 'briefcase-outline',
            Kart: 'map-outline',
            Timer: 'time-outline',
            Profil: 'person-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse-outline'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Jobber" component={TechJobsStackNavigator} />
      <Tab.Screen name="Kart" component={TechMapScreen} />
      <Tab.Screen name="Timer" component={TechTimesScreen} />
      <Tab.Screen name="Profil" component={TechProfileScreen} />
    </Tab.Navigator>
  );
}

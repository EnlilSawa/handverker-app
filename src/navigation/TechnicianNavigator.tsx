import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { TechJobsScreen } from '../screens/technician/TechJobsScreen';
import { TechJobDetailScreen } from '../screens/technician/TechJobDetailScreen';
import { TechArchiveScreen } from '../screens/technician/TechArchiveScreen';
import { TechArchiveDetailScreen } from '../screens/technician/TechArchiveDetailScreen';
import { TechTimesScreen } from '../screens/technician/TechTimesScreen';
import { TechProfileScreen } from '../screens/technician/TechProfileScreen';

const Tab = createBottomTabNavigator();
const JobsStack = createNativeStackNavigator();
const ArchiveStack = createNativeStackNavigator();

function TechJobsStackNavigator() {
  return (
    <JobsStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <JobsStack.Screen name="TechJobList"   component={TechJobsScreen} />
      <JobsStack.Screen name="TechJobDetail" component={TechJobDetailScreen} />
    </JobsStack.Navigator>
  );
}

function TechArchiveStackNavigator() {
  return (
    <ArchiveStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <ArchiveStack.Screen name="TechArchiveList" component={TechArchiveScreen} />
      <ArchiveStack.Screen name="TechArchiveDetail" component={TechArchiveDetailScreen} />
    </ArchiveStack.Navigator>
  );
}

export function TechnicianNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneContainerStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: '#2563FF',
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
            Jobber:  'briefcase-outline',
            Arkiv:   'archive-outline',
            Timer:   'time-outline',
            Profil:  'person-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse-outline'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Jobber" component={TechJobsStackNavigator} />
      <Tab.Screen name="Arkiv"  component={TechArchiveStackNavigator} />
      <Tab.Screen name="Timer"  component={TechTimesScreen} />
      <Tab.Screen name="Profil" component={TechProfileScreen} />
    </Tab.Navigator>
  );
}

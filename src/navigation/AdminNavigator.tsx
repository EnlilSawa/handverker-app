import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { EferoLogo } from '../components/EferoLogo';
import { JobBoardScreen } from '../screens/admin/JobBoardScreen';
import { NewJobScreen } from '../screens/admin/NewJobScreen';
import { JobDetailScreen } from '../screens/admin/JobDetailScreen';
import { TeamScreen } from '../screens/admin/TeamScreen';
import { InvoicesScreen } from '../screens/admin/InvoicesScreen';
import { InvoiceDetailScreen } from '../screens/shared/InvoiceDetailScreen';
import { StatisticsScreen } from '../screens/admin/StatisticsScreen';
import { SettingsScreen } from '../screens/admin/SettingsScreen';
import { ArchiveScreen } from '../screens/admin/ArchiveScreen';
import { ArchiveDetailScreen } from '../screens/admin/ArchiveDetailScreen';
import { QuotesScreen } from '../screens/admin/QuotesScreen';
import { NewQuoteScreen } from '../screens/admin/NewQuoteScreen';
import { QuoteDetailScreen } from '../screens/admin/QuoteDetailScreen';
import { CustomersScreen } from '../screens/admin/CustomersScreen';
import { CustomerDetailScreen } from '../screens/admin/CustomerDetailScreen';
import { useAppStore } from '../store/appStore';
import { NotificationBell } from '../components/NotificationBell';

const Tab = createBottomTabNavigator();
const JobsStack = createNativeStackNavigator();
const InvoiceStack = createNativeStackNavigator();
const ArchiveStack = createNativeStackNavigator();
const QuotesStack = createNativeStackNavigator();
const CustomersStack = createNativeStackNavigator();

function JobsStackNavigator() {
  return (
    <JobsStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <JobsStack.Screen name="JobBoard" component={JobBoardScreen} />
      <JobsStack.Screen name="NewJob" component={NewJobScreen} />
      <JobsStack.Screen name="JobDetail" component={JobDetailScreen} />
    </JobsStack.Navigator>
  );
}

function InvoiceStackNavigator() {
  return (
    <InvoiceStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <InvoiceStack.Screen name="InvoiceList" component={InvoicesScreen} />
      <InvoiceStack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
    </InvoiceStack.Navigator>
  );
}

function ArchiveStackNavigator() {
  return (
    <ArchiveStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <ArchiveStack.Screen name="ArchiveList" component={ArchiveScreen} />
      <ArchiveStack.Screen name="ArchiveDetail" component={ArchiveDetailScreen} />
    </ArchiveStack.Navigator>
  );
}

function QuotesStackNavigator() {
  return (
    <QuotesStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <QuotesStack.Screen name="QuotesList" component={QuotesScreen} />
      <QuotesStack.Screen name="NewQuote" component={NewQuoteScreen} />
      <QuotesStack.Screen name="QuoteDetail" component={QuoteDetailScreen} />
    </QuotesStack.Navigator>
  );
}

function CustomersStackNavigator() {
  return (
    <CustomersStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <CustomersStack.Screen name="CustomersList" component={CustomersScreen} />
      <CustomersStack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <CustomersStack.Screen name="JobDetail" component={JobDetailScreen} />
      <CustomersStack.Screen name="NewJob" component={NewJobScreen} />
    </CustomersStack.Navigator>
  );
}

// ─── Sidebar (web only) ──────────────────────────────────────────────────────

const NAV_ITEMS = [
  { name: 'Jobber', label: 'Jobbtavle', icon: 'home-outline' as const },
  { name: 'Tilbud', label: 'Tilbud', icon: 'document-text-outline' as const },
  { name: 'Kunder', label: 'Kunder', icon: 'person-outline' as const },
  { name: 'Team', label: 'Team', icon: 'people-outline' as const },
  { name: 'Faktura', label: 'Faktura', icon: 'document-text-outline' as const },
  { name: 'Arkiv', label: 'Arkiv', icon: 'archive-outline' as const },
  { name: 'Statistikk', label: 'Statistikk', icon: 'bar-chart-outline' as const },
  { name: 'Innstillinger', label: 'Innstillinger', icon: 'settings-outline' as const },
];

function AdminSidebar({ activeTab, onNavigate }: { activeTab: string; onNavigate: (tab: string) => void }) {
  const logout = useAppStore((s) => s.logout);
  const setPendingInvoicePreview = useAppStore((s) => s.setPendingInvoicePreview);
  const { isDark, toggleTheme } = useTheme();

  const handleBellNavigate = (invoiceId: string) => {
    setPendingInvoicePreview(invoiceId);
    onNavigate('Faktura');
  };

  return (
    <View style={sidebar.container}>
      {/* Logo + bjelle */}
      <View style={[sidebar.logoArea, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <EferoLogo textColor="#FFFFFF" lineColor="#2563FF" size={20} />
        <NotificationBell onNavigateToInvoice={handleBellNavigate} />
      </View>

      {/* Nav items */}
      <View style={sidebar.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              style={[sidebar.navItem, isActive && sidebar.navItemActive]}
              onPress={() => onNavigate(item.name)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
              />
              <Text style={[sidebar.navLabel, isActive && sidebar.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Theme toggle */}
      <TouchableOpacity style={sidebar.themeBtn} onPress={toggleTheme} activeOpacity={0.8}>
        <Ionicons
          name={isDark ? 'sunny-outline' : 'moon-outline'}
          size={16}
          color="rgba(255,255,255,0.65)"
        />
        <Text style={sidebar.themeLabel}>{isDark ? 'Lys modus' : 'Mørk modus'}</Text>
      </TouchableOpacity>

      {/* Logout at bottom */}
      <TouchableOpacity style={sidebar.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={16} color="rgba(255,255,255,0.4)" />
        <Text style={sidebar.logoutText}>Logg ut</Text>
      </TouchableOpacity>
    </View>
  );
}

const sidebar = StyleSheet.create({
  container: {
    width: 220,
    backgroundColor: '#0A1B33',
    paddingTop: 24,
    paddingBottom: 24,
    flexDirection: 'column',
  },
  logoArea: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  nav: { flex: 1, paddingHorizontal: 12 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 8,
    marginBottom: 2,
  },
  navItemActive: { backgroundColor: '#2563FF' },
  navLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  navLabelActive: { color: '#FFFFFF', fontWeight: '600' },
  themeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  themeLabel: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  logoutText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
});

// ─── Web layout (sidebar + content) ─────────────────────────────────────────

function AdminWebLayout() {
  const [activeTab, setActiveTab] = useState('Jobber');
  const { pageBg } = useTheme();

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#0A1B33' }}>
      <AdminSidebar activeTab={activeTab} onNavigate={setActiveTab} />
      <View style={{ flex: 1, backgroundColor: pageBg, overflow: 'hidden' }}>
        {activeTab === 'Jobber' && <JobsStackNavigator />}
        {activeTab === 'Tilbud' && <QuotesStackNavigator />}
        {activeTab === 'Kunder' && <CustomersStackNavigator />}
        {activeTab === 'Team' && <TeamScreen />}
        {activeTab === 'Faktura' && <InvoiceStackNavigator />}
        {activeTab === 'Arkiv' && <ArchiveStackNavigator />}
        {activeTab === 'Statistikk' && <StatisticsScreen />}
        {activeTab === 'Innstillinger' && <SettingsScreen />}
      </View>
    </View>
  );
}

// ─── Mobile layout (bottom tabs) ─────────────────────────────────────────────

function AdminMobileLayout() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneContainerStyle: { backgroundColor: 'transparent' },
        tabBarActiveTintColor: '#2563FF',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          backgroundColor: '#FFFFFF',
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ color }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Jobber: 'home-outline',
            Tilbud: 'document-text-outline',
            Kunder: 'person-outline',
            Team: 'people-outline',
            Faktura: 'document-text-outline',
            Arkiv: 'archive-outline',
            Statistikk: 'bar-chart-outline',
            Innstillinger: 'settings-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse-outline'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Jobber" component={JobsStackNavigator} />
      <Tab.Screen name="Tilbud" component={QuotesStackNavigator} />
      <Tab.Screen name="Kunder" component={CustomersStackNavigator} />
      <Tab.Screen name="Team" component={TeamScreen} />
      <Tab.Screen name="Faktura" component={InvoiceStackNavigator} />
      <Tab.Screen name="Arkiv" component={ArchiveStackNavigator} />
      <Tab.Screen name="Statistikk" component={StatisticsScreen} />
      <Tab.Screen name="Innstillinger" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function AdminNavigator() {
  const { width } = useWindowDimensions();
  if (width >= 768) return <AdminWebLayout />;
  return <AdminMobileLayout />;
}

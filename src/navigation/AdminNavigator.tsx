import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Animated, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
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
import { SuperadminNavigator } from './SuperadminNavigator';
import { isSuperadminEmail } from '../lib/superadminApi';

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

const SUPERADMIN_ITEM = { name: 'Superadmin', label: 'Admin', icon: 'shield-checkmark-outline' as const };

function AdminSidebar({ activeTab, onNavigate, showSuperadmin, showBell = true, containerStyle }: { activeTab: string; onNavigate: (tab: string) => void; showSuperadmin: boolean; showBell?: boolean; containerStyle?: any }) {
  const logout = useAppStore((s) => s.logout);
  const setPendingInvoicePreview = useAppStore((s) => s.setPendingInvoicePreview);
  const { isDark, toggleTheme } = useTheme();

  // Kun Efero-eieren ser "Admin"-lenken. (Reell tilgang håndheves uansett av
  // is_superadmin() server-side i hver superadmin-RPC.)
  const navItems = showSuperadmin ? [...NAV_ITEMS, SUPERADMIN_ITEM] : NAV_ITEMS;

  const handleBellNavigate = (invoiceId: string) => {
    setPendingInvoicePreview(invoiceId);
    onNavigate('Faktura');
  };

  return (
    <View style={[sidebar.container, containerStyle]}>
      {/* Logo + bjelle */}
      <View style={[sidebar.logoArea, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <EferoLogo textColor="#FFFFFF" lineColor="#FFFFFF" size={20} />
        {showBell && <NotificationBell onNavigateToInvoice={handleBellNavigate} />}
      </View>

      {/* Nav items */}
      <View style={sidebar.nav}>
        {navItems.map((item) => {
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
                color={isActive ? '#000000' : 'rgba(255,255,255,0.6)'}
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
    backgroundColor: '#000000',
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
  // Aktivt element: hvit pille med sort tekst/ikon — mono-temaets invertering.
  navItemActive: { backgroundColor: '#FFFFFF' },
  navLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  navLabelActive: { color: '#000000', fontWeight: '600' },
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
  const currentUser = useAppStore((s) => s.currentUser);
  const isSuper = isSuperadminEmail(currentUser?.email);

  // Guard: ikke-superadmin som havner på Superadmin-fanen sendes til Jobbtavlen.
  React.useEffect(() => {
    if (activeTab === 'Superadmin' && !isSuper) setActiveTab('Jobber');
  }, [activeTab, isSuper]);

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#000000' }}>
      <AdminSidebar activeTab={activeTab} onNavigate={setActiveTab} showSuperadmin={isSuper} />
      <View style={{ flex: 1, backgroundColor: pageBg, overflow: 'hidden' }}>
        <AdminContent activeTab={activeTab} isSuper={isSuper} />
      </View>
    </View>
  );
}

// ─── Innholdsområde (delt av web og mobil) ───────────────────────────────────

function AdminContent({ activeTab, isSuper }: { activeTab: string; isSuper: boolean }) {
  return (
    <>
      {activeTab === 'Jobber' && <JobsStackNavigator />}
      {activeTab === 'Tilbud' && <QuotesStackNavigator />}
      {activeTab === 'Kunder' && <CustomersStackNavigator />}
      {activeTab === 'Team' && <TeamScreen />}
      {activeTab === 'Faktura' && <InvoiceStackNavigator />}
      {activeTab === 'Arkiv' && <ArchiveStackNavigator />}
      {activeTab === 'Statistikk' && <StatisticsScreen />}
      {activeTab === 'Innstillinger' && <SettingsScreen />}
      {activeTab === 'Superadmin' && isSuper && <SuperadminNavigator />}
    </>
  );
}

// ─── Mobil-layout (topplinje + uttrekkbar venstremeny) ───────────────────────

const DRAWER_W = 220;

function AdminMobileLayout() {
  const [activeTab, setActiveTab] = useState('Jobber');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const slide = React.useRef(new Animated.Value(0)).current;
  const { pageBg, colors: C } = useTheme();
  const currentUser = useAppStore((s) => s.currentUser);
  const isSuper = isSuperadminEmail(currentUser?.email);
  const setPendingInvoicePreview = useAppStore((s) => s.setPendingInvoicePreview);

  // Guard: ikke-superadmin som havner på Superadmin-fanen sendes til Jobbtavlen.
  React.useEffect(() => {
    if (activeTab === 'Superadmin' && !isSuper) setActiveTab('Jobber');
  }, [activeTab, isSuper]);

  // Åpne/lukke-animasjon (useNativeDriver:false — kreves av RN Web).
  React.useEffect(() => {
    if (drawerOpen) {
      setDrawerMounted(true);
      Animated.timing(slide, { toValue: 1, duration: 220, useNativeDriver: false }).start();
    } else if (drawerMounted) {
      Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: false }).start(({ finished }) => {
        if (finished) setDrawerMounted(false);
      });
    }
  }, [drawerOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = (tab: string) => { setActiveTab(tab); setDrawerOpen(false); };
  const handleBellNavigate = (invoiceId: string) => { setPendingInvoicePreview(invoiceId); navigate('Faktura'); };

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      {/* Topplinje: hamburger + logo + bjelle */}
      <View style={[topbar.container, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Åpne meny">
          <Ionicons name="menu" size={26} color={C.textPrimary} />
        </TouchableOpacity>
        <EferoLogo textColor={C.textPrimary} lineColor={C.textPrimary} size={18} />
        <NotificationBell onNavigateToInvoice={handleBellNavigate} iconColor={C.textPrimary} />
      </View>

      {/* Innhold */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <AdminContent activeTab={activeTab} isSuper={isSuper} />
      </View>

      {/* Uttrekkbar venstremeny */}
      {drawerMounted && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }]}
          >
            <Pressable style={{ flex: 1 }} onPress={() => setDrawerOpen(false)} accessibilityLabel="Lukk meny" />
          </Animated.View>
          <Animated.View
            style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: DRAWER_W,
              transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-DRAWER_W, 0] }) }],
            }}
          >
            <AdminSidebar
              activeTab={activeTab}
              onNavigate={navigate}
              showSuperadmin={isSuper}
              showBell={false}
              containerStyle={{ height: '100%' }}
            />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const topbar = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
});

// ─── Root export ──────────────────────────────────────────────────────────────

export function AdminNavigator() {
  const { width } = useWindowDimensions();
  if (width >= 768) return <AdminWebLayout />;
  return <AdminMobileLayout />;
}

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Animated, Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { EferoLogo } from '../components/EferoLogo';
import { useAppStore } from '../store/appStore';
import { TechJobsScreen } from '../screens/technician/TechJobsScreen';
import { TechJobDetailScreen } from '../screens/technician/TechJobDetailScreen';
import { TechArchiveScreen } from '../screens/technician/TechArchiveScreen';
import { TechArchiveDetailScreen } from '../screens/technician/TechArchiveDetailScreen';
import { TechTimesScreen } from '../screens/technician/TechTimesScreen';
import { TechProfileScreen } from '../screens/technician/TechProfileScreen';

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

// ─── Venstremeny (navy) ──────────────────────────────────────────────────────

const NAV_ITEMS = [
  { name: 'Jobber', label: 'Jobber', icon: 'briefcase-outline' as const },
  { name: 'Arkiv', label: 'Arkiv', icon: 'archive-outline' as const },
  { name: 'Timer', label: 'Timer', icon: 'time-outline' as const },
  { name: 'Profil', label: 'Profil', icon: 'person-outline' as const },
];

function TechSidebar({ activeTab, onNavigate, containerStyle }: { activeTab: string; onNavigate: (tab: string) => void; containerStyle?: any }) {
  const logout = useAppStore((s) => s.logout);
  const { isDark, toggleTheme } = useTheme();

  return (
    <View style={[sidebar.container, containerStyle]}>
      {/* Logo */}
      <View style={sidebar.logoArea}>
        <EferoLogo textColor="#FFFFFF" lineColor="#2563FF" size={20} />
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
              <Ionicons name={item.icon} size={18} color={isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)'} />
              <Text style={[sidebar.navLabel, isActive && sidebar.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Theme toggle */}
      <TouchableOpacity style={sidebar.themeBtn} onPress={toggleTheme} activeOpacity={0.8}>
        <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={16} color="rgba(255,255,255,0.65)" />
        <Text style={sidebar.themeLabel}>{isDark ? 'Lys modus' : 'Mørk modus'}</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={sidebar.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={16} color="rgba(255,255,255,0.4)" />
        <Text style={sidebar.logoutText}>Logg ut</Text>
      </TouchableOpacity>
    </View>
  );
}

const sidebar = StyleSheet.create({
  container: { width: 220, backgroundColor: '#0A1B33', paddingTop: 24, paddingBottom: 24, flexDirection: 'column' },
  logoArea: {
    paddingHorizontal: 20, paddingBottom: 32,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', marginBottom: 12,
  },
  nav: { flex: 1, paddingHorizontal: 12 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 8, marginBottom: 2 },
  navItemActive: { backgroundColor: '#2563FF' },
  navLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  navLabelActive: { color: '#FFFFFF', fontWeight: '600' },
  themeBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 13 },
  themeLabel: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingTop: 13, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  logoutText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
});

// ─── Innhold (delt av web og mobil) ──────────────────────────────────────────

function TechContent({ activeTab }: { activeTab: string }) {
  return (
    <>
      {activeTab === 'Jobber' && <TechJobsStackNavigator />}
      {activeTab === 'Arkiv' && <TechArchiveStackNavigator />}
      {activeTab === 'Timer' && <TechTimesScreen />}
      {activeTab === 'Profil' && <TechProfileScreen />}
    </>
  );
}

// ─── Web-layout (fast sidebar + innhold) ─────────────────────────────────────

function TechWebLayout() {
  const [activeTab, setActiveTab] = useState('Jobber');
  const { pageBg } = useTheme();
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#0A1B33' }}>
      <TechSidebar activeTab={activeTab} onNavigate={setActiveTab} />
      <View style={{ flex: 1, backgroundColor: pageBg, overflow: 'hidden' }}>
        <TechContent activeTab={activeTab} />
      </View>
    </View>
  );
}

// ─── Mobil-layout (topplinje + uttrekkbar venstremeny) ───────────────────────

const DRAWER_W = 220;

function TechMobileLayout() {
  const [activeTab, setActiveTab] = useState('Jobber');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const slide = React.useRef(new Animated.Value(0)).current;
  const { pageBg, colors: C } = useTheme();

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

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      {/* Topplinje: hamburger + logo */}
      <View style={[topbar.container, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Åpne meny">
          <Ionicons name="menu" size={26} color={C.textPrimary} />
        </TouchableOpacity>
        <EferoLogo textColor={C.textPrimary} lineColor="#2563FF" size={18} />
        <View style={{ width: 26 }} />
      </View>

      {/* Innhold */}
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <TechContent activeTab={activeTab} />
      </View>

      {/* Uttrekkbar venstremeny */}
      {drawerMounted && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }]}>
            <Pressable style={{ flex: 1 }} onPress={() => setDrawerOpen(false)} accessibilityLabel="Lukk meny" />
          </Animated.View>
          <Animated.View
            style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, width: DRAWER_W,
              transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-DRAWER_W, 0] }) }],
            }}
          >
            <TechSidebar activeTab={activeTab} onNavigate={navigate} containerStyle={{ height: '100%' }} />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const topbar = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 56, borderBottomWidth: 1,
  },
});

// ─── Root ────────────────────────────────────────────────────────────────────

export function TechnicianNavigator() {
  const { width } = useWindowDimensions();
  if (width >= 768) return <TechWebLayout />;
  return <TechMobileLayout />;
}

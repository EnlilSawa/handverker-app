import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAppStore } from '../../store/appStore';

const SUPPORT_EMAIL = 'kontakt@efero.no';

// Vises kun når Efero-eieren har satt firmaet til 'canceled'/'expired' i
// superadmin-dashbordet (fakturamodell — ingen selvbetjent kortbetaling).
export function PaywallScreen() {
  const logout = useAppStore((s) => s.logout);
  const company = useAppStore((s) => s.company);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.logoRow}>
          <View style={styles.logoCircle}>
            <Ionicons name="construct" size={28} color={colors.white} />
          </View>
          <Text style={styles.logoText}>Efero</Text>
        </View>

        <View style={[styles.badge, styles.pausedBadge]}>
          <Ionicons name="pause-circle-outline" size={16} color={colors.danger} />
          <Text style={[styles.badgeText, { color: colors.danger }]}>Kontoen er satt på pause</Text>
        </View>

        <Text style={styles.headline}>Tilgangen din er midlertidig stengt</Text>
        <Text style={styles.sub}>
          {company?.name ? `${company.name} har ` : 'Kontoen din har '}
          for øyeblikket ikke aktiv tilgang til Efero. Dette skyldes vanligvis en
          ubetalt faktura. Ta kontakt med oss, så åpner vi kontoen igjen.
        </Text>

        <View style={styles.contactCard}>
          <Ionicons name="mail-outline" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.contactLabel}>Kontakt oss</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
              <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.note}>
          Har du allerede betalt? Gi oss beskjed, så gjenåpner vi tilgangen med én gang.
        </Text>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logg ut</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  logoCircle: {
    width: 46,
    height: 46,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { fontSize: 20, fontWeight: '700', color: colors.textDark },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 20,
  },
  pausedBadge: { backgroundColor: '#fef0f0' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: colors.textGray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    maxWidth: 420,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 420,
    marginBottom: 20,
  },
  contactLabel: { fontSize: 12, color: colors.textLight, marginBottom: 2 },
  contactValue: { fontSize: 15, fontWeight: '600', color: colors.primary },
  note: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 32,
    maxWidth: 420,
  },
  logoutBtn: { paddingVertical: 12 },
  logoutText: { fontSize: 14, color: colors.textGray },
});

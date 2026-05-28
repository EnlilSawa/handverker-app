import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAppStore } from '../../store/appStore';

const FEATURES = [
  'Ubegrenset antall jobber og fakturaer',
  'Ubegrenset antall teknikere',
  'Automatisk fakturering ved jobbutførelse',
  'Kalendervisning og jobbplanlegging',
  'Statistikk og inntektsoversikt',
  'Norsk kundeservice',
];

export function PaywallScreen() {
  const createStripeCheckout = useAppStore((s) => s.createStripeCheckout);
  const logout = useAppStore((s) => s.logout);
  const company = useAppStore((s) => s.company);
  const [loading, setLoading] = useState(false);

  const daysLeft = company?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(company.trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : 0;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const url = await createStripeCheckout();
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert(
        'Kunne ikke åpne betaling',
        'Kontakt oss på support@handverker.no for å aktivere abonnementet.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.logoRow}>
          <View style={styles.logoCircle}>
            <Ionicons name="construct" size={28} color={colors.white} />
          </View>
          <Text style={styles.logoText}>Håndverker</Text>
        </View>

        {daysLeft > 0 ? (
          <View style={styles.trialBadge}>
            <Ionicons name="time-outline" size={16} color={colors.warning} />
            <Text style={styles.trialBadgeText}>{daysLeft} dager igjen av prøveperioden</Text>
          </View>
        ) : (
          <View style={[styles.trialBadge, styles.expiredBadge]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={[styles.trialBadgeText, { color: colors.danger }]}>Prøveperioden er utløpt</Text>
          </View>
        )}

        <Text style={styles.headline}>
          {daysLeft > 0 ? 'Fortsett uten avbrudd' : 'Aktiver abonnement for å fortsette'}
        </Text>
        <Text style={styles.sub}>
          {daysLeft > 0
            ? 'Aktiver abonnementet nå og få tilgang til alle funksjoner uten avbrudd.'
            : 'Du må ha et aktivt abonnement for å bruke Håndverker.'}
        </Text>

        <View style={styles.priceCard}>
          <Text style={styles.priceLine}>
            <Text style={styles.priceAmount}>399 kr</Text>
            <Text style={styles.pricePerMonth}> /mnd</Text>
          </Text>
          <Text style={styles.priceNote}>eks. mva · ingen bindingstid · si opp når som helst</Text>
        </View>

        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.subscribeBtn, loading && styles.btnDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="card-outline" size={20} color={colors.white} />
              <Text style={styles.subscribeBtnText}>Start abonnement</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logg ut</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center' },
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
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff8ec',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 20,
  },
  expiredBadge: { backgroundColor: '#fef0f0' },
  trialBadgeText: { fontSize: 13, fontWeight: '600', color: colors.warning },
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
  },
  priceCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  priceLine: { flexDirection: 'row', alignItems: 'baseline' },
  priceAmount: { fontSize: 40, fontWeight: '800', color: colors.textDark },
  pricePerMonth: { fontSize: 18, color: colors.textGray },
  priceNote: { fontSize: 12, color: colors.textLight, marginTop: 4 },
  featureList: { width: '100%', gap: 10, marginBottom: 32 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, color: colors.textDark, flex: 1 },
  subscribeBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.7 },
  subscribeBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  logoutBtn: { paddingVertical: 12 },
  logoutText: { fontSize: 14, color: colors.textGray },
});

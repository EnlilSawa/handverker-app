import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAppStore } from '../../store/appStore';

const TOTAL_STEPS = 3;

export function OnboardingWizard() {
  const setupCompany = useAppStore((s) => s.setupCompany);
  const addTechnician = useAppStore((s) => s.addTechnician);
  const currentUser = useAppStore((s) => s.currentUser);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Steg 1
  const [companyName, setCompanyName] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [address, setAddress] = useState('');

  // Steg 2
  const [hourlyRate, setHourlyRate] = useState('895');
  const [calloutFee, setCalloutFee] = useState('350');
  const [paymentTerms, setPaymentTerms] = useState('14');

  // Steg 3
  const [techName, setTechName] = useState('');
  const [techEmail, setTechEmail] = useState('');
  const [techPhone, setTechPhone] = useState('');

  const handleStep1 = () => {
    if (!companyName.trim()) { Alert.alert('Mangler info', 'Skriv inn bedriftsnavn'); return; }
    setStep(2);
  };

  const handleStep2 = () => {
    if (!hourlyRate || isNaN(Number(hourlyRate))) { Alert.alert('Ugyldig verdi', 'Skriv inn gyldig timepris'); return; }
    setStep(3);
  };

  const handleFinish = async (skipTech = false) => {
    setLoading(true);
    try {
      await setupCompany({
        name: companyName.trim(),
        orgNumber: orgNumber.trim(),
        address: address.trim(),
        hourlyRate: Number(hourlyRate),
        calloutFee: Number(calloutFee) || 0,
        paymentTermsDays: Number(paymentTerms) || 14,
      });

      if (!skipTech && techEmail.trim()) {
        try {
          await addTechnician(techName.trim(), techEmail.trim(), techPhone.trim());
        } catch {
          // Invitasjon feilet — ikke kritisk, admin kan legge til tekniker fra teamskjermen
        }
      }
    } catch (e: any) {
      Alert.alert('Feil', e.message ?? 'Kunne ikke opprette firma');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons name="construct" size={28} color={colors.white} />
            </View>
            <View>
              <Text style={styles.welcomeSmall}>Velkommen, {currentUser?.name?.split(' ')[0] ?? ''}!</Text>
              <Text style={styles.welcomeTitle}>La oss sette opp bedriften</Text>
            </View>
          </View>

          {/* Stegindikatorer */}
          <View style={styles.stepRow}>
            {[1, 2, 3].map((n) => (
              <React.Fragment key={n}>
                <View style={[styles.stepDot, step >= n && styles.stepDotActive]}>
                  {step > n ? (
                    <Ionicons name="checkmark" size={13} color={colors.white} />
                  ) : (
                    <Text style={[styles.stepNum, step === n && styles.stepNumActive]}>{n}</Text>
                  )}
                </View>
                {n < TOTAL_STEPS && <View style={[styles.stepLine, step > n && styles.stepLineActive]} />}
              </React.Fragment>
            ))}
          </View>

          {/* ─── STEG 1: Bedriftsinformasjon ─── */}
          {step === 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bedriftsinformasjon</Text>
              <Text style={styles.cardSub}>Grunnleggende info om din bedrift</Text>

              <Text style={styles.label}>Bedriftsnavn *</Text>
              <TextInput
                style={styles.input}
                placeholder="VVS Service AS"
                placeholderTextColor={colors.textLight}
                value={companyName}
                onChangeText={setCompanyName}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Organisasjonsnummer</Text>
              <TextInput
                style={styles.input}
                placeholder="123 456 789"
                placeholderTextColor={colors.textLight}
                value={orgNumber}
                onChangeText={setOrgNumber}
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Adresse</Text>
              <TextInput
                style={styles.input}
                placeholder="Storgata 1, 0182 Oslo"
                placeholderTextColor={colors.textLight}
                value={address}
                onChangeText={setAddress}
              />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleStep1}>
                <Text style={styles.primaryBtnText}>Neste</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {/* ─── STEG 2: Prissetting ─── */}
          {step === 2 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Prissetting</Text>
              <Text style={styles.cardSub}>Disse brukes automatisk når fakturaer genereres</Text>

              <Text style={styles.label}>Standard timepris (kr)</Text>
              <TextInput
                style={styles.input}
                placeholder="895"
                placeholderTextColor={colors.textLight}
                value={hourlyRate}
                onChangeText={setHourlyRate}
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Fremmøtegebyr (kr)</Text>
              <TextInput
                style={styles.input}
                placeholder="350"
                placeholderTextColor={colors.textLight}
                value={calloutFee}
                onChangeText={setCalloutFee}
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Betalingsbetingelser (dager)</Text>
              <TextInput
                style={styles.input}
                placeholder="14"
                placeholderTextColor={colors.textLight}
                value={paymentTerms}
                onChangeText={setPaymentTerms}
                keyboardType="number-pad"
              />

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
                  <Ionicons name="arrow-back" size={18} color={colors.primary} />
                  <Text style={styles.secondaryBtnText}>Tilbake</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, styles.primaryBtnFlex]} onPress={handleStep2}>
                  <Text style={styles.primaryBtnText}>Neste</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ─── STEG 3: Første tekniker ─── */}
          {step === 3 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Legg til første tekniker</Text>
              <Text style={styles.cardSub}>
                Teknikeren mottar en e-postinvitasjon. Du kan også legge til teknikere senere.
              </Text>

              <Text style={styles.label}>Navn</Text>
              <TextInput
                style={styles.input}
                placeholder="Magnus Olsen"
                placeholderTextColor={colors.textLight}
                value={techName}
                onChangeText={setTechName}
                autoCapitalize="words"
              />

              <Text style={styles.label}>E-post</Text>
              <TextInput
                style={styles.input}
                placeholder="magnus@dinbedrift.no"
                placeholderTextColor={colors.textLight}
                value={techEmail}
                onChangeText={setTechEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Telefon</Text>
              <TextInput
                style={styles.input}
                placeholder="90000002"
                placeholderTextColor={colors.textLight}
                value={techPhone}
                onChangeText={setTechPhone}
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={() => handleFinish(false)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Fullfør oppsett</Text>
                    <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(2)}>
                  <Ionicons name="arrow-back" size={18} color={colors.primary} />
                  <Text style={styles.secondaryBtnText}>Tilbake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={() => handleFinish(true)}
                  disabled={loading}
                >
                  <Text style={styles.skipBtnText}>Hopp over</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Trial-info */}
          <View style={styles.trialBanner}>
            <Ionicons name="gift-outline" size={18} color={colors.success} />
            <Text style={styles.trialText}>
              <Text style={{ fontWeight: '700' }}>30 dager gratis.</Text>
              {' '}Ingen kredittkort kreves. Fortsett med 399 kr/mnd etter prøveperioden.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 },
  logoCircle: {
    width: 52,
    height: 52,
    borderRadius: 13,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeSmall: { fontSize: 13, color: colors.textGray },
  welcomeTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  stepDotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  stepNum: { fontSize: 13, fontWeight: '600', color: colors.textLight },
  stepNumActive: { color: colors.white },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border },
  stepLineActive: { backgroundColor: colors.primary },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 20,
    gap: 4,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark, marginBottom: 2 },
  cardSub: { fontSize: 13, color: colors.textGray, marginBottom: 12, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textGray, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textDark,
    backgroundColor: colors.background,
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  primaryBtnFlex: { flex: 1 },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  secondaryBtnText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  skipBtn: { paddingVertical: 14, paddingHorizontal: 8 },
  skipBtnText: { color: colors.textGray, fontSize: 15 },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#f0f8e8',
    borderRadius: 12,
    padding: 14,
  },
  trialText: { flex: 1, fontSize: 13, color: colors.textGray, lineHeight: 18 },
});

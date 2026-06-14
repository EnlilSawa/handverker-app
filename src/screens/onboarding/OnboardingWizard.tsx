import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { EferoLogo } from '../../components/EferoLogo';
import { useAppStore } from '../../store/appStore';

const TOTAL_STEPS = 3;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Tech = { name: string; phone: string; password: string };

function emptyTech(): Tech {
  return { name: '', phone: '', password: '' };
}

export function OnboardingWizard() {
  const setupCompany = useAppStore((s) => s.setupCompany);
  const updateCompany = useAppStore((s) => s.updateCompany);
  const addTechnician = useAppStore((s) => s.addTechnician);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const currentUser = useAppStore((s) => s.currentUser);

  const firstName = currentUser?.name?.trim().split(' ')[0] ?? '';

  const [phase, setPhase] = useState<'form' | 'success'>('form');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Steg 1 — bedriftsinformasjon
  const [companyName, setCompanyName] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');

  // Steg 2 — prissetting
  const [hourlyRate, setHourlyRate] = useState('895');
  const [calloutFee, setCalloutFee] = useState('0');
  const [paymentTerms, setPaymentTerms] = useState('14');

  // Steg 3 — teknikere
  const [technicians, setTechnicians] = useState<Tech[]>([emptyTech()]);
  const [techTouched, setTechTouched] = useState(false);

  // Hvilke felt brukeren har forlatt (for å vise feil først etter interaksjon)
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  // ── Validering ──────────────────────────────────────────────────────────
  const orgDigits = orgNumber.replace(/\s/g, '');
  const orgValid = orgDigits === '' || /^\d{9}$/.test(orgDigits);
  const emailValid = EMAIL_RE.test(email.trim());
  const step1Valid =
    companyName.trim() !== '' && address.trim() !== '' && emailValid && orgValid;

  const rate = parseFloat(hourlyRate.replace(',', '.'));
  const step2Valid = !isNaN(rate) && rate > 0;

  const nameError = touched.companyName && !companyName.trim() ? 'Bedriftsnavn er påkrevd' : '';
  const orgError = touched.orgNumber && !orgValid ? 'Organisasjonsnummer må være 9 siffer' : '';
  const addressError = touched.address && !address.trim() ? 'Adresse er påkrevd' : '';
  const emailError =
    touched.email && !emailValid
      ? email.trim()
        ? 'Skriv inn en gyldig e-postadresse'
        : 'E-post er påkrevd'
      : '';
  const rateError = touched.hourlyRate && !step2Valid ? 'Timepris må være et tall større enn 0' : '';

  const techFilled = (t: Tech) => !!(t.name.trim() || t.phone.trim() || t.password);
  const techRowError = (t: Tech) => ({
    name: !t.name.trim() ? 'Navn er påkrevd' : '',
    phone: !t.phone.trim() ? 'Telefon er påkrevd' : '',
    password: t.password.length < 8 ? 'Minst 8 tegn' : '',
  });

  // ── Steg-overgang (fade + lett slide) ────────────────────────────────────
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: false, // RN Web støtter ikke native driver for opacity/transform
    }).start();
  }, [step, phase]);
  const animStyle = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  };

  // ── Navigasjon mellom steg ────────────────────────────────────────────────
  const goStep1Next = () => {
    setTouched((t) => ({ ...t, companyName: true, orgNumber: true, address: true, email: true }));
    if (step1Valid) setStep(2);
  };
  const goStep2Next = () => {
    setTouched((t) => ({ ...t, hourlyRate: true }));
    if (step2Valid) setStep(3);
  };

  const updateTech = (i: number, patch: Partial<Tech>) =>
    setTechnicians((list) => list.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const addTechRow = () => setTechnicians((list) => [...list, emptyTech()]);
  const removeTechRow = (i: number) =>
    setTechnicians((list) => list.filter((_, idx) => idx !== i));

  // ── Fullføring ────────────────────────────────────────────────────────────
  const handleFinish = async (skipTech: boolean) => {
    const filled = technicians.filter(techFilled);

    if (!skipTech) {
      setTechTouched(true);
      const anyInvalid = filled.some((t) => {
        const e = techRowError(t);
        return e.name || e.phone || e.password;
      });
      if (anyInvalid) return;
    }

    setSubmitError(null);
    setLoading(true);
    try {
      await setupCompany({
        name: companyName.trim(),
        orgNumber: orgDigits,
        address: address.trim(),
        hourlyRate: rate,
        calloutFee: parseFloat(calloutFee.replace(',', '.')) || 0,
        paymentTermsDays: parseInt(paymentTerms, 10) || 14,
      });

      // Bedriftens e-post (reply-to på fakturaer) lagres separat etter at firmaet finnes
      await updateCompany({ email: email.trim() });

      if (!skipTech) {
        for (const t of filled) {
          // Onboarding samler ikke inn e-post for teknikere — de logger inn med
          // telefonnummer. Vi syntetiserer en unik e-post som intern nøkkel i auth.
          const synthEmail = `${t.phone.replace(/\D/g, '')}@teknikere.efero.no`;
          try {
            await addTechnician(t.name.trim(), synthEmail, t.phone.trim(), t.password);
          } catch (e) {
            // Ikke kritisk — admin kan legge til teknikeren senere fra Team-skjermen
            console.warn('Kunne ikke legge til tekniker:', e);
          }
        }
      }

      setPhase('success');
    } catch (e: any) {
      setSubmitError(e?.message ?? 'Kunne ikke fullføre oppsettet. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  const goToBoard = async () => {
    setSubmitError(null);
    setLoading(true);
    try {
      await completeOnboarding(); // gate i RootNavigator sender oss til Jobbtavlen
    } catch (e: any) {
      setSubmitError(e?.message ?? 'Noe gikk galt. Prøv igjen.');
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* Logo */}
            <View style={styles.logoWrap}>
              <EferoLogo size={26} />
            </View>

            {phase === 'form' ? (
              <>
                {/* Progress */}
                <View style={styles.stepRow}>
                  {[1, 2, 3].map((n) => (
                    <React.Fragment key={n}>
                      <View
                        style={[
                          styles.stepDot,
                          n < step && styles.stepDotDone,
                          n === step && styles.stepDotActive,
                        ]}
                      >
                        {n < step ? (
                          <Ionicons name="checkmark" size={14} color={colors.white} />
                        ) : (
                          <Text style={[styles.stepNum, n === step && styles.stepNumActive]}>{n}</Text>
                        )}
                      </View>
                      {n < TOTAL_STEPS && (
                        <View style={[styles.stepLine, n < step && styles.stepLineDone]} />
                      )}
                    </React.Fragment>
                  ))}
                </View>
                <Text style={styles.stepLabel}>Steg {step} av {TOTAL_STEPS}</Text>

                <Animated.View style={animStyle}>
                  {/* ─── STEG 1 ─── */}
                  {step === 1 && (
                    <View>
                      <Text style={styles.title}>Velkommen til Efero!</Text>
                      <Text style={styles.subtitle}>
                        La oss sette opp bedriften din. Tar bare to minutter.
                      </Text>

                      <Labeled label="Bedriftsnavn" error={nameError}>
                        <Input
                          placeholder="VVS Service AS"
                          value={companyName}
                          onChangeText={setCompanyName}
                          onBlur={() => markTouched('companyName')}
                          autoCapitalize="words"
                          invalid={!!nameError}
                        />
                      </Labeled>

                      <Labeled label="Organisasjonsnummer (valgfritt)" error={orgError}>
                        <Input
                          placeholder="123 456 789"
                          value={orgNumber}
                          onChangeText={setOrgNumber}
                          onBlur={() => markTouched('orgNumber')}
                          keyboardType="number-pad"
                          invalid={!!orgError}
                        />
                      </Labeled>

                      <Labeled label="Adresse" error={addressError}>
                        <Input
                          placeholder="Storgata 1, 0182 Oslo"
                          value={address}
                          onChangeText={setAddress}
                          onBlur={() => markTouched('address')}
                          invalid={!!addressError}
                        />
                      </Labeled>

                      <Labeled
                        label="Bedriftens e-post"
                        hint="Brukes som svaradresse på fakturaer"
                        error={emailError}
                      >
                        <Input
                          placeholder="post@dinbedrift.no"
                          value={email}
                          onChangeText={setEmail}
                          onBlur={() => markTouched('email')}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          invalid={!!emailError}
                        />
                      </Labeled>

                      <PrimaryButton
                        label="Neste"
                        onPress={goStep1Next}
                        disabled={!step1Valid}
                      />
                    </View>
                  )}

                  {/* ─── STEG 2 ─── */}
                  {step === 2 && (
                    <View>
                      <Text style={styles.title}>Sett opp prisene dine</Text>
                      <Text style={styles.subtitle}>
                        Dette brukes til å beregne fakturaer automatisk. Du kan endre det senere.
                      </Text>

                      <Labeled label="Standard timepris (kr)" error={rateError}>
                        <Input
                          placeholder="895"
                          value={hourlyRate}
                          onChangeText={setHourlyRate}
                          onBlur={() => markTouched('hourlyRate')}
                          keyboardType="number-pad"
                          invalid={!!rateError}
                        />
                      </Labeled>

                      <Labeled label="Fremmøtegebyr (kr)">
                        <Input
                          placeholder="0"
                          value={calloutFee}
                          onChangeText={setCalloutFee}
                          keyboardType="number-pad"
                        />
                      </Labeled>

                      <Labeled label="Betalingsbetingelser (dager)">
                        <Input
                          placeholder="14"
                          value={paymentTerms}
                          onChangeText={setPaymentTerms}
                          keyboardType="number-pad"
                        />
                      </Labeled>

                      <View style={styles.btnRow}>
                        <OutlineButton label="Tilbake" back onPress={() => setStep(1)} />
                        <PrimaryButton
                          label="Neste"
                          flex
                          onPress={goStep2Next}
                          disabled={!step2Valid}
                        />
                      </View>
                    </View>
                  )}

                  {/* ─── STEG 3 ─── */}
                  {step === 3 && (
                    <View>
                      <Text style={styles.title}>Legg til teamet ditt</Text>
                      <Text style={styles.subtitle}>
                        Legg til teknikerne dine, eller hopp over hvis du jobber alene.
                      </Text>

                      {technicians.map((t, i) => {
                        const err = techTouched && techFilled(t) ? techRowError(t) : null;
                        return (
                          <View key={i} style={styles.techCard}>
                            {technicians.length > 1 && (
                              <TouchableOpacity
                                style={styles.techRemove}
                                onPress={() => removeTechRow(i)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Ionicons name="close" size={18} color={colors.slate} />
                              </TouchableOpacity>
                            )}
                            <Text style={styles.techNum}>Tekniker {i + 1}</Text>

                            <Labeled label="Navn" error={err?.name}>
                              <Input
                                placeholder="Magnus Olsen"
                                value={t.name}
                                onChangeText={(v) => updateTech(i, { name: v })}
                                autoCapitalize="words"
                                invalid={!!err?.name}
                              />
                            </Labeled>

                            <Labeled label="Telefonnummer" error={err?.phone}>
                              <Input
                                placeholder="90000002"
                                value={t.phone}
                                onChangeText={(v) => updateTech(i, { phone: v })}
                                keyboardType="phone-pad"
                                invalid={!!err?.phone}
                              />
                            </Labeled>

                            <Labeled label="Midlertidig passord" error={err?.password}>
                              <Input
                                placeholder="Minst 8 tegn"
                                value={t.password}
                                onChangeText={(v) => updateTech(i, { password: v })}
                                autoCapitalize="none"
                                invalid={!!err?.password}
                              />
                            </Labeled>
                          </View>
                        );
                      })}

                      <TouchableOpacity style={styles.addTech} onPress={addTechRow}>
                        <Ionicons name="add" size={18} color={colors.electricBlue} />
                        <Text style={styles.addTechText}>Legg til en til</Text>
                      </TouchableOpacity>

                      {submitError && <Text style={styles.submitError}>{submitError}</Text>}

                      <View style={styles.btnRow}>
                        <OutlineButton label="Tilbake" back onPress={() => setStep(2)} disabled={loading} />
                        <PrimaryButton
                          label="Fullfør oppsett"
                          flex
                          loading={loading}
                          onPress={() => handleFinish(false)}
                        />
                      </View>

                      <TouchableOpacity
                        style={styles.skip}
                        onPress={() => handleFinish(true)}
                        disabled={loading}
                      >
                        <Text style={styles.skipText}>Hopp over — jeg jobber alene</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Animated.View>
              </>
            ) : (
              /* ─── SUKSESS ─── */
              <Animated.View style={[styles.successWrap, animStyle]}>
                <View style={styles.successCircle}>
                  <Ionicons name="checkmark" size={44} color={colors.white} />
                </View>
                <Text style={styles.successTitle}>
                  Alt klart{firstName ? `, ${firstName}` : ''}!
                </Text>
                <Text style={styles.successSub}>
                  Bedriften din er satt opp og klar til bruk.
                </Text>
                {submitError && <Text style={styles.submitError}>{submitError}</Text>}
                <PrimaryButton label="Gå til Jobbtavlen" loading={loading} onPress={goToBoard} />
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Gjenbrukbare delkomponenter ──────────────────────────────────────────────

function Labeled({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function Input({
  invalid,
  ...props
}: TextInputProps & { invalid?: boolean }) {
  return (
    <TextInput
      style={[styles.input, invalid && styles.inputError]}
      placeholderTextColor={colors.textLight}
      {...props}
    />
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  flex,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  flex?: boolean;
}) {
  const off = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, flex && styles.flex1, off && styles.primaryBtnOff]}
      onPress={onPress}
      disabled={off}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          <Text style={styles.primaryBtnText}>{label}</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </>
      )}
    </TouchableOpacity>
  );
}

function OutlineButton({
  label,
  onPress,
  back,
  disabled,
}: {
  label: string;
  onPress: () => void;
  back?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.outlineBtn, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      {back && <Ionicons name="arrow-back" size={18} color={colors.electricBlue} />}
      <Text style={styles.outlineBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.lightGray },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 40,
  },
  logoWrap: { alignItems: 'center', marginBottom: 24 },

  // Progress
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: { borderColor: colors.electricBlue, backgroundColor: colors.electricBlue },
  stepDotDone: { borderColor: colors.success, backgroundColor: colors.success },
  stepNum: { fontSize: 13, fontWeight: '600', color: colors.textLight },
  stepNumActive: { color: colors.white },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border },
  stepLineDone: { backgroundColor: colors.success },
  stepLabel: { fontSize: 13, color: colors.slate, marginTop: 10, marginBottom: 4 },

  // Tekst
  title: { fontSize: 24, fontWeight: '600', color: colors.navy, marginTop: 16 },
  subtitle: { fontSize: 15, color: colors.slate, lineHeight: 21, marginTop: 8 },

  // Felt
  label: { fontSize: 13, fontWeight: '600', color: colors.charcoal },
  hint: { fontSize: 12, color: colors.slate, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.charcoal,
    backgroundColor: colors.white,
    marginTop: 6,
  },
  inputError: { borderColor: colors.danger },
  errorText: { fontSize: 12, color: colors.danger, marginTop: 6 },
  submitError: { fontSize: 13, color: colors.danger, marginTop: 16, textAlign: 'center' },

  // Knapper
  primaryBtn: {
    backgroundColor: colors.electricBlue,
    borderRadius: 10,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  flex1: { flex: 1 },
  primaryBtnOff: { opacity: 0.4 },
  primaryBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  outlineBtn: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  outlineBtnText: { color: colors.electricBlue, fontSize: 15, fontWeight: '600' },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  // Teknikere
  techCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    backgroundColor: colors.lightGray,
  },
  techNum: { fontSize: 13, fontWeight: '700', color: colors.navy },
  techRemove: { position: 'absolute', top: 10, right: 10, zIndex: 1 },
  addTech: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.electricBlue,
    borderStyle: 'dashed',
  },
  addTechText: { color: colors.electricBlue, fontSize: 14, fontWeight: '600' },
  skip: { marginTop: 18, alignItems: 'center' },
  skipText: { color: colors.slate, fontSize: 14, textDecorationLine: 'underline' },

  // Suksess
  successWrap: { alignItems: 'center', paddingTop: 8 },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  successTitle: { fontSize: 24, fontWeight: '600', color: colors.navy, textAlign: 'center' },
  successSub: {
    fontSize: 15,
    color: colors.slate,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
});

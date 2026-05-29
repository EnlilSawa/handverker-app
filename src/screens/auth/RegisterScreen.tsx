import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EferoLogo } from '../../components/EferoLogo';
import { useAppStore } from '../../store/appStore';

interface Props {
  onGoToLogin: () => void;
  onEmailSent: (email: string) => void;
}

export function RegisterScreen({ onGoToLogin, onEmailSent }: Props) {
  const register = useAppStore((s) => s.register);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);

  const clearErr = () => setError('');

  const handleRegister = async () => {
    setError('');
    if (!name.trim()) { setError('Skriv inn navn'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Skriv inn gyldig e-postadresse'); return; }
    if (password.length < 6) { setError('Passordet må ha minst 6 tegn'); return; }
    setLoading(true);
    const result = await register(name.trim(), email.trim(), phone.trim(), password);
    setLoading(false);
    if (result === 'error') setError('Kunne ikke opprette konto. E-postadressen er kanskje allerede i bruk.');
    else if (result === 'confirm_email') onEmailSent(email.trim());
  };

  const inp = (id: string) => ({
    style: [styles.input, focused === id && styles.inputFocused],
    onFocus: () => setFocused(id),
    onBlur: () => setFocused(null),
    placeholderTextColor: '#94A3B8' as const,
  });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.avoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Navy header */}
          <View style={styles.darkHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={onGoToLogin}>
              <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
              <Text style={styles.backText}>Tilbake</Text>
            </TouchableOpacity>
            <EferoLogo textColor="#FFFFFF" lineColor="#2563FF" size={22} />
            <Text style={styles.tagline}>30 dager gratis — ingen kredittkort</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Opprett konto</Text>

            <Text style={styles.fieldLabel}>FULLT NAVN</Text>
            <TextInput {...inp('name')} placeholder="Kjetil Hansen" value={name} onChangeText={(t) => { setName(t); clearErr(); }} autoCapitalize="words" autoCorrect={false} />

            <Text style={[styles.fieldLabel, styles.gap]}>E-POST</Text>
            <TextInput {...inp('email')} placeholder="din@epost.no" value={email} onChangeText={(t) => { setEmail(t); clearErr(); }} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />

            <Text style={[styles.fieldLabel, styles.gap]}>
              TELEFON <Text style={styles.optional}>(valgfritt)</Text>
            </Text>
            <TextInput {...inp('phone')} placeholder="90000001" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

            <Text style={[styles.fieldLabel, styles.gap]}>PASSORD</Text>
            <View style={styles.passwordRow}>
              <TextInput
                {...inp('password')}
                style={[styles.input, styles.passwordInput, focused === 'password' && styles.inputFocused]}
                placeholder="Minimum 6 tegn"
                value={password}
                onChangeText={(t) => { setPassword(t); clearErr(); }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.registerBtn, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.registerBtnText}>Opprett konto</Text>
              }
            </TouchableOpacity>

            <Text style={styles.terms}>
              Ved å registrere deg godtar du våre vilkår for bruk og personvernreglene.
            </Text>
          </View>

          <TouchableOpacity style={styles.footer} onPress={onGoToLogin}>
            <Text style={styles.footerText}>
              Har du allerede konto?{' '}
              <Text style={styles.footerLink}>Logg inn</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1B33' },
  avoid: { flex: 1, backgroundColor: '#F5F7FA' },
  scroll: { flexGrow: 1 },
  darkHeader: {
    backgroundColor: '#0A1B33',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 72,
    paddingHorizontal: 20,
    gap: 14,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 16 },
  backText: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 20,
    marginTop: -40,
    padding: 28,
  },
  cardTitle: { fontSize: 20, fontWeight: '600', color: '#1F2937', marginBottom: 20 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  gap: { marginTop: 14 },
  optional: { fontWeight: '400', fontSize: 11, textTransform: 'none', letterSpacing: 0, color: '#94A3B8' },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#F8FAFC',
  },
  inputFocused: { borderColor: '#2563FF', borderWidth: 1.5, backgroundColor: '#FFFFFF' },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, top: 16 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1, lineHeight: 18 },
  registerBtn: {
    height: 52,
    borderRadius: 10,
    backgroundColor: '#0A1B33',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  terms: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 14, lineHeight: 18 },
  footer: { alignItems: 'center', paddingVertical: 28 },
  footerText: { fontSize: 14, color: '#64748B' },
  footerLink: { color: '#2563FF', fontWeight: '600', textDecorationLine: 'underline' },
});

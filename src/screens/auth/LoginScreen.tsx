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
  onGoToRegister?: () => void;
}

export function LoginScreen({ onGoToRegister }: Props) {
  const login = useAppStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email.trim()) { setError('Skriv inn e-postadresse'); return; }
    setLoading(true);
    const ok = await login(email.trim(), password);
    setLoading(false);
    if (!ok) setError('Feil e-post eller passord. Prøv igjen.');
  };

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
            <EferoLogo textColor="#FFFFFF" lineColor="#2563FF" size={22} />
            <Text style={styles.tagline}>Jobb enkelt. Fakturer raskt.</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Logg inn</Text>

            <Text style={styles.fieldLabel}>E-POST ELLER TELEFON</Text>
            <TextInput
              style={[styles.input, emailFocused && styles.inputFocused]}
              placeholder="din@epost.no"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(''); }}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>PASSORD</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, passwordFocused && styles.inputFocused]}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
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
              style={[styles.loginBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.loginBtnText}>Logg inn</Text>
              }
            </TouchableOpacity>

            {__DEV__ && (
              <View style={styles.demo}>
                <Text style={styles.demoTitle}>DEMO</Text>
                <TouchableOpacity onPress={() => { setEmail('kjetil@vvsservice.no'); setPassword('Demo1234!'); setError(''); }}>
                  <Text style={styles.demoItem}>Admin: kjetil@vvsservice.no</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setEmail('magnus@vvsservice.no'); setPassword('Demo1234!'); setError(''); }}>
                  <Text style={styles.demoItem}>Tekniker: magnus@vvsservice.no</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {onGoToRegister && (
            <TouchableOpacity style={styles.footer} onPress={onGoToRegister}>
              <Text style={styles.footerText}>
                Ny bedrift?{' '}
                <Text style={styles.footerLink}>Registrer deg gratis</Text>
              </Text>
            </TouchableOpacity>
          )}
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
    paddingTop: 48,
    paddingBottom: 72,
    gap: 14,
  },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.55)' },
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
  errorText: { fontSize: 13, color: '#DC2626', flex: 1 },
  loginBtn: {
    height: 52,
    borderRadius: 10,
    backgroundColor: '#0A1B33',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  demo: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 4,
  },
  demoTitle: { fontSize: 10, fontWeight: '600', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 4 },
  demoItem: { fontSize: 13, color: '#2563FF', paddingVertical: 3 },
  footer: { alignItems: 'center', paddingVertical: 28 },
  footerText: { fontSize: 14, color: '#64748B' },
  footerLink: { color: '#2563FF', fontWeight: '600', textDecorationLine: 'underline' },
});

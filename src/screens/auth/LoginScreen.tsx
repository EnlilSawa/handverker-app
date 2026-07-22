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
import { reportError } from '../../lib/sentry';

interface Props {
  onGoToRegister?: () => void;
  onGoToForgot?: () => void;
}

export function LoginScreen({ onGoToRegister, onGoToForgot }: Props) {
  const login = useAppStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  // MIDLERTIDIG SENTRY-TEST (fjernes før merge): 7 trykk på logoen sender en testfeil.
  const [logoTaps, setLogoTaps] = useState(0);
  const handleLogoTap = () => {
    const taps = logoTaps + 1;
    setLogoTaps(taps);
    if (taps >= 7) {
      setLogoTaps(0);
      reportError(new Error('Sentry-testfeil fra Efero (midlertidig — skal fjernes før merge)'), {
        action: 'sentryTest',
      });
    }
  };

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
          {/* Navy header — 35% of screen */}
          <View style={styles.header}>
            {/* MIDLERTIDIG SENTRY-TEST (fjernes før merge) — Pressable rundt logoen */}
            <TouchableOpacity activeOpacity={1} onPress={handleLogoTap}>
              <EferoLogo textColor="#FFFFFF" lineColor="#FFFFFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.tagline}>Jobb enkelt. Fakturer raskt.</Text>
          </View>

          {/* Card — full width, floats up over header, no bottom radius */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Logg inn</Text>

            <Text style={styles.fieldLabel}>E-POST ELLER TELEFON</Text>
            <TextInput
              style={[styles.input, emailFocused && styles.inputFocused]}
              placeholder="din@epost.no"
              placeholderTextColor="#878E97"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(''); }}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>PASSORD</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, passwordFocused && styles.inputFocused]}
                placeholder="••••••••"
                placeholderTextColor="#878E97"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#878E97"
                />
              </TouchableOpacity>
            </View>

            {onGoToForgot && (
              <TouchableOpacity style={styles.forgotBtn} onPress={onGoToForgot}>
                <Text style={styles.forgotText}>Glemt passord?</Text>
              </TouchableOpacity>
            )}

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

            {onGoToRegister && (
              <TouchableOpacity style={styles.footer} onPress={onGoToRegister}>
                <Text style={styles.footerText}>
                  Ny bedrift?{' '}
                  <Text style={styles.footerLink}>Registrer deg gratis</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000000' },
  avoid: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1 },

  header: {
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
    paddingBottom: 80,
    gap: 16,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.70)',
    letterSpacing: 0.2,
  },

  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingHorizontal: 32,
    paddingTop: 36,
    paddingBottom: 40,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 28,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#616A76',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#000000',
    backgroundColor: '#F5F5F5',
  },
  inputFocused: {
    borderColor: '#000000',
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, top: 16 },

  forgotBtn: { alignSelf: 'flex-end', marginTop: 12 },
  forgotText: { fontSize: 13, color: '#000000', fontWeight: '600' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1 },

  loginBtn: {
    height: 52,
    borderRadius: 10,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  footer: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 8,
  },
  footerText: { fontSize: 14, color: '#616A76' },
  footerLink: {
    color: '#000000',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

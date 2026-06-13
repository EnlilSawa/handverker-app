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
}

export function ForgotPasswordScreen({ onGoToLogin }: Props) {
  const requestPasswordReset = useAppStore((s) => s.requestPasswordReset);
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setError('');
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('Skriv inn en gyldig e-postadresse');
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(value);
      setSent(true);
    } catch {
      // Av sikkerhetshensyn viser vi samme bekreftelse uansett om e-posten finnes
      setSent(true);
    } finally {
      setLoading(false);
    }
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
          <View style={styles.header}>
            <EferoLogo textColor="#FFFFFF" lineColor="#2563FF" size={24} />
            <Text style={styles.tagline}>Tilbakestill passordet ditt</Text>
          </View>

          <View style={styles.card}>
            {sent ? (
              <>
                <View style={styles.successIcon}>
                  <Ionicons name="mail-outline" size={32} color="#2563FF" />
                </View>
                <Text style={styles.cardTitle}>Sjekk e-posten din</Text>
                <Text style={styles.body}>
                  Hvis <Text style={styles.bodyStrong}>{email.trim()}</Text> har en konto hos
                  Efero, har vi sendt en lenke for å tilbakestille passordet. Lenken er gyldig
                  i kort tid.
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={onGoToLogin}>
                  <Text style={styles.primaryBtnText}>Tilbake til innlogging</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Glemt passord?</Text>
                <Text style={styles.body}>
                  Skriv inn e-postadressen din, så sender vi deg en lenke for å lage et nytt passord.
                </Text>

                <Text style={[styles.fieldLabel, { marginTop: 24 }]}>E-POST</Text>
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

                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                  onPress={handleSend}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#FFFFFF" />
                    : <Text style={styles.primaryBtnText}>Send tilbakestillingslenke</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.footer} onPress={onGoToLogin}>
                  <Text style={styles.footerText}>
                    Husket du det?{' '}
                    <Text style={styles.footerLink}>Tilbake til innlogging</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A1B33' },
  avoid: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1 },

  header: {
    backgroundColor: '#0A1B33',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
    paddingBottom: 80,
    gap: 16,
  },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.70)', letterSpacing: 0.2 },

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
  successIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#EEF4FF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  cardTitle: { fontSize: 22, fontWeight: '600', color: '#0A1B33', marginBottom: 12 },
  body: { fontSize: 15, color: '#64748B', lineHeight: 22 },
  bodyStrong: { color: '#1F2937', fontWeight: '600' },

  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  input: {
    height: 52, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 16, fontSize: 15, color: '#1F2937', backgroundColor: '#F8FAFC',
  },
  inputFocused: { borderColor: '#2563FF', borderWidth: 1.5, backgroundColor: '#FFFFFF' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 16,
  },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1 },

  primaryBtn: {
    height: 52, borderRadius: 10, backgroundColor: '#2563FF',
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  footer: { alignItems: 'center', paddingTop: 28, paddingBottom: 8 },
  footerText: { fontSize: 14, color: '#64748B' },
  footerLink: { color: '#2563FF', fontWeight: '600', textDecorationLine: 'underline' },
});

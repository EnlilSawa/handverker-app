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
            <EferoLogo textColor="#FFFFFF" lineColor="#FFFFFF" size={24} />
            <Text style={styles.tagline}>Tilbakestill passordet ditt</Text>
          </View>

          <View style={styles.card}>
            {sent ? (
              <>
                <View style={styles.successIcon}>
                  <Ionicons name="mail-outline" size={32} color="#000000" />
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
                  placeholderTextColor="#878E97"
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
    backgroundColor: '#ECECEC',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  cardTitle: { fontSize: 22, fontWeight: '600', color: '#000000', marginBottom: 12 },
  body: { fontSize: 15, color: '#616A76', lineHeight: 22 },
  bodyStrong: { color: '#000000', fontWeight: '600' },

  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: '#616A76',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  input: {
    height: 52, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 10,
    paddingHorizontal: 16, fontSize: 15, color: '#000000', backgroundColor: '#F5F5F5',
  },
  inputFocused: { borderColor: '#000000', borderWidth: 1.5, backgroundColor: '#FFFFFF' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 16,
  },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1 },

  primaryBtn: {
    height: 52, borderRadius: 10, backgroundColor: '#000000',
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  footer: { alignItems: 'center', paddingTop: 28, paddingBottom: 8 },
  footerText: { fontSize: 14, color: '#616A76' },
  footerLink: { color: '#000000', fontWeight: '600', textDecorationLine: 'underline' },
});

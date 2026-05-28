import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
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

  const handleRegister = async () => {
    setError('');
    if (!name.trim()) { setError('Skriv inn navn'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Skriv inn gyldig e-postadresse'); return; }
    if (password.length < 6) { setError('Passordet må ha minst 6 tegn'); return; }

    setLoading(true);
    const result = await register(name.trim(), email.trim(), phone.trim(), password);
    setLoading(false);

    if (result === 'error') {
      setError('Kunne ikke opprette konto. E-postadressen er kanskje allerede i bruk, eller prøv igjen om litt.');
    } else if (result === 'confirm_email') {
      onEmailSent(email.trim());
    }
    // 'ok' → RootNavigator oppdager session og sender til onboarding automatisk
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={onGoToLogin}>
            <Ionicons name="arrow-back" size={22} color={colors.textGray} />
            <Text style={styles.backText}>Tilbake til innlogging</Text>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="construct" size={36} color={colors.white} />
            </View>
            <Text style={styles.appName}>Opprett konto</Text>
            <Text style={styles.tagline}>30 dagers gratis prøveperiode — ingen kredittkort</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Ditt fulle navn</Text>
            <TextInput
              style={styles.input}
              placeholder="Kjetil Hansen"
              placeholderTextColor={colors.textLight}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <Text style={styles.label}>E-post</Text>
            <TextInput
              style={styles.input}
              placeholder="din@epost.no"
              placeholderTextColor={colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Telefon (valgfritt)</Text>
            <TextInput
              style={styles.input}
              placeholder="90000001"
              placeholderTextColor={colors.textLight}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Passord</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Minimum 6 tegn"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((v) => !v)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textGray}
                />
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Opprett konto</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.terms}>
              Ved å registrere deg godtar du våre vilkår for bruk og personvernreglene.
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
  container: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  backText: { fontSize: 14, color: colors.textGray },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 17,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  appName: { fontSize: 24, fontWeight: '700', color: colors.textDark },
  tagline: { fontSize: 13, color: colors.textGray, marginTop: 4, textAlign: 'center' },
  form: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textGray, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textDark,
    backgroundColor: colors.backgroundSecondary,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 44 },
  eyeButton: { position: 'absolute', right: 12, top: 13 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef0f0',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  errorText: { flex: 1, fontSize: 13, color: colors.danger, lineHeight: 18 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  terms: { fontSize: 11, color: colors.textLight, textAlign: 'center', marginTop: 12, lineHeight: 16 },
});

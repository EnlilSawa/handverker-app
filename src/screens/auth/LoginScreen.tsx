import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
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

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Feil', 'Skriv inn e-postadresse');
      return;
    }
    setLoading(true);
    const ok = await login(email.trim(), password);
    setLoading(false);
    if (!ok) {
      Alert.alert('Innlogging feilet', 'Feil e-post eller passord');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="construct" size={40} color={colors.white} />
          </View>
          <Text style={styles.appName}>Håndverker</Text>
          <Text style={styles.tagline}>Jobb enkelt. Fakturer raskt.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>E-post eller telefonnummer</Text>
          <TextInput
            style={styles.input}
            placeholder="din@epost.no eller 90000002"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Passord</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="••••••••"
              placeholderTextColor={colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((v) => !v)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textGray}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Logg inn</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.demo}>
          <Text style={styles.demoTitle}>Demo-kontoer</Text>
          <TouchableOpacity onPress={() => { setEmail('kjetil@vvsservice.no'); setPassword('Demo1234!'); }}>
            <Text style={styles.demoItem}>Admin: kjetil@vvsservice.no</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setEmail('magnus@vvsservice.no'); setPassword('Demo1234!'); }}>
            <Text style={styles.demoItem}>Tekniker: magnus@vvsservice.no</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setEmail('90000002'); setPassword('Demo1234!'); }}>
            <Text style={styles.demoItem}>Tekniker via tlf: 90000002</Text>
          </TouchableOpacity>
          <Text style={styles.demoNote}>(trykk for å fylle inn — passord: Demo1234!)</Text>
        </View>

        {onGoToRegister && (
          <TouchableOpacity style={styles.registerLink} onPress={onGoToRegister}>
            <Text style={styles.registerLinkText}>
              Ny bedrift?{' '}
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Registrer deg gratis</Text>
            </Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: { fontSize: 28, fontWeight: '700', color: colors.textDark },
  tagline: { fontSize: 14, color: colors.textGray, marginTop: 4 },
  form: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textGray, marginTop: 8 },
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  demo: {
    marginTop: 40,
    padding: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    gap: 4,
  },
  demoTitle: { fontSize: 12, fontWeight: '600', color: colors.textGray, marginBottom: 4 },
  demoItem: { fontSize: 13, color: colors.primary, paddingVertical: 2 },
  demoNote: { fontSize: 11, color: colors.textLight, marginTop: 4 },
  registerLink: { marginTop: 24, alignItems: 'center' },
  registerLinkText: { fontSize: 14, color: colors.textGray },
});

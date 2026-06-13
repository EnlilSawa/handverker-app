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
  // Kalles når passordet er oppdatert — RootNavigator logger ut og viser innlogging.
  onDone: () => void;
}

export function UpdatePasswordScreen({ onDone }: Props) {
  const updatePassword = useAppStore((s) => s.updatePassword);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async () => {
    setError('');
    if (password.length < 8) { setError('Passordet må være minst 8 tegn'); return; }
    if (password !== confirm) { setError('Passordene er ikke like'); return; }
    setLoading(true);
    try {
      await updatePassword(password);
      onDone();
    } catch (e: any) {
      setError(e?.message ?? 'Kunne ikke oppdatere passordet. Prøv på nytt.');
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
            <Text style={styles.tagline}>Lag et nytt passord</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nytt passord</Text>
            <Text style={styles.body}>Velg et nytt passord på minst 8 tegn.</Text>

            <Text style={[styles.fieldLabel, { marginTop: 24 }]}>NYTT PASSORD</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>BEKREFT PASSORD</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              value={confirm}
              onChangeText={(t) => { setConfirm(t); setError(''); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
              onPress={handleUpdate}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.primaryBtnText}>Oppdater passord</Text>}
            </TouchableOpacity>
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
  cardTitle: { fontSize: 22, fontWeight: '600', color: '#0A1B33', marginBottom: 12 },
  body: { fontSize: 15, color: '#64748B', lineHeight: 22 },

  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  input: {
    height: 52, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 16, fontSize: 15, color: '#1F2937', backgroundColor: '#F8FAFC',
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, top: 16 },

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
});

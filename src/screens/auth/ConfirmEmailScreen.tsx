import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { supabase } from '../../lib/supabase';

const RESEND_COOLDOWN = 60;

interface Props {
  email: string;
  onGoToLogin: () => void;
}

export function ConfirmEmailScreen({ email, onGoToLogin }: Props) {
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    setSending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setSending(false);
    if (error) {
      Alert.alert('Feil', 'Kunne ikke sende lenken på nytt. Prøv igjen om litt.');
    } else {
      setCooldown(RESEND_COOLDOWN);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.iconCircle}>
          <Ionicons name="mail-outline" size={48} color={colors.primary} />
        </View>

        <Text style={styles.title}>Bekreft e-postadressen din</Text>

        <Text style={styles.body}>
          Vi har sendt en bekreftelseslenke til
        </Text>
        <Text style={styles.email}>{email}</Text>
        <Text style={styles.body}>
          Klikk på lenken i e-posten for å aktivere kontoen. Etter bekreftelse sendes du automatisk videre.
        </Text>

        <View style={styles.steps}>
          {[
            'Åpne e-posten fra Håndverker',
            'Klikk på «Bekreft e-post»',
            'Du blir sendt tilbake hit automatisk',
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNum}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.resendBtn, (sending || cooldown > 0) && styles.resendBtnDisabled]}
          onPress={handleResend}
          disabled={sending || cooldown > 0}
        >
          {sending ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Ionicons name="refresh-outline" size={18} color={cooldown > 0 ? colors.textLight : colors.primary} />
          )}
          <Text style={[styles.resendText, cooldown > 0 && styles.resendTextDisabled]}>
            {cooldown > 0 ? `Send på nytt om ${cooldown}s` : 'Send lenke på nytt'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginLink} onPress={onGoToLogin}>
          <Text style={styles.loginLinkText}>Tilbake til innlogging</Text>
        </TouchableOpacity>

        <Text style={styles.spamNote}>
          Ikke fått e-posten? Sjekk søppelpostmappen.
        </Text>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 14,
    color: colors.textGray,
    textAlign: 'center',
    lineHeight: 20,
  },
  email: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
    marginVertical: 6,
    textAlign: 'center',
  },
  steps: {
    alignSelf: 'stretch',
    marginTop: 28,
    marginBottom: 32,
    gap: 14,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: { fontSize: 13, fontWeight: '700', color: colors.white },
  stepText: { fontSize: 14, color: colors.textDark, flex: 1 },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  resendBtnDisabled: { borderColor: colors.border },
  resendText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  resendTextDisabled: { color: colors.textLight },
  loginLink: { paddingVertical: 12, marginBottom: 12 },
  loginLinkText: { fontSize: 14, color: colors.textGray },
  spamNote: { fontSize: 12, color: colors.textLight, textAlign: 'center' },
});

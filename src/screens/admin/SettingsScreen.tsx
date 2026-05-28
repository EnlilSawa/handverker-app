import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useAppStore } from '../../store/appStore';

function Section({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

function Field({ label, value, onChangeText, keyboardType = 'default', placeholder }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
      />
    </View>
  );
}

export function SettingsScreen() {
  const company = useAppStore((s) => s.company);
  const logout = useAppStore((s) => s.logout);
  const updateCompany = useAppStore((s) => s.updateCompany);

  const [name, setName] = useState(company.name);
  const [orgNumber, setOrgNumber] = useState(company.orgNumber);
  const [address, setAddress] = useState(company.address);
  const [hourlyRate, setHourlyRate] = useState(String(company.hourlyRate));
  const [calloutFee, setCalloutFee] = useState(String(company.calloutFee));
  const [paymentTerms, setPaymentTerms] = useState(String(company.paymentTermsDays));

  const handleSave = () => {
    const rate = parseFloat(hourlyRate);
    const callout = parseFloat(calloutFee);
    const terms = parseInt(paymentTerms, 10);

    if (isNaN(rate) || isNaN(callout) || isNaN(terms)) {
      Alert.alert('Ugyldig verdi', 'Sjekk at beløp og dager er gyldige tall');
      return;
    }

    updateCompany({
      name: name.trim(),
      orgNumber: orgNumber.trim(),
      address: address.trim(),
      hourlyRate: rate,
      calloutFee: callout,
      paymentTermsDays: terms,
    });
    Alert.alert('Lagret', 'Innstillingene er oppdatert');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Innstillinger</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Section title="Bedriftsinformasjon" />
        <Field label="Bedriftsnavn" value={name} onChangeText={setName} placeholder="VVS Service AS" />
        <Field label="Organisasjonsnummer" value={orgNumber} onChangeText={setOrgNumber} placeholder="123 456 789" />
        <Field label="Adresse" value={address} onChangeText={setAddress} placeholder="Gateveien 1, 0150 Oslo" />

        <Section title="Prissetting" />
        <Field label="Standard timepris (NOK)" value={hourlyRate} onChangeText={setHourlyRate} keyboardType="numeric" placeholder="895" />
        <Field label="Fremmøtegebyr (NOK)" value={calloutFee} onChangeText={setCalloutFee} keyboardType="numeric" placeholder="350" />

        <Section title="Betaling" />
        <Field label="Betalingsbetingelser (dager)" value={paymentTerms} onChangeText={setPaymentTerms} keyboardType="numeric" placeholder="14" />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Lagre innstillinger</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={logout}
        >
          <Text style={styles.logoutText}>Logg ut</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundSecondary },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.textDark },
  content: { padding: 20, paddingBottom: 40 },
  section: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textGray,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 10,
  },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textGray, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textDark,
    backgroundColor: colors.white,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 24 },
  logoutBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
});

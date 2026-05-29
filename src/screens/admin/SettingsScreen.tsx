import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/appStore';

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function FieldInput({ label, value, onChangeText, keyboardType = 'default', placeholder }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

export function SettingsScreen() {
  const company = useAppStore((s) => s.company);
  const logout = useAppStore((s) => s.logout);
  const updateCompany = useAppStore((s) => s.updateCompany);

  const [name, setName] = useState(company?.name ?? '');
  const [orgNumber, setOrgNumber] = useState(company?.orgNumber ?? '');
  const [address, setAddress] = useState(company?.address ?? '');
  const [hourlyRate, setHourlyRate] = useState(String(company?.hourlyRate ?? 895));
  const [calloutFee, setCalloutFee] = useState(String(company?.calloutFee ?? 350));
  const [paymentTerms, setPaymentTerms] = useState(String(company?.paymentTermsDays ?? 14));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const rate = parseFloat(hourlyRate);
    const callout = parseFloat(calloutFee);
    const terms = parseInt(paymentTerms, 10);
    if (isNaN(rate) || isNaN(callout) || isNaN(terms)) return;
    updateCompany({ name: name.trim(), orgNumber: orgNumber.trim(), address: address.trim(), hourlyRate: rate, calloutFee: callout, paymentTermsDays: terms });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Innstillinger</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <SectionHeader title="BEDRIFTSINFORMASJON" />
          <FieldInput label="Bedriftsnavn" value={name} onChangeText={setName} placeholder="VVS Service AS" />
          <FieldInput label="Organisasjonsnummer" value={orgNumber} onChangeText={setOrgNumber} placeholder="123 456 789" />
          <FieldInput label="Adresse" value={address} onChangeText={setAddress} placeholder="Gateveien 1, 0150 Oslo" />
        </View>

        <View style={styles.card}>
          <SectionHeader title="PRISSETTING" />
          <FieldInput label="Standard timepris (NOK)" value={hourlyRate} onChangeText={setHourlyRate} keyboardType="numeric" placeholder="895" />
          <FieldInput label="Fremmøtegebyr (NOK)" value={calloutFee} onChangeText={setCalloutFee} keyboardType="numeric" placeholder="350" />
        </View>

        <View style={styles.card}>
          <SectionHeader title="BETALING" />
          <FieldInput label="Betalingsbetingelser (dager)" value={paymentTerms} onChangeText={setPaymentTerms} keyboardType="numeric" placeholder="14" />
        </View>

        <TouchableOpacity style={[styles.saveBtn, saved && styles.saveBtnSuccess]} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{saved ? 'Lagret ✓' : 'Lagre innstillinger'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logg ut</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: { fontSize: 20, fontWeight: '600', color: '#1F2937' },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: -2,
  },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#F8FAFC',
  },
  inputFocused: { borderColor: '#2563FF', borderWidth: 1.5, backgroundColor: '#FFFFFF' },
  saveBtn: {
    height: 52,
    backgroundColor: '#2563FF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnSuccess: { backgroundColor: '#15803D' },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  logoutBtn: {
    height: 52,
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '600' },
});

import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Image,
  ScrollView, TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { useAppStore } from '../../store/appStore';

function SectionHeader({ title }: { title: string }) {
  const { colors: C } = useTheme();
  return <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{title}</Text>;
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
  const { colors: C } = useTheme();
  const company = useAppStore((s) => s.company);
  const logout = useAppStore((s) => s.logout);
  const updateCompany = useAppStore((s) => s.updateCompany);
  const uploadCompanyLogo = useAppStore((s) => s.uploadCompanyLogo);

  const [name, setName] = useState(company?.name ?? '');
  const [orgNumber, setOrgNumber] = useState(company?.orgNumber ?? '');
  const [address, setAddress] = useState(company?.address ?? '');
  const [hourlyRate, setHourlyRate] = useState(String(company?.hourlyRate ?? 895));
  const [calloutFee, setCalloutFee] = useState(String(company?.calloutFee ?? 350));
  const [paymentTerms, setPaymentTerms] = useState(String(company?.paymentTermsDays ?? 14));
  const [accountNumber, setAccountNumber] = useState(company?.accountNumber ?? '');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');

  // Sync all fields when company loads from Supabase (async after mount)
  React.useEffect(() => {
    if (!company) return;
    setName(company.name ?? '');
    setOrgNumber(company.orgNumber ?? '');
    setAddress(company.address ?? '');
    setHourlyRate(String(company.hourlyRate ?? 895));
    setCalloutFee(String(company.calloutFee ?? 350));
    setPaymentTerms(String(company.paymentTermsDays ?? 14));
    setAccountNumber(company.accountNumber ?? '');
  }, [company?.id]);

  const handleUploadLogo = async () => {
    setLogoError('');
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { setLogoError('Trenger tilgang til bildebiblioteket'); return; }
    }
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.9,
      });
    } catch { setLogoError('Kunne ikke åpne bildebibliotek'); return; }
    if (result.canceled || result.assets.length === 0) return;
    setLogoUploading(true);
    try {
      const asset = result.assets[0];
      await uploadCompanyLogo(asset.uri, asset.mimeType || 'image/png');
    } catch (e: any) {
      setLogoError(e.message ?? 'Opplasting feilet');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSave = async () => {
    setSaveError('');
    const rate = parseFloat(hourlyRate);
    const callout = parseFloat(calloutFee);
    const terms = parseInt(paymentTerms, 10);
    if (isNaN(rate) || isNaN(callout) || isNaN(terms)) return;
    try {
      await updateCompany({
        name: name.trim(),
        orgNumber: orgNumber.trim(),
        address: address.trim(),
        hourlyRate: rate,
        calloutFee: callout,
        paymentTermsDays: terms,
        accountNumber: accountNumber.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setSaveError(e.message ?? 'Kunne ikke lagre innstillinger');
    }
  };

  return (
    <ThemedScreen>
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <Text style={[styles.title, { color: C.textPrimary }]}>Innstillinger</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <SectionHeader title="FIRMALOGO" />
          <Text style={[styles.logoHint, { color: C.textTertiary }]}>Vises øverst til venstre på alle fakturaer</Text>

          {company?.logoUrl ? (
            <View style={styles.logoPreviewWrap}>
              <Image source={{ uri: company.logoUrl }} style={styles.logoPreview} resizeMode="contain" />
            </View>
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
              <Ionicons name="image-outline" size={28} color={C.textTertiary} />
              <Text style={[styles.logoPlaceholderText, { color: C.textTertiary }]}>Ingen logo lastet opp</Text>
            </View>
          )}

          {logoError ? (
            <View style={styles.logoErrorBox}>
              <Text style={styles.logoErrorText}>{logoError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.uploadLogoBtn, logoUploading && { opacity: 0.6 }]}
            onPress={handleUploadLogo}
            disabled={logoUploading}
          >
            {logoUploading
              ? <ActivityIndicator size="small" color="#2563FF" />
              : <Ionicons name="cloud-upload-outline" size={18} color="#2563FF" />
            }
            <Text style={styles.uploadLogoBtnText}>
              {logoUploading ? 'Laster opp…' : company?.logoUrl ? 'Bytt logo' : 'Last opp logo'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <SectionHeader title="BEDRIFTSINFORMASJON" />
          <FieldInput label="Bedriftsnavn" value={name} onChangeText={setName} placeholder="VVS Service AS" />
          <FieldInput label="Organisasjonsnummer" value={orgNumber} onChangeText={setOrgNumber} placeholder="123 456 789" />
          <FieldInput label="Adresse" value={address} onChangeText={setAddress} placeholder="Gateveien 1, 0150 Oslo" />
        </View>

        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <SectionHeader title="PRISSETTING" />
          <FieldInput label="Standard timepris (NOK)" value={hourlyRate} onChangeText={setHourlyRate} keyboardType="numeric" placeholder="895" />
          <FieldInput label="Fremmøtegebyr (NOK)" value={calloutFee} onChangeText={setCalloutFee} keyboardType="numeric" placeholder="350" />
        </View>

        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <SectionHeader title="BETALING" />
          <FieldInput label="Kontonummer" value={accountNumber} onChangeText={setAccountNumber} keyboardType="numeric" placeholder="1234 56 78901" />
          <FieldInput label="Betalingsbetingelser (dager)" value={paymentTerms} onChangeText={setPaymentTerms} keyboardType="numeric" placeholder="14" />
        </View>

        {saveError ? (
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12 }}>
            <Text style={{ fontSize: 13, color: '#DC2626' }}>{saveError}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={[styles.saveBtn, saved && styles.saveBtnSuccess]} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{saved ? 'Lagret ✓' : 'Lagre innstillinger'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logg ut</Text>
        </TouchableOpacity>
      </ScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  // Logo styles
  logoHint: { fontSize: 13, marginTop: -4 },
  logoPreviewWrap: {
    borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
    padding: 12, alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  logoPreview: { width: '100%', height: 80, maxWidth: 240 },
  logoPlaceholder: {
    borderRadius: 10, borderWidth: 1, borderStyle: 'dashed',
    paddingVertical: 24, alignItems: 'center', gap: 8,
  },
  logoPlaceholderText: { fontSize: 13 },
  logoErrorBox: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10 },
  logoErrorText: { fontSize: 13, color: '#DC2626' },
  uploadLogoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#2563FF', backgroundColor: '#EEF4FF',
  },
  uploadLogoBtnText: { fontSize: 14, color: '#2563FF', fontWeight: '600' },
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

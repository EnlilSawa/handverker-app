import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Image,
  ScrollView, TouchableOpacity, ActivityIndicator, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { useAppStore } from '../../store/appStore';
import { buildKid } from '../../utils/kid';

function SectionHeader({ title }: { title: string }) {
  const { colors: C } = useTheme();
  return <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>{title}</Text>;
}

function FieldInput({ label, value, onChangeText, keyboardType = 'default', placeholder }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  placeholder?: string;
}) {
  const { colors: C } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border }, focused && styles.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        autoCorrect={keyboardType !== 'email-address'}
        placeholder={placeholder}
        placeholderTextColor="#878E97"
      />
    </View>
  );
}

function NotifToggle({ label, description, value, onChange }: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors: C } = useTheme();
  return (
    <View style={[notifStyles.row, { borderBottomColor: C.border }]}>
      <View style={notifStyles.rowText}>
        <Text style={[notifStyles.rowLabel, { color: C.textPrimary }]}>{label}</Text>
        <Text style={[notifStyles.rowDesc, { color: C.textTertiary }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#E5E5E5', true: '#000000' }}
        thumbColor="#FFFFFF"
        // RN Web bruker egen thumb-farge i på-tilstand (default teal) — hold den hvit.
        {...({ activeThumbColor: '#FFFFFF' } as any)}
      />
    </View>
  );
}

export function SettingsScreen() {
  const { colors: C } = useTheme();
  const company = useAppStore((s) => s.company);
  const logout = useAppStore((s) => s.logout);
  const updateCompany = useAppStore((s) => s.updateCompany);
  const setInvoiceStartNumber = useAppStore((s) => s.setInvoiceStartNumber);
  const uploadCompanyLogo = useAppStore((s) => s.uploadCompanyLogo);
  const updateNotificationSettings = useAppStore((s) => s.updateNotificationSettings);

  const [name, setName] = useState(company?.name ?? '');
  const [orgNumber, setOrgNumber] = useState(company?.orgNumber ?? '');
  const [address, setAddress] = useState(company?.address ?? '');
  const [email, setEmail] = useState(company?.email ?? '');
  const [hourlyRate, setHourlyRate] = useState(String(company?.hourlyRate ?? 895));
  const [calloutFee, setCalloutFee] = useState(String(company?.calloutFee ?? 350));
  const [paymentTerms, setPaymentTerms] = useState(String(company?.paymentTermsDays ?? 14));
  const [accountNumber, setAccountNumber] = useState(company?.accountNumber ?? '');
  const [kidEnabled, setKidEnabled] = useState(company?.kidEnabled ?? true);
  const [kidLength, setKidLength] = useState(String(company?.kidLength ?? 9));
  const [startNumber, setStartNumber] = useState('');
  const [startFeedback, setStartFeedback] = useState('');
  const [startError, setStartError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');

  const [notif3days, setNotif3days] = useState(company?.notifyReminder3days ?? true);
  const [notifDueToday, setNotifDueToday] = useState(company?.notifyDueToday ?? true);
  const [notifOverdue1, setNotifOverdue1] = useState(company?.notifyOverdue1day ?? true);
  const [notifOverdue7, setNotifOverdue7] = useState(company?.notifyOverdue7days ?? true);

  // Sync all fields when company loads from Supabase (async after mount)
  React.useEffect(() => {
    if (!company) return;
    setName(company.name ?? '');
    setOrgNumber(company.orgNumber ?? '');
    setAddress(company.address ?? '');
    setEmail(company.email ?? '');
    setHourlyRate(String(company.hourlyRate ?? 895));
    setCalloutFee(String(company.calloutFee ?? 350));
    setPaymentTerms(String(company.paymentTermsDays ?? 14));
    setAccountNumber(company.accountNumber ?? '');
    setKidEnabled(company.kidEnabled ?? true);
    setKidLength(String(company.kidLength ?? 9));
    setNotif3days(company.notifyReminder3days ?? true);
    setNotifDueToday(company.notifyDueToday ?? true);
    setNotifOverdue1(company.notifyOverdue1day ?? true);
    setNotifOverdue7(company.notifyOverdue7days ?? true);
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
        quality: 0.9 });
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

  const handleNotifToggle = async (key: 'notifyReminder3days' | 'notifyDueToday' | 'notifyOverdue1day' | 'notifyOverdue7days', val: boolean) => {
    const setters = {
      notifyReminder3days: setNotif3days,
      notifyDueToday: setNotifDueToday,
      notifyOverdue1day: setNotifOverdue1,
      notifyOverdue7days: setNotifOverdue7,
    };
    setters[key](val);
    try {
      await updateNotificationSettings({ [key]: val });
    } catch {
      setters[key](!val);
    }
  };

  const handleKidToggle = async (val: boolean) => {
    setKidEnabled(val);
    try {
      await updateCompany({ kidEnabled: val });
    } catch {
      setKidEnabled(!val); // rull tilbake ved feil (samme mønster som varsel-togglene)
    }
  };

  const handleSetStartNumber = async () => {
    setStartError('');
    setStartFeedback('');
    const start = parseInt(startNumber, 10);
    if (isNaN(start) || start < 1) { setStartError('Oppgi et gyldig tall'); return; }
    if (company?.nextInvoiceSeq != null && start <= company.nextInvoiceSeq) {
      setStartError(`Startnummeret må være høyere enn dagens teller (${company.nextInvoiceSeq})`);
      return;
    }
    try {
      await setInvoiceStartNumber(start);
      setStartNumber('');
      setStartFeedback(`Neste faktura får nummer ${start}`);
    } catch (e: any) {
      setStartError(e.message ?? 'Kunne ikke sette startnummer');
    }
  };

  const handleSave = async () => {
    setSaveError('');
    const rate = parseFloat(hourlyRate);
    const callout = parseFloat(calloutFee);
    const terms = parseInt(paymentTerms, 10);
    if (isNaN(rate) || isNaN(callout) || isNaN(terms)) return;
    const kidLen = parseInt(kidLength, 10);
    if (isNaN(kidLen) || kidLen < 4 || kidLen > 25) {
      setSaveError('KID-lengde må være mellom 4 og 25 siffer');
      return;
    }
    try {
      await updateCompany({
        name: name.trim(),
        orgNumber: orgNumber.trim(),
        address: address.trim(),
        email: email.trim() || null,
        hourlyRate: rate,
        calloutFee: callout,
        paymentTermsDays: terms,
        accountNumber: accountNumber.trim() || null,
        kidLength: kidLen });
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
            <View style={[styles.logoPreviewWrap, { backgroundColor: '#FFFFFF', borderColor: C.border }]}>
              <Image source={{ uri: company.logoUrl }} style={styles.logoPreview} resizeMode="contain" />
            </View>
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: C.cardAlt }, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
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
              ? <ActivityIndicator size="small" color="#000000" />
              : <Ionicons name="cloud-upload-outline" size={18} color="#000000" />
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
          <FieldInput label="E-post (svar på faktura går hit)" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="post@dittfirma.no" />
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

        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <SectionHeader title="FAKTURANUMMER & KID" />
          <Text style={[{ fontSize: 13, color: C.textTertiary, marginTop: -4 }]}>
            {company?.nextInvoiceSeq != null
              ? `Neste faktura får nummer ${company.nextInvoiceSeq}. Serien er ubrutt (bokføringsloven) og kan bare flyttes fremover.`
              : 'Fakturaer nummereres fortløpende per firma.'}
          </Text>

          <FieldInput
            label="Nytt startnummer (valgfritt)"
            value={startNumber}
            onChangeText={(t: string) => { setStartNumber(t); setStartError(''); setStartFeedback(''); }}
            keyboardType="numeric"
            placeholder={company?.nextInvoiceSeq != null ? `Høyere enn ${company.nextInvoiceSeq}` : 'F.eks. 1000'}
          />
          {startError ? <Text style={styles.kidErrorText}>{startError}</Text> : null}
          {startFeedback ? <Text style={styles.kidOkText}>{startFeedback}</Text> : null}
          <TouchableOpacity style={styles.startNumBtn} onPress={handleSetStartNumber} disabled={!startNumber.trim()}>
            <Text style={[styles.startNumBtnText, !startNumber.trim() && { opacity: 0.5 }]}>Sett startnummer</Text>
          </TouchableOpacity>

          <NotifToggle
            label="KID på fakturaer"
            description="På som standard — hver ny faktura får automatisk unik KID. Slå av hvis firmaet mangler KID/OCR-avtale med banken; kunden bes da merke betalingen med fakturanummeret."
            value={kidEnabled}
            onChange={handleKidToggle}
          />
          {kidEnabled ? (
            <>
              <FieldInput
                label="KID-lengde (totalt antall siffer, 4–25)"
                value={kidLength}
                onChangeText={setKidLength}
                keyboardType="numeric"
                placeholder="9"
              />
              {(() => {
                const len = parseInt(kidLength, 10);
                if (isNaN(len) || len < 4 || len > 25 || company?.nextInvoiceSeq == null) return null;
                return (
                  <Text style={[{ fontSize: 13, color: C.textTertiary }]}>
                    Eksempel: faktura {company.nextInvoiceSeq} får KID {buildKid(company.nextInvoiceSeq, len)}
                  </Text>
                );
              })()}
            </>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <SectionHeader title="VARSLER" />
          <Text style={[{ fontSize: 13, color: C.textTertiary, marginTop: -4 }]}>
            E-postvarsler sendes automatisk til kunden basert på forfallsdato.
          </Text>
          <NotifToggle
            label="Påminnelse 3 dager før"
            description="Sendes kl 08:00 tre dager før forfall"
            value={notif3days}
            onChange={(v) => handleNotifToggle('notifyReminder3days', v)}
          />
          <NotifToggle
            label="Varsel på forfallsdagen"
            description="Sendes kl 08:00 på forfallsdato"
            value={notifDueToday}
            onChange={(v) => handleNotifToggle('notifyDueToday', v)}
          />
          <NotifToggle
            label="Første purring (1 dag over)"
            description="Faktura merkes som forfalt og kunde purres"
            value={notifOverdue1}
            onChange={(v) => handleNotifToggle('notifyOverdue1day', v)}
          />
          <NotifToggle
            label="Andre purring (7 dager over)"
            description="Mer alvorlig purring + varsel til deg i appen"
            value={notifOverdue7}
            onChange={(v) => handleNotifToggle('notifyOverdue7days', v)}
          />
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
  safe: { flex: 1 },
  // Logo styles
  logoHint: { fontSize: 13, marginTop: -4 },
  logoPreviewWrap: {
    borderRadius: 10, borderWidth: 1,
    padding: 12, alignItems: 'center' },
  logoPreview: { width: '100%', height: 80, maxWidth: 240 },
  logoPlaceholder: {
    borderRadius: 10, borderWidth: 1, borderStyle: 'dashed',
    paddingVertical: 24, alignItems: 'center', gap: 8 },
  logoPlaceholderText: { fontSize: 13 },
  logoErrorBox: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10 },
  logoErrorText: { fontSize: 13, color: '#DC2626' },
  uploadLogoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#000000', backgroundColor: '#ECECEC' },
  uploadLogoBtnText: { fontSize: 14, color: '#000000', fontWeight: '600' },
  startNumBtn: {
    alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 8, borderWidth: 1, borderColor: '#000000', backgroundColor: '#ECECEC',
  },
  startNumBtnText: { fontSize: 13, color: '#000000', fontWeight: '600' },
  kidErrorText: { fontSize: 13, color: '#DC2626' },
  kidOkText: { fontSize: 13, color: '#15803D' },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: '600' },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    gap: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: -2 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '500' },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
     },
  inputFocused: { borderColor: '#000000', borderWidth: 1.5 },
  saveBtn: {
    height: 52,
    backgroundColor: '#000000',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center' },
  saveBtnSuccess: { backgroundColor: '#15803D' },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  logoutBtn: {
    height: 52,
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center' },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '600' } });

const notifStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 14, fontWeight: '500' },
  rowDesc: { fontSize: 12 },
});

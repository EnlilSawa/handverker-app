import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { useAppStore } from '../../store/appStore';
import { QuoteLine } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { addDays } from '../../utils/formatters';
import { calcQuoteLineAmount, calcVat, calcTotalFromParts } from '../../utils/amounts';

interface LineInput { description: string; quantity: string; unitPrice: string; }

function calcLine(l: LineInput): number {
  return calcQuoteLineAmount(parseFloat(l.quantity) || 0, parseFloat(l.unitPrice) || 0);
}

export function NewQuoteScreen({ navigation }: any) {
  const { colors: C } = useTheme();
  const company = useAppStore((s) => s.company);
  const customers = useAppStore((s) => s.customers);
  const createQuote = useAppStore((s) => s.createQuote);
  const sendQuoteEmail = useAppStore((s) => s.sendQuoteEmail);

  // Customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; phone?: string; email?: string; address?: string } | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // Quote info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validUntil, setValidUntil] = useState(addDays(14));

  // Lines
  const [lines, setLines] = useState<LineInput[]>([
    { description: `Arbeidstimer (1t × ${company?.hourlyRate ?? 895} kr)`, quantity: '1', unitPrice: String(company?.hourlyRate ?? 895) },
    { description: 'Fremmøtegebyr', quantity: '1', unitPrice: String(company?.calloutFee ?? 350) },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Settes når tilbudet ER opprettet, men e-posten feilet → retry sender kun på
  // nytt (oppretter ikke et duplikat).
  const [createdId, setCreatedId] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    if (!customerSearch.trim() || selectedCustomer) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q)
    ).slice(0, 5);
  }, [customers, customerSearch, selectedCustomer]);

  // subtotal = sum av avrundede linjebeløp (calcLine runder hver linje til øre).
  const subtotal = lines.reduce((s, l) => s + calcLine(l), 0);
  const vat = calcVat(subtotal);
  const total = calcTotalFromParts(subtotal, vat);

  const addLine = () => setLines((prev) => [...prev, { description: '', quantity: '1', unitPrice: '0' }]);
  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof LineInput, val: string) =>
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

  const handleSave = async () => {
    setError('');
    const name = selectedCustomer?.name ?? customerSearch.trim();
    if (!name) { setError('Fyll inn kundenavn'); return; }
    if (!customerEmail.trim()) { setError('E-post er påkrevd'); return; }
    // Nøyaktig én @ + domene med punktum — fanger typiske skrivefeil (f.eks.
    // dobbel @), ellers avviser Resend sendingen og den feiler stille.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      setError('Ugyldig e-postadresse — sjekk at den er skrevet riktig');
      return;
    }
    if (!title.trim()) { setError('Fyll inn tittel'); return; }
    if (lines.length === 0) { setError('Legg til minst én linje'); return; }

    const quoteLines: QuoteLine[] = lines
      .filter((l) => l.description.trim())
      .map((l) => ({
        description: l.description.trim(),
        quantity: parseFloat(l.quantity) || 0,
        unitPrice: parseFloat(l.unitPrice) || 0,
        amount: calcLine(l),
      }));

    setSaving(true);
    setError('');
    try {
      // Opprett tilbudet (hopp over hvis det alt er opprettet og vi kun retryer sending).
      let quoteId = createdId;
      if (!quoteId) {
        const newQuote = await createQuote({
          customerId: selectedCustomer?.id ?? null,
          customerName: name,
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim() || null,
          customerAddress: customerAddress.trim() || null,
          title: title.trim(),
          description: description.trim() || null,
          lines: quoteLines,
          subtotalExVat: subtotal,
          vat,
          totalAmount: total,
          validUntil,
        });
        quoteId = newQuote.id;
        setCreatedId(quoteId);
      }

      // Send tilbudet til kundens e-post automatisk.
      try {
        await sendQuoteEmail(quoteId);
      } catch (sendErr: any) {
        setError(`Tilbudet er opprettet, men e-posten kunne ikke sendes: ${sendErr?.message ?? 'ukjent feil'}`);
        return; // bli på skjermen så brukeren kan prøve igjen eller lukke
      }

      navigation.goBack();
    } catch (e: any) {
      setError(e.message ?? 'Kunne ikke opprette tilbud');
    } finally { setSaving(false); }
  };

  const inp = (val: string, setter: (v: string) => void, ph: string, opts?: any) => (
    <TextInput
      style={[styles.input, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border }]}
      value={val}
      onChangeText={setter}
      placeholder={ph}
      placeholderTextColor={C.textTertiary}
      {...opts}
    />
  );

  return (
    <ThemedScreen>
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Nytt tilbud</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Customer */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>KUNDEINFORMASJON</Text>
        {/* zIndex løfter kortet (og en overflytende kundeforslag-liste) over seksjonene
            under — ellers males lang autocomplete bak neste kort (RN Web stacking). */}
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border, position: 'relative', zIndex: 20 }]}>
          <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>KUNDENAVN *</Text>
          <View style={{ position: 'relative', zIndex: 10 }}>
            <TextInput
              style={[styles.input, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border }]}
              value={selectedCustomer ? selectedCustomer.name : customerSearch}
              onChangeText={(v) => { setCustomerSearch(v); setSelectedCustomer(null); setShowCustomerSuggestions(true); }}
              placeholder="Søk eller skriv kundenavn…"
              placeholderTextColor={C.textTertiary}
              onFocus={() => setShowCustomerSuggestions(true)}
            />
            {selectedCustomer && (
              <TouchableOpacity style={styles.clearBtn} onPress={() => { setSelectedCustomer(null); setCustomerSearch(''); }}>
                <Ionicons name="close-circle" size={18} color={C.textTertiary} />
              </TouchableOpacity>
            )}
            {showCustomerSuggestions && suggestions.length > 0 && (
              <View style={[styles.suggestions, { backgroundColor: C.cardBg, borderColor: C.border }]}>
                {suggestions.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.suggestionItem, { borderBottomColor: C.border }]}
                    onPress={() => {
                      setSelectedCustomer({ id: c.id, name: c.name, phone: c.phone ?? undefined, address: c.address ?? undefined });
                      setCustomerEmail('');
                      setCustomerPhone(c.phone ?? '');
                      setCustomerAddress(c.address ?? '');
                      setShowCustomerSuggestions(false);
                    }}
                  >
                    <Text style={[styles.suggestionName, { color: C.textPrimary }]}>{c.name}</Text>
                    {c.phone ? <Text style={[styles.suggestionPhone, { color: C.textTertiary }]}>{c.phone}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>E-POST *</Text>
          {inp(customerEmail, setCustomerEmail, 'kunde@epost.no', { keyboardType: 'email-address', autoCapitalize: 'none' })}

          <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>TELEFON</Text>
          {inp(customerPhone, setCustomerPhone, '92345678', { keyboardType: 'phone-pad' })}

          <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>ADRESSE</Text>
          {inp(customerAddress, setCustomerAddress, 'Gateveien 1, Oslo')}
        </View>

        {/* Quote info */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>TILBUDSINFO</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>TITTEL *</Text>
          {inp(title, setTitle, 'Rørleggerarbeid — bad')}

          <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>BESKRIVELSE</Text>
          <TextInput
            style={[styles.input, styles.textarea, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Beskriv arbeidet som skal utføres…"
            placeholderTextColor={C.textTertiary}
            multiline
            numberOfLines={4}
          />

          <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>GYLDIG TIL</Text>
          {inp(validUntil, setValidUntil, '2026-06-14')}
        </View>

        {/* Lines */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>LINJER</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          {/* Table header */}
          <View style={[styles.lineHeader, { borderBottomColor: C.border }]}>
            <Text style={[styles.lineHeaderText, { color: C.textTertiary, flex: 3 }]}>BESKRIVELSE</Text>
            <Text style={[styles.lineHeaderText, { color: C.textTertiary, flex: 1 }]}>ANT.</Text>
            <Text style={[styles.lineHeaderText, { color: C.textTertiary, flex: 1.5, textAlign: 'right' }]}>PRIS</Text>
            <Text style={[styles.lineHeaderText, { color: C.textTertiary, flex: 1.5, textAlign: 'right' }]}>BELØP</Text>
          </View>

          {lines.map((line, i) => (
            <View key={i} style={[styles.lineRow, { borderBottomColor: C.border }]}>
              <TextInput
                style={[styles.lineInput, { flex: 3, color: C.textPrimary }]}
                value={line.description}
                onChangeText={(v) => updateLine(i, 'description', v)}
                placeholder="Beskrivelse"
                placeholderTextColor={C.textTertiary}
              />
              <TextInput
                style={[styles.lineInput, { flex: 1, color: C.textPrimary }]}
                value={line.quantity}
                onChangeText={(v) => updateLine(i, 'quantity', v)}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.lineInput, { flex: 1.5, color: C.textPrimary, textAlign: 'right' }]}
                value={line.unitPrice}
                onChangeText={(v) => updateLine(i, 'unitPrice', v)}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.lineAmount, { color: C.textPrimary }]}>
                {formatCurrency(calcLine(line))}
              </Text>
              <TouchableOpacity onPress={() => removeLine(i)} style={{ padding: 4 }}>
                <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addLineBtn} onPress={addLine}>
            <Ionicons name="add" size={16} color="#2563FF" />
            <Text style={styles.addLineBtnText}>Legg til linje</Text>
          </TouchableOpacity>

          {/* Totals */}
          <View style={[styles.totalsSection, { borderTopColor: C.border }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: C.textSecondary }]}>Sum eks. MVA</Text>
              <Text style={[styles.totalValue, { color: C.textSecondary }]}>{formatCurrency(subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: C.textSecondary }]}>MVA 25%</Text>
              <Text style={[styles.totalValue, { color: C.textSecondary }]}>{formatCurrency(vat)}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandRow]}>
              <Text style={[styles.grandLabel, { color: C.textPrimary }]}>Totalt inkl. MVA</Text>
              <Text style={styles.grandValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
          <Text style={styles.saveBtnText}>
            {saving ? 'Sender…' : createdId ? 'Send tilbudet på nytt' : 'Opprett og send tilbud'}
          </Text>
        </TouchableOpacity>

        {createdId && !saving ? (
          <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 12 }} onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 14, color: C.textSecondary, fontWeight: '500' }}>
              Lukk — send senere fra tilbudet
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  content: { padding: 20, gap: 8, paddingBottom: 48 },
  sectionTitle: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 12 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 15 },
  textarea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  clearBtn: { position: 'absolute', right: 12, top: 15 },
  suggestions: {
    position: 'absolute', top: 52, left: 0, right: 0,
    borderRadius: 10, borderWidth: 1, zIndex: 100,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
  },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1 },
  suggestionName: { fontSize: 14, fontWeight: '600' },
  suggestionPhone: { fontSize: 12, marginTop: 2 },
  lineHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, marginBottom: 4 },
  lineHeaderText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, borderBottomWidth: 1 },
  lineInput: { fontSize: 13, paddingVertical: 4, minWidth: 20 },
  lineAmount: { flex: 1.5, fontSize: 13, fontWeight: '500', textAlign: 'right' },
  addLineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  addLineBtnText: { fontSize: 13, color: '#2563FF', fontWeight: '600' },
  totalsSection: { borderTopWidth: 2, paddingTop: 12, marginTop: 4, gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  grandRow: { paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 4 },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 13 },
  grandLabel: { fontSize: 15, fontWeight: '700' },
  grandValue: { fontSize: 20, fontWeight: '700', color: '#2563FF' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, backgroundColor: '#2563FF', borderRadius: 10,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});

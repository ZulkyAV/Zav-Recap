import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { BusinessRecord } from './BusinessSetup';

export type CapitalEntryRecord = {
  id: string;
  amount: number;
  entry_type: 'initial' | 'additional';
  note: string | null;
  occurred_at: string;
  created_at: string;
};

type Props = {
  business: BusinessRecord;
  totalCapital: number;
  capitalEntries: CapitalEntryRecord[];
  refreshing: boolean;
  savingBusiness: boolean;
  addingCapital: boolean;
  onRefresh: () => void;
  onUpdateBusiness: (name: string, email: string) => Promise<boolean>;
  onAddCapital: (amount: number, note: string) => Promise<boolean>;
};

function formatRupiah(value: number) {
  return 'Rp' + new Intl.NumberFormat('id-ID').format(value);
}

function formatNumberInput(value: string) {
  if (!value) return '';
  return new Intl.NumberFormat('id-ID').format(Number(value));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BusinessSettingsScreen({
  business,
  totalCapital,
  capitalEntries,
  refreshing,
  savingBusiness,
  addingCapital,
  onRefresh,
  onUpdateBusiness,
  onAddCapital,
}: Props) {
  const [businessName, setBusinessName] = useState(business.name);
  const [recapEmail, setRecapEmail] = useState(business.recap_email);
  const [capitalAmount, setCapitalAmount] = useState('');
  const [capitalNote, setCapitalNote] = useState('');

  useEffect(() => {
    setBusinessName(business.name);
    setRecapEmail(business.recap_email);
  }, [business]);

  async function saveBusiness() {
    const name = businessName.trim();
    const email = recapEmail.trim().toLowerCase();

    if (!name) {
      Alert.alert('Nama usaha belum diisi', 'Masukkan nama usaha.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Email belum sesuai', 'Masukkan alamat email yang valid.');
      return;
    }

    await onUpdateBusiness(name, email);
  }

  function confirmAddCapital() {
    const amount = Number(capitalAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Nominal belum sesuai', 'Masukkan tambahan modal lebih dari Rp0.');
      return;
    }

    Alert.alert(
      'Tambahkan modal?',
      `${formatRupiah(amount)} akan ditambahkan ke total modal usaha.`,
      [
        { text: 'Kembali', style: 'cancel' },
        {
          text: 'Tambahkan',
          onPress: async () => {
            const saved = await onAddCapital(amount, capitalNote);
            if (saved) {
              setCapitalAmount('');
              setCapitalNote('');
            }
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#B98CFF"
            colors={['#7C3AED']}
          />
        }
      >
        <Text style={styles.title}>Pengaturan usaha</Text>
        <Text style={styles.subtitle}>Data ini dipakai pada dashboard dan email recap</Text>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>IDENTITAS USAHA</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nama usaha</Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Nama usaha"
              placeholderTextColor="#655E70"
              maxLength={80}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email penerima recap</Text>
            <TextInput
              style={styles.input}
              value={recapEmail}
              onChangeText={setRecapEmail}
              placeholder="email@contoh.com"
              placeholderTextColor="#655E70"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helper}>Recap Jumat berikutnya dikirim ke email ini.</Text>
          </View>

          <Pressable
            style={[styles.primaryButton, savingBusiness && styles.disabledButton]}
            onPress={saveBusiness}
            disabled={savingBusiness}
          >
            {savingBusiness ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>Simpan pengaturan</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.capitalTotalCard}>
          <Text style={styles.capitalTotalLabel}>TOTAL MODAL TERCATAT</Text>
          <Text style={styles.capitalTotal}>{formatRupiah(totalCapital)}</Text>
          <Text style={styles.capitalHint}>Modal awal + seluruh tambahan modal</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>TAMBAH MODAL</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nominal tambahan</Text>
            <View style={styles.moneyInput}>
              <Text style={styles.currency}>Rp</Text>
              <TextInput
                style={styles.moneyField}
                value={formatNumberInput(capitalAmount)}
                onChangeText={(value) =>
                  setCapitalAmount(value.replace(/[^0-9]/g, ''))
                }
                placeholder="0"
                placeholderTextColor="#655E70"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Catatan</Text>
            <TextInput
              style={styles.input}
              value={capitalNote}
              onChangeText={setCapitalNote}
              placeholder="Contoh: Belanja bahan minggu kedua"
              placeholderTextColor="#655E70"
              maxLength={120}
            />
          </View>

          <Pressable
            style={[styles.secondaryButton, addingCapital && styles.disabledButton]}
            onPress={confirmAddCapital}
            disabled={addingCapital}
          >
            {addingCapital ? (
              <ActivityIndicator color="#C9A7FF" />
            ) : (
              <Text style={styles.secondaryText}>＋ Tambahkan modal</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.historyTitle}>Riwayat modal</Text>
        {capitalEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Belum ada modal yang tercatat.</Text>
          </View>
        ) : (
          capitalEntries.map((entry) => (
            <View style={styles.historyCard} key={entry.id}>
              <View style={styles.historyHeading}>
                <View>
                  <Text style={styles.entryType}>
                    {entry.entry_type === 'initial' ? 'MODAL AWAL' : 'TAMBAHAN'}
                  </Text>
                  <Text style={styles.entryDate}>{formatDate(entry.occurred_at)}</Text>
                </View>
                <Text style={styles.entryAmount}>＋{formatRupiah(entry.amount)}</Text>
              </View>
              {entry.note ? <Text style={styles.entryNote}>{entry.note}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 32 },
  title: { color: '#FFFFFF', fontSize: 25, fontWeight: '800' },
  subtitle: { color: '#857E8E', fontSize: 12, marginTop: 6, marginBottom: 20 },
  card: { backgroundColor: '#15111D', borderWidth: 1, borderColor: '#2B2435', borderRadius: 17, padding: 17, marginBottom: 13 },
  sectionLabel: { color: '#A77AE8', fontSize: 9, fontWeight: '900', letterSpacing: 0.9, marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { color: '#E4DFEA', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: '#0D0A12', borderWidth: 1, borderColor: '#332A40', borderRadius: 12, color: '#FFFFFF', fontSize: 14, paddingHorizontal: 14, paddingVertical: 13 },
  helper: { color: '#706878', fontSize: 10, marginTop: 7 },
  primaryButton: { minHeight: 48, backgroundColor: '#7C3AED', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  disabledButton: { opacity: 0.55 },
  capitalTotalCard: { backgroundColor: '#6D28D9', borderRadius: 17, padding: 19, marginBottom: 13 },
  capitalTotalLabel: { color: '#DCCBFA', fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  capitalTotal: { color: '#FFFFFF', fontSize: 27, fontWeight: '800', marginTop: 8 },
  capitalHint: { color: '#D9C7F4', fontSize: 10, marginTop: 5 },
  moneyInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0D0A12', borderWidth: 1, borderColor: '#332A40', borderRadius: 12, paddingHorizontal: 14 },
  currency: { color: '#B98CFF', fontSize: 14, fontWeight: '800', marginRight: 8 },
  moneyField: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '700', paddingVertical: 13 },
  secondaryButton: { minHeight: 47, borderWidth: 1, borderColor: '#5D3887', backgroundColor: '#251735', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#C9A7FF', fontSize: 12, fontWeight: '800' },
  historyTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', marginTop: 8, marginBottom: 11 },
  emptyCard: { borderWidth: 1, borderColor: '#332A40', borderStyle: 'dashed', borderRadius: 15, padding: 22, alignItems: 'center' },
  emptyText: { color: '#817A89', fontSize: 11 },
  historyCard: { backgroundColor: '#100D16', borderWidth: 1, borderColor: '#292132', borderRadius: 14, padding: 14, marginBottom: 9 },
  historyHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryType: { color: '#A77AE8', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  entryDate: { color: '#756E7E', fontSize: 9, marginTop: 4 },
  entryAmount: { color: '#71D6A6', fontSize: 14, fontWeight: '800' },
  entryNote: { color: '#AAA2B3', fontSize: 10, lineHeight: 15, marginTop: 10 },
});

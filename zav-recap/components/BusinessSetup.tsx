import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type BusinessRecord = {
  id: string;
  user_id: string;
  name: string;
  recap_email: string;
};

type Props = {
  session: Session;
  onCreated: (business: BusinessRecord) => void;
};

function formatNumberInput(value: string) {
  if (!value) return '';
  return new Intl.NumberFormat('id-ID').format(Number(value));
}

export default function BusinessSetup({ session, onCreated }: Props) {
  const [businessName, setBusinessName] = useState('');
  const [initialCapital, setInitialCapital] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    const name = businessName.trim();
    const amount = Number(initialCapital);
    const recapEmail = session.user.email?.trim().toLowerCase();

    if (!name) {
      Alert.alert('Nama usaha belum diisi', 'Masukkan nama usaha kamu.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert(
        'Modal awal belum sesuai',
        'Masukkan total modal awal lebih dari Rp0.'
      );
      return;
    }

    if (!recapEmail) {
      Alert.alert('Email tidak tersedia', 'Silakan keluar lalu masuk kembali.');
      return;
    }

    setLoading(true);
    let createdBusinessId: string | null = null;

    try {
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .insert({
          user_id: session.user.id,
          name,
          recap_email: recapEmail,
        })
        .select('id, user_id, name, recap_email')
        .single();

      if (businessError) throw businessError;

      createdBusinessId = business.id;

      const { error: capitalError } = await supabase
        .from('capital_entries')
        .insert({
          user_id: session.user.id,
          business_id: business.id,
          entry_type: 'initial',
          amount,
          note: 'Modal awal usaha',
        });

      if (capitalError) {
        await supabase.from('businesses').delete().eq('id', business.id);
        createdBusinessId = null;
        throw capitalError;
      }

      Alert.alert('Usaha berhasil dibuat', 'Dashboard Zav Recap sudah siap.');
      onCreated(business as BusinessRecord);
    } catch (error) {
      if (createdBusinessId) {
        await supabase.from('businesses').delete().eq('id', createdBusinessId);
      }

      Alert.alert(
        'Gagal menyimpan',
        error instanceof Error ? error.message : 'Terjadi kesalahan.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>ZR</Text>
          </View>
          <Text style={styles.brand}>Zav Recap</Text>
        </View>

        <Text style={styles.eyebrow}>SETUP PERTAMA</Text>
        <Text style={styles.title}>Kenalin usaha kamu.</Text>
        <Text style={styles.subtitle}>
          Cukup isi nama usaha dan total modal belanja awal. Stok bahan baku
          belum wajib di versi beta.
        </Text>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Nama usaha</Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Contoh: Rice Bowl Zav"
              placeholderTextColor="#655E70"
              maxLength={80}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Total modal awal</Text>
            <View style={styles.moneyInput}>
              <Text style={styles.currency}>Rp</Text>
              <TextInput
                style={styles.moneyField}
                value={formatNumberInput(initialCapital)}
                onChangeText={(value) =>
                  setInitialCapital(value.replace(/[^0-9]/g, ''))
                }
                placeholder="0"
                placeholderTextColor="#655E70"
                keyboardType="number-pad"
              />
            </View>
            <Text style={styles.helper}>
              Gabungkan seluruh belanja awal menjadi satu nominal.
            </Text>
          </View>

          <View style={styles.emailBox}>
            <Text style={styles.emailLabel}>EMAIL RECAP MINGGUAN</Text>
            <Text style={styles.emailValue}>{session.user.email}</Text>
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Simpan & buka dashboard</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.note}>
          Detail transaksi dan stok tetap opsional. Kamu bisa mulai hanya dari
          pencatatan produk yang laku.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09070F' },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 36,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 42 },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    marginRight: 12,
  },
  logoText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  brand: { color: '#F7F3FF', fontSize: 18, fontWeight: '700' },
  eyebrow: {
    color: '#B98CFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  title: { color: '#FFFFFF', fontSize: 32, lineHeight: 39, fontWeight: '800' },
  subtitle: {
    color: '#A9A3B4',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    marginBottom: 28,
  },
  card: {
    backgroundColor: '#15111D',
    borderWidth: 1,
    borderColor: '#2B2435',
    borderRadius: 20,
    padding: 20,
  },
  field: { marginBottom: 20 },
  label: {
    color: '#E4DFEA',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 9,
  },
  input: {
    backgroundColor: '#0D0A12',
    borderWidth: 1,
    borderColor: '#332A40',
    borderRadius: 13,
    color: '#FFFFFF',
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  moneyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0A12',
    borderWidth: 1,
    borderColor: '#332A40',
    borderRadius: 13,
    paddingHorizontal: 15,
  },
  currency: {
    color: '#B98CFF',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 10,
  },
  moneyField: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 14,
  },
  helper: { color: '#777080', fontSize: 12, lineHeight: 18, marginTop: 8 },
  emailBox: {
    backgroundColor: '#21172E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  emailLabel: {
    color: '#A77AE8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  emailValue: { color: '#F1EAFB', fontSize: 14, fontWeight: '600' },
  button: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  note: {
    color: '#777080',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 12,
  },
});

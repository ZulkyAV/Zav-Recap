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
import { supabase } from '../lib/supabase';

type Mode = 'signin' | 'signup';

export default function Auth() {
  const [mode, setMode] = useState<Mode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert('Belum lengkap', 'Masukkan email dan password.');
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      Alert.alert('Belum lengkap', 'Masukkan nama pemilik.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Password terlalu pendek', 'Gunakan minimal 8 karakter.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) throw error;

        if (!data.session) {
          Alert.alert(
            'Cek email',
            'Link verifikasi sudah dikirim. Verifikasi email lalu kembali untuk login.'
          );
          setMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) throw error;
      }
    } catch (error) {
      Alert.alert(
        'Gagal',
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
        <Text style={styles.logo}>ZR</Text>
        <Text style={styles.title}>Zav Recap</Text>
        <Text style={styles.subtitle}>
          Catat jualan dan pantau omzet usaha dengan lebih sederhana.
        </Text>

        <View style={styles.modeSelector}>
          <Pressable
            style={[
              styles.modeButton,
              mode === 'signin' && styles.modeButtonActive,
            ]}
            onPress={() => setMode('signin')}
          >
            <Text
              style={[
                styles.modeText,
                mode === 'signin' && styles.modeTextActive,
              ]}
            >
              Masuk
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.modeButton,
              mode === 'signup' && styles.modeButtonActive,
            ]}
            onPress={() => setMode('signup')}
          >
            <Text
              style={[
                styles.modeText,
                mode === 'signup' && styles.modeTextActive,
              ]}
            >
              Daftar
            </Text>
          </Pressable>
        </View>

        {mode === 'signup' && (
          <View style={styles.field}>
            <Text style={styles.label}>Nama pemilik</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Masukkan nama"
              placeholderTextColor="#655E70"
            />
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="nama@email.com"
            placeholderTextColor="#655E70"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Minimal 8 karakter"
            placeholderTextColor="#655E70"
            secureTextEntry
            autoCapitalize="none"
          />
        </View>

        <Pressable
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>
              {mode === 'signin' ? 'Masuk' : 'Buat Akun'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09070F',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 28,
  },
  logo: {
    color: '#C9A7FF',
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: '#A9A3B4',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 30,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#15111D',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 9,
  },
  modeButtonActive: {
    backgroundColor: '#7C3AED',
  },
  modeText: {
    color: '#8F879A',
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  field: {
    marginBottom: 18,
  },
  label: {
    color: '#D8D3DF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#15111D',
    borderWidth: 1,
    borderColor: '#2B2435',
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  submitButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 13,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

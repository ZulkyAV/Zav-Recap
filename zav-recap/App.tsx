import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert('Gagal keluar', error.message);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (!session) {
    return (
      <>
        <StatusBar style="light" />
        <Auth />
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.content}>
        <Text style={styles.badge}>LOGIN BERHASIL</Text>
        <Text style={styles.title}>Selamat datang di Zav Recap</Text>
        <Text style={styles.email}>{session.user.email}</Text>

        <Text style={styles.description}>
          Selanjutnya kita akan membuat profil usaha, modal awal, menu, dan
          pencatatan penjualan.
        </Text>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Keluar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#09070F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#09070F',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  badge: {
    color: '#C9A7FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 14,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 38,
  },
  email: {
    color: '#A9A3B4',
    fontSize: 15,
    marginTop: 10,
  },
  description: {
    color: '#8F879A',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 28,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#3B3148',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 32,
  },
  signOutText: {
    color: '#D8D3DF',
    fontWeight: '600',
  },
});

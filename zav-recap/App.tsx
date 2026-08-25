import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import Auth from './components/Auth';
import BusinessSetup, {
  type BusinessRecord,
} from './components/BusinessSetup';
import Dashboard from './components/Dashboard';
import { supabase } from './lib/supabase';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [businessError, setBusinessError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setBusiness(null);
      setBusinessError(null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadBusiness = useCallback(async () => {
    if (!session) return;

    setBusinessLoading(true);
    setBusinessError(null);

    const { data, error } = await supabase
      .from('businesses')
      .select('id, user_id, name, recap_email')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      setBusinessError(error.message);
    } else {
      setBusiness((data as BusinessRecord | null) ?? null);
    }

    setBusinessLoading(false);
  }, [session]);

  useEffect(() => {
    if (session) {
      loadBusiness();
    }
  }, [session, loadBusiness]);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert('Gagal keluar', error.message);
    }
  }

  if (authLoading || (session && businessLoading)) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Menyiapkan Zav Recap...</Text>
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

  if (businessError) {
    return (
      <View style={styles.errorScreen}>
        <StatusBar style="light" />
        <Text style={styles.errorTitle}>Data usaha belum bisa dimuat</Text>
        <Text style={styles.errorText}>{businessError}</Text>
        <Pressable style={styles.retryButton} onPress={loadBusiness}>
          <Text style={styles.retryText}>Coba lagi</Text>
        </Pressable>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Keluar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {business ? (
        <Dashboard
          session={session}
          business={business}
          onSignOut={handleSignOut}
        />
      ) : (
        <BusinessSetup session={session} onCreated={setBusiness} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#09070F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: '#8F879A', fontSize: 13, marginTop: 14 },
  errorScreen: {
    flex: 1,
    backgroundColor: '#09070F',
    justifyContent: 'center',
    padding: 28,
  },
  errorTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  errorText: { color: '#A9A3B4', fontSize: 14, lineHeight: 21, marginTop: 10 },
  retryButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 13,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 26,
  },
  retryText: { color: '#FFFFFF', fontWeight: '800' },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#3B3148',
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  signOutText: { color: '#D8D3DF', fontWeight: '700' },
});

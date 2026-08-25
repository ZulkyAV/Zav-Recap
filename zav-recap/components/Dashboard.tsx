import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { BusinessRecord } from './BusinessSetup';
import MenuForm, { type MenuRecord } from './MenuForm';
import OrderScreen, { type OrderItemInput } from './OrderScreen';
import OrderHistoryScreen, {
  type OrderHistoryRecord,
} from './OrderHistoryScreen';

type Props = {
  session: Session;
  business: BusinessRecord;
  onSignOut: () => Promise<void>;
};

type Tab = 'recap' | 'order' | 'history';

type SaleItemRow = {
  id: string;
  sale_id: string;
  menu_id: string;
  quantity: number | string;
  unit_price: number | string;
};

function formatRupiah(value: number) {
  return 'Rp' + new Intl.NumberFormat('id-ID').format(Math.abs(value));
}

function formatResult(value: number) {
  return (value < 0 ? '- ' : '+ ') + formatRupiah(value);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  return 'Terjadi kesalahan yang belum diketahui.';
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function Dashboard({ session, business, onSignOut }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('recap');
  const [initialCapital, setInitialCapital] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [allRevenue, setAllRevenue] = useState(0);
  const [todayItems, setTodayItems] = useState(0);
  const [menus, setMenus] = useState<MenuRecord[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [menuFormVisible, setMenuFormVisible] = useState(false);

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);

    try {
      const [capitalResult, menusResult, salesResult] = await Promise.all([
        supabase
          .from('capital_entries')
          .select('amount')
          .eq('business_id', business.id),
        supabase
          .from('menus')
          .select(
            'id, user_id, business_id, name, description, price, image_path, category, is_available'
          )
          .eq('business_id', business.id)
          .eq('is_available', true)
          .order('created_at', { ascending: true }),
        supabase
          .from('sales')
          .select('id, total_amount, note, sold_at')
          .eq('business_id', business.id)
          .order('sold_at', { ascending: false }),
      ]);

      if (capitalResult.error) throw capitalResult.error;
      if (menusResult.error) throw menusResult.error;
      if (salesResult.error) throw salesResult.error;

      setInitialCapital(
        (capitalResult.data ?? []).reduce(
          (sum, entry) => sum + Number(entry.amount),
          0
        )
      );

      const { start, end } = getTodayRange();
      const allSales = salesResult.data ?? [];
      const todaySales = allSales.filter(
        (sale) => sale.sold_at >= start && sale.sold_at < end
      );

      setAllRevenue(
        allSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)
      );
      setTodayRevenue(
        todaySales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)
      );

      const todaySaleIds = todaySales.map((sale) => sale.id);
      let saleItems: SaleItemRow[] = [];

      if (allSales.length > 0) {
        const { data: items, error } = await supabase
          .from('sale_items')
          .select('id, sale_id, menu_id, quantity, unit_price')
          .in('sale_id', allSales.map((sale) => sale.id));

        if (error) throw error;
        saleItems = (items ?? []) as SaleItemRow[];
      }

      const todaySaleIdSet = new Set(todaySaleIds);
      setTodayItems(
        saleItems
          .filter((item) => todaySaleIdSet.has(item.sale_id))
          .reduce((sum, item) => sum + Number(item.quantity), 0)
      );

      const menuRows = (menusResult.data ?? []) as MenuRecord[];
      const menusWithUrls = await Promise.all(
        menuRows.map(async (menu) => {
          if (!menu.image_path) {
            return { ...menu, price: Number(menu.price), image_url: null };
          }

          const { data } = await supabase.storage
            .from('menu-images')
            .createSignedUrl(menu.image_path, 60 * 60);

          return {
            ...menu,
            price: Number(menu.price),
            image_url: data?.signedUrl ?? null,
          };
        })
      );
      setMenus(menusWithUrls);

      const menuNames = new Map(
        menuRows.map((menu) => [menu.id, menu.name] as const)
      );

      setOrderHistory(
        allSales.map((sale) => ({
          id: sale.id,
          total_amount: Number(sale.total_amount),
          note: sale.note,
          sold_at: sale.sold_at,
          items: saleItems
            .filter((item) => item.sale_id === sale.id)
            .map((item) => ({
              id: item.id,
              menu_id: item.menu_id,
              menu_name: menuNames.get(item.menu_id) ?? 'Menu dihapus',
              quantity: Number(item.quantity),
              unit_price: Number(item.unit_price),
            })),
        }))
      );
    } catch (error) {
      Alert.alert(
        'Gagal memuat data',
        getErrorMessage(error)
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [business.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleMenuCreated(menu: MenuRecord) {
    setMenus((current) => [...current, menu]);
  }

  async function submitOrder(items: OrderItemInput[], note: string) {
    setSubmitting(true);

    try {
      const { error } = await supabase.rpc('create_order', {
        p_business_id: business.id,
        p_items: items,
        p_note: note.trim() || null,
      });

      if (error) throw error;

      await loadData();
      setActiveTab('recap');
      Alert.alert('Order tersimpan', 'Penjualan sudah masuk ke recap.');
      return true;
    } catch (error) {
      console.error('create_order gagal:', error);
      Alert.alert(
        'Order gagal disimpan',
        getErrorMessage(error)
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelOrder(saleId: string) {
    setCancelingId(saleId);

    try {
      const { error } = await supabase.rpc('cancel_order', {
        p_sale_id: saleId,
      });

      if (error) throw error;

      await loadData();
      Alert.alert('Order dibatalkan', 'Transaksi sudah dihapus dari recap.');
    } catch (error) {
      console.error('cancel_order gagal:', error);
      Alert.alert('Order gagal dibatalkan', getErrorMessage(error));
    } finally {
      setCancelingId(null);
    }
  }

  const estimatedResult = allRevenue - initialCapital;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>Zav Recap</Text>
          <Text style={styles.businessName}>{business.name}</Text>
        </View>

        <Pressable style={styles.exitButton} onPress={onSignOut}>
          <Text style={styles.exitText}>Keluar</Text>
        </Pressable>
      </View>

      {activeTab === 'recap' ? (
        <ScrollView
          contentContainerStyle={styles.recapContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor="#B98CFF"
              colors={['#7C3AED']}
            />
          }
        >
          <Text style={styles.greeting}>Ringkasan hari ini</Text>
          <Text style={styles.dateLabel}>Hanya order yang disimpan yang dihitung</Text>

          <View style={styles.primaryCard}>
            <Text style={styles.cardLabel}>OMZET HARI INI</Text>
            <Text style={styles.primaryAmount}>{formatRupiah(todayRevenue)}</Text>
            <Text style={styles.cardHint}>
              {todayItems > 0
                ? String(todayItems) + ' produk dari order tersimpan.'
                : 'Belum ada order yang disimpan.'}
            </Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.smallCard, styles.cardGap]}>
              <Text style={styles.smallLabel}>TOTAL MODAL</Text>
              {loading ? (
                <ActivityIndicator color="#B98CFF" />
              ) : (
                <Text style={styles.smallAmount}>{formatRupiah(initialCapital)}</Text>
              )}
            </View>

            <View style={styles.smallCard}>
              <Text style={styles.smallLabel}>PRODUK LAKU HARI INI</Text>
              <Text style={styles.smallAmount}>{todayItems} item</Text>
            </View>
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>HASIL USAHA SEMENTARA</Text>
            <Text style={styles.resultHint}>Total omzet − total modal tercatat</Text>
            <Text
              style={[
                styles.resultAmount,
                estimatedResult < 0 ? styles.lossText : styles.profitText,
              ]}
            >
              {formatResult(estimatedResult)}
            </Text>
          </View>

          <Pressable style={styles.newOrderCard} onPress={() => setActiveTab('order')}>
            <View>
              <Text style={styles.newOrderLabel}>PENCATATAN PENJUALAN</Text>
              <Text style={styles.newOrderTitle}>Buat order baru</Text>
              <Text style={styles.newOrderText}>
                Pilih beberapa menu, atur jumlahnya, lalu simpan satu order.
              </Text>
            </View>
            <Text style={styles.newOrderArrow}>→</Text>
          </Pressable>

          <View style={styles.emailCard}>
            <Text style={styles.emailTitle}>Recap mingguan</Text>
            <Text style={styles.emailText}>
              Target pengiriman setiap Jumat pukul 23.55 WIB ke
            </Text>
            <Text style={styles.emailValue}>
              {business.recap_email || session.user.email}
            </Text>
          </View>
        </ScrollView>
      ) : activeTab === 'order' ? (
        <OrderScreen
          menus={menus}
          submitting={submitting}
          onAddMenu={() => setMenuFormVisible(true)}
          onSubmit={submitOrder}
        />
      ) : (
        <OrderHistoryScreen
          orders={orderHistory}
          loading={loading}
          refreshing={refreshing}
          cancelingId={cancelingId}
          onRefresh={() => loadData(true)}
          onCancel={cancelOrder}
        />
      )}

      <View style={styles.navigation}>
        <Pressable
          style={[styles.navButton, activeTab === 'recap' && styles.navButtonActive]}
          onPress={() => setActiveTab('recap')}
        >
          <Text style={[styles.navText, activeTab === 'recap' && styles.navTextActive]}>
            Ringkasan
          </Text>
        </Pressable>
        <Pressable
          style={[styles.navButton, activeTab === 'order' && styles.navButtonActive]}
          onPress={() => setActiveTab('order')}
        >
          <Text style={[styles.navText, activeTab === 'order' && styles.navTextActive]}>
            Orderan
          </Text>
        </Pressable>
        <Pressable
          style={[styles.navButton, activeTab === 'history' && styles.navButtonActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.navText, activeTab === 'history' && styles.navTextActive]}>
            Riwayat
          </Text>
        </Pressable>
      </View>

      <MenuForm
        visible={menuFormVisible}
        session={session}
        business={business}
        onClose={() => setMenuFormVisible(false)}
        onCreated={handleMenuCreated}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09070F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 15,
  },
  brand: { color: '#B98CFF', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  businessName: { color: '#FFFFFF', fontSize: 19, fontWeight: '800', marginTop: 3 },
  exitButton: {
    borderWidth: 1,
    borderColor: '#3B3148',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  exitText: { color: '#C9C1D1', fontSize: 11, fontWeight: '700' },
  recapContent: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 28 },
  greeting: { color: '#FFFFFF', fontSize: 27, fontWeight: '800' },
  dateLabel: { color: '#857E8E', fontSize: 12, marginTop: 7, marginBottom: 22 },
  primaryCard: { backgroundColor: '#6D28D9', borderRadius: 21, padding: 22, marginBottom: 14 },
  cardLabel: { color: '#DCCBFA', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  primaryAmount: { color: '#FFFFFF', fontSize: 37, fontWeight: '800', marginTop: 10 },
  cardHint: { color: '#D9C7F4', fontSize: 12, marginTop: 8 },
  row: { flexDirection: 'row', marginBottom: 12 },
  smallCard: {
    flex: 1,
    minHeight: 112,
    backgroundColor: '#15111D',
    borderWidth: 1,
    borderColor: '#2B2435',
    borderRadius: 17,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardGap: { marginRight: 12 },
  smallLabel: { color: '#8F879A', fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  smallAmount: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  resultCard: {
    backgroundColor: '#15111D',
    borderWidth: 1,
    borderColor: '#2B2435',
    borderRadius: 17,
    padding: 17,
    marginBottom: 14,
  },
  resultLabel: { color: '#8F879A', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  resultHint: { color: '#6F6877', fontSize: 10, marginTop: 4 },
  resultAmount: { fontSize: 21, fontWeight: '800', marginTop: 13 },
  lossText: { color: '#F59E9E' },
  profitText: { color: '#71D6A6' },
  newOrderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#21172E',
    borderWidth: 1,
    borderColor: '#4C2E70',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  newOrderLabel: { color: '#A77AE8', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  newOrderTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 6 },
  newOrderText: { color: '#9E94A8', fontSize: 11, lineHeight: 17, marginTop: 6, maxWidth: 270 },
  newOrderArrow: { color: '#C9A7FF', fontSize: 27, marginLeft: 10 },
  emailCard: {
    backgroundColor: '#100D16',
    borderWidth: 1,
    borderColor: '#292132',
    borderRadius: 16,
    padding: 18,
  },
  emailTitle: { color: '#E9E3F0', fontSize: 15, fontWeight: '800' },
  emailText: { color: '#827A8C', fontSize: 12, lineHeight: 18, marginTop: 6 },
  emailValue: { color: '#B98CFF', fontSize: 13, fontWeight: '700', marginTop: 4 },
  navigation: {
    flexDirection: 'row',
    backgroundColor: '#100D16',
    borderTopWidth: 1,
    borderTopColor: '#2B2435',
    paddingHorizontal: 18,
    paddingTop: 9,
    paddingBottom: 10,
  },
  navButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
  navButtonActive: { backgroundColor: '#2C1A40' },
  navText: { color: '#756E7E', fontSize: 12, fontWeight: '700' },
  navTextActive: { color: '#C9A7FF' },
});

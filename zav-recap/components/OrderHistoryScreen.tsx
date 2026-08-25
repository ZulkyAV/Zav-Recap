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

export type OrderHistoryItem = {
  id: string;
  menu_id: string;
  menu_name: string;
  quantity: number;
  unit_price: number;
};

export type OrderHistoryRecord = {
  id: string;
  total_amount: number;
  note: string | null;
  sold_at: string;
  items: OrderHistoryItem[];
};

type Props = {
  orders: OrderHistoryRecord[];
  loading: boolean;
  refreshing: boolean;
  cancelingId: string | null;
  onRefresh: () => void;
  onCancel: (saleId: string) => Promise<void>;
};

function formatRupiah(value: number) {
  return 'Rp' + new Intl.NumberFormat('id-ID').format(value);
}

function formatOrderTime(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrderHistoryScreen({
  orders,
  loading,
  refreshing,
  cancelingId,
  onRefresh,
  onCancel,
}: Props) {
  function confirmCancel(order: OrderHistoryRecord) {
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

    Alert.alert(
      'Batalkan order?',
      `${totalItems} produk senilai ${formatRupiah(order.total_amount)} akan dihapus dari recap.`,
      [
        { text: 'Kembali', style: 'cancel' },
        {
          text: 'Batalkan order',
          style: 'destructive',
          onPress: () => onCancel(order.id),
        },
      ]
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#B98CFF"
          colors={['#7C3AED']}
        />
      }
    >
      <Text style={styles.title}>Riwayat order</Text>
      <Text style={styles.subtitle}>Tarik ke bawah untuk memperbarui data</Text>

      {loading ? (
        <ActivityIndicator color="#B98CFF" style={styles.loader} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>◎</Text>
          <Text style={styles.emptyTitle}>Belum ada riwayat</Text>
          <Text style={styles.emptyText}>Order yang sudah disimpan akan muncul di sini.</Text>
        </View>
      ) : (
        orders.map((order, index) => {
          const totalItems = order.items.reduce(
            (sum, item) => sum + item.quantity,
            0
          );
          const isCanceling = cancelingId === order.id;

          return (
            <View style={styles.orderCard} key={order.id}>
              <View style={styles.orderHeader}>
                <View style={styles.orderHeading}>
                  <Text style={styles.orderNumber}>ORDER #{orders.length - index}</Text>
                  <Text style={styles.orderTime}>{formatOrderTime(order.sold_at)}</Text>
                </View>
                <Text style={styles.orderTotal}>{formatRupiah(order.total_amount)}</Text>
              </View>

              <View style={styles.divider} />

              {order.items.map((item) => (
                <View style={styles.itemRow} key={item.id}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.quantity}× {item.menu_name}
                  </Text>
                  <Text style={styles.itemPrice}>
                    {formatRupiah(item.quantity * item.unit_price)}
                  </Text>
                </View>
              ))}

              {order.note ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteLabel}>CATATAN</Text>
                  <Text style={styles.noteText}>{order.note}</Text>
                </View>
              ) : null}

              <View style={styles.orderFooter}>
                <Text style={styles.itemCount}>{totalItems} produk</Text>
                <Pressable
                  style={[styles.cancelButton, isCanceling && styles.cancelButtonDisabled]}
                  onPress={() => confirmCancel(order)}
                  disabled={isCanceling}
                >
                  {isCanceling ? (
                    <ActivityIndicator size="small" color="#FCA5A5" />
                  ) : (
                    <Text style={styles.cancelText}>Batalkan</Text>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 30 },
  title: { color: '#FFFFFF', fontSize: 25, fontWeight: '800' },
  subtitle: { color: '#857E8E', fontSize: 12, marginTop: 6, marginBottom: 20 },
  loader: { marginTop: 45 },
  emptyCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#332A40',
    borderStyle: 'dashed',
    borderRadius: 18,
    padding: 30,
  },
  emptyIcon: { color: '#B98CFF', fontSize: 29 },
  emptyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 8 },
  emptyText: { color: '#817A89', fontSize: 12, textAlign: 'center', marginTop: 6 },
  orderCard: {
    backgroundColor: '#15111D',
    borderWidth: 1,
    borderColor: '#2B2435',
    borderRadius: 17,
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderHeading: { flex: 1, paddingRight: 10 },
  orderNumber: { color: '#A77AE8', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  orderTime: { color: '#817A89', fontSize: 11, marginTop: 5 },
  orderTotal: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#2B2435', marginVertical: 14 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  itemName: { color: '#C5BDCD', fontSize: 12, flex: 1, paddingRight: 12 },
  itemPrice: { color: '#948B9E', fontSize: 12, fontWeight: '600' },
  noteBox: { backgroundColor: '#0E0B13', borderRadius: 10, padding: 11, marginTop: 5 },
  noteLabel: { color: '#776F80', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  noteText: { color: '#B7AFBF', fontSize: 11, lineHeight: 16, marginTop: 4 },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
  },
  itemCount: { color: '#7E7687', fontSize: 10, fontWeight: '700' },
  cancelButton: {
    minWidth: 88,
    minHeight: 36,
    borderWidth: 1,
    borderColor: '#6D3542',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelButtonDisabled: { opacity: 0.55 },
  cancelText: { color: '#FCA5A5', fontSize: 11, fontWeight: '800' },
});

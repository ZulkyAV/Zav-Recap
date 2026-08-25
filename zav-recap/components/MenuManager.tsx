import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { MenuRecord } from './MenuForm';

type Props = {
  visible: boolean;
  menus: MenuRecord[];
  togglingId: string | null;
  onClose: () => void;
  onEdit: (menu: MenuRecord) => void;
  onToggle: (menu: MenuRecord) => Promise<void>;
};

function formatRupiah(value: number) {
  return 'Rp' + new Intl.NumberFormat('id-ID').format(value);
}

export default function MenuManager({
  visible,
  menus,
  togglingId,
  onClose,
  onEdit,
  onToggle,
}: Props) {
  function confirmToggle(menu: MenuRecord) {
    if (!menu.is_available) {
      onToggle(menu);
      return;
    }

    Alert.alert(
      'Nonaktifkan menu?',
      `${menu.name} tidak akan tampil di Orderan, tetapi riwayat penjualannya tetap aman.`,
      [
        { text: 'Kembali', style: 'cancel' },
        {
          text: 'Nonaktifkan',
          style: 'destructive',
          onPress: () => onToggle(menu),
        },
      ]
    );
  }

  const activeCount = menus.filter((menu) => menu.is_available).length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>PENGATURAN PRODUK</Text>
            <Text style={styles.title}>Kelola menu</Text>
            <Text style={styles.subtitle}>
              {activeCount} aktif · {menus.length - activeCount} nonaktif
            </Text>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Tutup</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {menus.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Belum ada menu</Text>
              <Text style={styles.emptyText}>Tambahkan menu melalui halaman Orderan.</Text>
            </View>
          ) : (
            menus.map((menu) => {
              const toggling = togglingId === menu.id;

              return (
                <View
                  style={[styles.card, !menu.is_available && styles.cardInactive]}
                  key={menu.id}
                >
                  <View style={styles.mainRow}>
                    {menu.image_url ? (
                      <Image source={{ uri: menu.image_url }} style={styles.image} />
                    ) : (
                      <View style={[styles.image, styles.imageFallback]}>
                        <Text style={styles.initial}>
                          {menu.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <View style={styles.info}>
                      <View style={styles.statusRow}>
                        <Text
                          style={[
                            styles.status,
                            menu.is_available ? styles.statusActive : styles.statusInactive,
                          ]}
                        >
                          {menu.is_available ? 'AKTIF' : 'NONAKTIF'}
                        </Text>
                        {menu.category ? (
                          <Text style={styles.category}>{menu.category}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.name} numberOfLines={1}>{menu.name}</Text>
                      <Text style={styles.price}>{formatRupiah(menu.price)}</Text>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <Pressable style={styles.editButton} onPress={() => onEdit(menu)}>
                      <Text style={styles.editText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.toggleButton,
                        menu.is_available ? styles.deactivateButton : styles.activateButton,
                        toggling && styles.disabledButton,
                      ]}
                      onPress={() => confirmToggle(menu)}
                      disabled={toggling}
                    >
                      {toggling ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text
                          style={menu.is_available ? styles.deactivateText : styles.activateText}
                        >
                          {menu.is_available ? 'Nonaktifkan' : 'Aktifkan'}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Riwayat tetap aman</Text>
            <Text style={styles.infoText}>
              Menonaktifkan menu tidak menghapus transaksi lama. Menu dapat diaktifkan
              kembali kapan saja.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09070F' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 54,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#251E2E',
  },
  eyebrow: { color: '#B98CFF', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#FFFFFF', fontSize: 25, fontWeight: '800', marginTop: 4 },
  subtitle: { color: '#817A89', fontSize: 11, marginTop: 5 },
  closeButton: { borderWidth: 1, borderColor: '#3B3148', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  closeText: { color: '#D0C8D8', fontSize: 12, fontWeight: '700' },
  content: { padding: 22, paddingBottom: 40 },
  emptyCard: { borderWidth: 1, borderColor: '#332A40', borderStyle: 'dashed', borderRadius: 17, padding: 28, alignItems: 'center' },
  emptyTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  emptyText: { color: '#817A89', fontSize: 11, marginTop: 6 },
  card: { backgroundColor: '#15111D', borderWidth: 1, borderColor: '#2B2435', borderRadius: 17, padding: 12, marginBottom: 11 },
  cardInactive: { opacity: 0.72, backgroundColor: '#100D16' },
  mainRow: { flexDirection: 'row', alignItems: 'center' },
  image: { width: 64, height: 64, borderRadius: 12 },
  imageFallback: { backgroundColor: '#2C1A40', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#C9A7FF', fontSize: 22, fontWeight: '800' },
  info: { flex: 1, paddingLeft: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  status: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  statusActive: { color: '#71D6A6' },
  statusInactive: { color: '#F59E9E' },
  category: { color: '#857E8E', fontSize: 8, fontWeight: '700', marginLeft: 8, textTransform: 'uppercase' },
  name: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 5 },
  price: { color: '#9C94A5', fontSize: 12, fontWeight: '600', marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 12 },
  editButton: { flex: 1, minHeight: 39, alignItems: 'center', justifyContent: 'center', backgroundColor: '#28212F', borderRadius: 10, marginRight: 9 },
  editText: { color: '#D8D0E0', fontSize: 11, fontWeight: '800' },
  toggleButton: { flex: 1, minHeight: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1 },
  deactivateButton: { backgroundColor: '#27151B', borderColor: '#6D3542' },
  activateButton: { backgroundColor: '#12251E', borderColor: '#326B52' },
  deactivateText: { color: '#FCA5A5', fontSize: 11, fontWeight: '800' },
  activateText: { color: '#71D6A6', fontSize: 11, fontWeight: '800' },
  disabledButton: { opacity: 0.55 },
  infoCard: { backgroundColor: '#100D16', borderWidth: 1, borderColor: '#292132', borderRadius: 15, padding: 16, marginTop: 3 },
  infoTitle: { color: '#D8D0E0', fontSize: 12, fontWeight: '800' },
  infoText: { color: '#827A8C', fontSize: 10, lineHeight: 16, marginTop: 6 },
});

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { MenuRecord } from './MenuForm';

export type OrderItemInput = {
  menu_id: string;
  quantity: number;
};

type Props = {
  menus: MenuRecord[];
  submitting: boolean;
  onAddMenu: () => void;
  onManageMenus: () => void;
  onSubmit: (items: OrderItemInput[], note: string) => Promise<boolean>;
};

function formatRupiah(value: number) {
  return 'Rp' + new Intl.NumberFormat('id-ID').format(value);
}

export default function OrderScreen({
  menus,
  submitting,
  onAddMenu,
  onManageMenus,
  onSubmit,
}: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');

  const selectedMenus = useMemo(
    () => menus.filter((menu) => (quantities[menu.id] ?? 0) > 0),
    [menus, quantities]
  );

  const totalItems = selectedMenus.reduce(
    (sum, menu) => sum + (quantities[menu.id] ?? 0),
    0
  );

  const orderTotal = selectedMenus.reduce(
    (sum, menu) => sum + menu.price * (quantities[menu.id] ?? 0),
    0
  );

  function changeQuantity(menuId: string, change: number) {
    setQuantities((current) => {
      const nextValue = Math.max(0, (current[menuId] ?? 0) + change);
      return { ...current, [menuId]: nextValue };
    });
  }

  async function handleSubmit() {
    if (totalItems === 0 || submitting) return;

    const items = selectedMenus.map((menu) => ({
      menu_id: menu.id,
      quantity: quantities[menu.id] ?? 0,
    }));

    const saved = await onSubmit(items, note);
    if (saved) {
      setQuantities({});
      setNote('');
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.title}>Orderan baru</Text>
            <Text style={styles.subtitle}>Pilih jumlah produk yang dipesan</Text>
          </View>
          <View style={styles.menuActions}>
            <Pressable style={styles.manageButton} onPress={onManageMenus}>
              <Text style={styles.manageText}>Kelola</Text>
            </Pressable>
            <Pressable style={styles.addMenuButton} onPress={onAddMenu}>
              <Text style={styles.addMenuText}>＋ Menu</Text>
            </Pressable>
          </View>
        </View>

        {menus.length === 0 ? (
          <Pressable style={styles.emptyCard} onPress={onAddMenu}>
            <Text style={styles.emptyIcon}>＋</Text>
            <Text style={styles.emptyTitle}>Belum ada menu</Text>
            <Text style={styles.emptyText}>
              Tambahkan produk pertama sebelum membuat order.
            </Text>
          </Pressable>
        ) : (
          menus.map((menu) => {
            const quantity = quantities[menu.id] ?? 0;

            return (
              <View
                key={menu.id}
                style={[styles.menuCard, quantity > 0 && styles.menuCardActive]}
              >
                {menu.image_url ? (
                  <Image source={{ uri: menu.image_url }} style={styles.menuImage} />
                ) : (
                  <View style={[styles.menuImage, styles.menuImageFallback]}>
                    <Text style={styles.menuInitial}>
                      {menu.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View style={styles.menuInfo}>
                  {menu.category && (
                    <Text style={styles.category}>{menu.category}</Text>
                  )}
                  <Text style={styles.menuName} numberOfLines={1}>
                    {menu.name}
                  </Text>
                  <Text style={styles.menuPrice}>{formatRupiah(menu.price)}</Text>
                </View>

                <View style={styles.quantityControl}>
                  <Pressable
                    style={[
                      styles.quantityButton,
                      quantity === 0 && styles.quantityButtonDisabled,
                    ]}
                    onPress={() => changeQuantity(menu.id, -1)}
                    disabled={quantity === 0}
                  >
                    <Text style={styles.quantityButtonText}>−</Text>
                  </Pressable>

                  <Text style={styles.quantity}>{quantity}</Text>

                  <Pressable
                    style={[styles.quantityButton, styles.plusButton]}
                    onPress={() => changeQuantity(menu.id, 1)}
                  >
                    <Text style={styles.plusText}>＋</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        {totalItems > 0 && (
          <View style={styles.orderDetail}>
            <Text style={styles.detailTitle}>Detail order</Text>
            {selectedMenus.map((menu) => {
              const quantity = quantities[menu.id] ?? 0;
              return (
                <View style={styles.detailRow} key={menu.id}>
                  <Text style={styles.detailName}>
                    {quantity}× {menu.name}
                  </Text>
                  <Text style={styles.detailPrice}>
                    {formatRupiah(menu.price * quantity)}
                  </Text>
                </View>
              );
            })}

            <Text style={styles.noteLabel}>Catatan order</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Opsional"
              placeholderTextColor="#655E70"
              maxLength={180}
              multiline
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.totalLabel}>{totalItems} PRODUK</Text>
          <Text style={styles.totalAmount}>{formatRupiah(orderTotal)}</Text>
        </View>

        <Pressable
          style={[
            styles.submitButton,
            (totalItems === 0 || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={totalItems === 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Simpan order</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 28 },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { color: '#FFFFFF', fontSize: 25, fontWeight: '800' },
  subtitle: { color: '#857E8E', fontSize: 12, marginTop: 5 },
  menuActions: { flexDirection: 'row', alignItems: 'center' },
  manageButton: {
    borderWidth: 1,
    borderColor: '#3B3148',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 7,
  },
  manageText: { color: '#BDB4C7', fontSize: 11, fontWeight: '800' },
  addMenuButton: {
    backgroundColor: '#2C1A40',
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  addMenuText: { color: '#C9A7FF', fontSize: 12, fontWeight: '800' },
  emptyCard: {
    borderWidth: 1,
    borderColor: '#332A40',
    borderStyle: 'dashed',
    borderRadius: 18,
    alignItems: 'center',
    padding: 28,
  },
  emptyIcon: { color: '#B98CFF', fontSize: 31 },
  emptyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 7 },
  emptyText: { color: '#817A89', fontSize: 12, marginTop: 6 },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15111D',
    borderWidth: 1,
    borderColor: '#2B2435',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
  },
  menuCardActive: { borderColor: '#7040AF', backgroundColor: '#1A1323' },
  menuImage: { width: 61, height: 61, borderRadius: 12 },
  menuImageFallback: { backgroundColor: '#2C1A40', alignItems: 'center', justifyContent: 'center' },
  menuInitial: { color: '#C9A7FF', fontSize: 22, fontWeight: '800' },
  menuInfo: { flex: 1, paddingHorizontal: 11 },
  category: { color: '#9D75DB', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  menuName: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginTop: 2 },
  menuPrice: { color: '#9C94A5', fontSize: 12, fontWeight: '600', marginTop: 5 },
  quantityControl: { flexDirection: 'row', alignItems: 'center' },
  quantityButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#28212F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonDisabled: { opacity: 0.35 },
  quantityButtonText: { color: '#D7CEDF', fontSize: 20, fontWeight: '600' },
  plusButton: { backgroundColor: '#7C3AED' },
  plusText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  quantity: { color: '#FFFFFF', width: 30, textAlign: 'center', fontSize: 15, fontWeight: '800' },
  orderDetail: {
    backgroundColor: '#15111D',
    borderWidth: 1,
    borderColor: '#2B2435',
    borderRadius: 17,
    padding: 17,
    marginTop: 12,
  },
  detailTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailName: { color: '#AAA2B3', fontSize: 13, flex: 1 },
  detailPrice: { color: '#E9E3F0', fontSize: 13, fontWeight: '700' },
  noteLabel: { color: '#9C94A5', fontSize: 11, fontWeight: '700', marginTop: 10, marginBottom: 7 },
  noteInput: {
    minHeight: 65,
    backgroundColor: '#0D0A12',
    borderWidth: 1,
    borderColor: '#332A40',
    borderRadius: 11,
    color: '#FFFFFF',
    fontSize: 13,
    padding: 12,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#100D16',
    borderTopWidth: 1,
    borderTopColor: '#2B2435',
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  totalLabel: { color: '#807888', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  totalAmount: { color: '#FFFFFF', fontSize: 19, fontWeight: '800', marginTop: 3 },
  submitButton: {
    minWidth: 132,
    minHeight: 47,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  submitButtonDisabled: { opacity: 0.4 },
  submitText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});

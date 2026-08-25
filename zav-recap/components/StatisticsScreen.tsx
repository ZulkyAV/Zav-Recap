import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type HourlySalesStat = {
  hour: number;
  revenue: number;
  orders: number;
  items: number;
};

type Props = {
  stats: HourlySalesStat[];
  refreshing: boolean;
  onRefresh: () => void;
};

function formatRupiah(value: number) {
  return 'Rp' + new Intl.NumberFormat('id-ID').format(value);
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}.00`;
}

export default function StatisticsScreen({ stats, refreshing, onRefresh }: Props) {
  const totalRevenue = stats.reduce((sum, stat) => sum + stat.revenue, 0);
  const totalOrders = stats.reduce((sum, stat) => sum + stat.orders, 0);
  const totalItems = stats.reduce((sum, stat) => sum + stat.items, 0);
  const maxRevenue = Math.max(...stats.map((stat) => stat.revenue), 1);
  const peak = stats.reduce<HourlySalesStat | null>((current, stat) => {
    if (!current || stat.revenue > current.revenue) return stat;
    return current;
  }, null);

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
      <Text style={styles.title}>Statistik hari ini</Text>
      <Text style={styles.subtitle}>Dari order pertama sampai order terakhir</Text>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, styles.cardGap]}>
          <Text style={styles.summaryLabel}>OMZET</Text>
          <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatRupiah(totalRevenue)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>TOTAL ORDER</Text>
          <Text style={styles.summaryValue}>{totalOrders}</Text>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, styles.cardGap]}>
          <Text style={styles.summaryLabel}>PRODUK LAKU</Text>
          <Text style={styles.summaryValue}>{totalItems}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>JAM TERAMAI</Text>
          <Text style={styles.summaryValue}>
            {peak && peak.revenue > 0 ? formatHour(peak.hour) : '—'}
          </Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>Omzet per jam</Text>
            <Text style={styles.chartSubtitle}>Nilai order berdasarkan waktu disimpan</Text>
          </View>
        </View>

        {stats.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>▥</Text>
            <Text style={styles.emptyTitle}>Belum ada statistik</Text>
            <Text style={styles.emptyText}>
              Simpan order pertama hari ini untuk memulai grafik.
            </Text>
          </View>
        ) : (
          stats.map((stat) => (
            <View style={styles.hourBlock} key={stat.hour}>
              <View style={styles.hourRow}>
                <Text style={styles.hourLabel}>{formatHour(stat.hour)}</Text>
                <View style={styles.barTrack}>
                  {stat.revenue > 0 ? (
                    <View
                      style={[
                        styles.barFill,
                        { flex: stat.revenue },
                      ]}
                    />
                  ) : null}
                  <View
                    style={{
                      flex: Math.max(maxRevenue - stat.revenue, 1),
                    }}
                  />
                </View>
                <Text style={styles.hourRevenue}>{formatRupiah(stat.revenue)}</Text>
              </View>
              <Text style={styles.hourMeta}>
                {stat.orders} order · {stat.items} produk
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Cara membaca statistik</Text>
        <Text style={styles.infoText}>
          Jam tanpa penjualan tetap ditampilkan jika berada di antara order pertama
          dan terakhir. Order yang dibatalkan otomatis hilang dari perhitungan.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 30 },
  title: { color: '#FFFFFF', fontSize: 25, fontWeight: '800' },
  subtitle: { color: '#857E8E', fontSize: 12, marginTop: 6, marginBottom: 20 },
  summaryGrid: { flexDirection: 'row', marginBottom: 11 },
  summaryCard: {
    flex: 1,
    minHeight: 91,
    justifyContent: 'space-between',
    backgroundColor: '#15111D',
    borderWidth: 1,
    borderColor: '#2B2435',
    borderRadius: 15,
    padding: 14,
  },
  cardGap: { marginRight: 11 },
  summaryLabel: { color: '#8F879A', fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  summaryValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  chartCard: {
    backgroundColor: '#15111D',
    borderWidth: 1,
    borderColor: '#2B2435',
    borderRadius: 17,
    padding: 16,
    marginTop: 3,
  },
  chartHeader: { marginBottom: 17 },
  chartTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  chartSubtitle: { color: '#7E7687', fontSize: 10, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 27 },
  emptyIcon: { color: '#A77AE8', fontSize: 27 },
  emptyTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginTop: 8 },
  emptyText: { color: '#817A89', fontSize: 11, textAlign: 'center', marginTop: 5 },
  hourBlock: { marginBottom: 15 },
  hourRow: { flexDirection: 'row', alignItems: 'center' },
  hourLabel: { color: '#BDB4C7', fontSize: 10, fontWeight: '700', width: 39 },
  barTrack: {
    flex: 1,
    height: 11,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#28212F',
    borderRadius: 6,
    marginHorizontal: 8,
  },
  barFill: { backgroundColor: '#7C3AED', borderRadius: 6 },
  hourRevenue: { color: '#E9E3F0', fontSize: 10, fontWeight: '700', width: 81, textAlign: 'right' },
  hourMeta: { color: '#706878', fontSize: 9, marginLeft: 47, marginTop: 5 },
  infoCard: {
    backgroundColor: '#100D16',
    borderWidth: 1,
    borderColor: '#292132',
    borderRadius: 15,
    padding: 16,
    marginTop: 13,
  },
  infoTitle: { color: '#D8D0E0', fontSize: 12, fontWeight: '800' },
  infoText: { color: '#827A8C', fontSize: 10, lineHeight: 16, marginTop: 6 },
});

import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { colors } from '../../theme/colors';
import { StatBox } from '../../components/StatBox';
import { JobCard } from '../../components/JobCard';
import { formatCurrency } from '../../utils/formatters';
import { JobStatus } from '../../types';

const COLUMNS: { status: JobStatus; label: string; color: string }[] = [
  { status: 'new', label: 'Ny', color: colors.statusNew },
  { status: 'in_progress', label: 'Pågår', color: colors.statusInProgress },
  { status: 'completed', label: 'Ferdig', color: colors.statusCompleted },
];

// Threshold for switching from swipe-tabs to side-by-side columns
const WIDE_BREAKPOINT = 640;

function KanbanColumn({
  label,
  color,
  jobs,
  flex,
  columnWidth,
}: {
  label: string;
  color: string;
  jobs: ReturnType<typeof useAppStore>['jobs'];
  flex?: number;
  columnWidth?: number;
}) {
  return (
    <View style={[styles.column, flex ? { flex } : { width: columnWidth }]}>
      <View style={[styles.columnHeader, { borderLeftColor: color }]}>
        <Text style={[styles.columnTitle, { color }]}>{label}</Text>
        <View style={[styles.columnBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.columnBadgeText, { color }]}>{jobs.length}</Text>
        </View>
      </View>
      {jobs.length === 0 ? (
        <View style={styles.emptyColumn}>
          <Ionicons name="checkmark-circle-outline" size={28} color={colors.border} />
          <Text style={styles.emptyText}>Ingen jobber</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(j) => j.id}
          renderItem={({ item }) => <JobCard job={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          scrollEnabled={flex != null} // only scroll inside columns in wide mode
        />
      )}
    </View>
  );
}

export function JobBoardScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const jobs = useAppStore((s) => s.jobs);
  const invoices = useAppStore((s) => s.invoices);
  const [activeColumn, setActiveColumn] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const COLUMN_WIDTH = width - 48;

  const todayStr = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const todayJobs = jobs.filter((j) => j.scheduledAt.startsWith(todayStr));
    const unpaidInvoices = invoices.filter((inv) => inv.status !== 'paid');
    const monthRevenue = invoices
      .filter((inv) => inv.status === 'paid' && inv.createdAt.startsWith(todayStr.slice(0, 7)))
      .reduce((sum, inv) => sum + inv.total, 0);
    return { todayJobs: todayJobs.length, unpaidInvoices: unpaidInvoices.length, monthRevenue };
  }, [jobs, invoices, todayStr]);

  const columns = useMemo(
    () => COLUMNS.map((col) => ({ ...col, jobs: jobs.filter((j) => j.status === col.status) })),
    [jobs]
  );

  const scrollToColumn = (index: number) => {
    setActiveColumn(index);
    scrollRef.current?.scrollTo({ x: index * (COLUMN_WIDTH + 16), animated: true });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Jobbtavle</Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('NewJob')}>
          <Ionicons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatBox label="Jobber i dag" value={String(stats.todayJobs)} color={colors.primary} />
        <StatBox label="Ubetalte fakturaer" value={String(stats.unpaidInvoices)} color={colors.warning} />
        <StatBox label="Inntekt denne mnd." value={formatCurrency(stats.monthRevenue)} color={colors.success} />
      </View>

      {isWide ? (
        /* ── WIDE: Three columns side by side ─────────────────────────── */
        <View style={styles.wideKanban}>
          {columns.map((col, i) => (
            <React.Fragment key={col.status}>
              <KanbanColumn label={col.label} color={col.color} jobs={col.jobs} flex={1} />
              {i < columns.length - 1 && <View style={styles.columnDivider} />}
            </React.Fragment>
          ))}
        </View>
      ) : (
        /* ── NARROW: Tab bar + horizontal swipe ───────────────────────── */
        <>
          <View style={styles.columnTabs}>
            {columns.map((col, index) => (
              <TouchableOpacity
                key={col.status}
                style={[
                  styles.columnTab,
                  activeColumn === index && { borderBottomColor: col.color, borderBottomWidth: 2 },
                ]}
                onPress={() => scrollToColumn(index)}
              >
                <Text
                  style={[
                    styles.columnTabText,
                    activeColumn === index && { color: col.color, fontWeight: '700' },
                  ]}
                >
                  {col.label}
                </Text>
                <View style={[styles.tabBadge, { backgroundColor: col.color + '20' }]}>
                  <Text style={[styles.tabBadgeText, { color: col.color }]}>{col.jobs.length}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            snapToInterval={COLUMN_WIDTH + 16}
            decelerationRate="fast"
            contentContainerStyle={[styles.swipeKanban, { paddingHorizontal: 16 }]}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / (COLUMN_WIDTH + 16));
              setActiveColumn(Math.max(0, Math.min(index, 2)));
            }}
          >
            {columns.map((col) => (
              <KanbanColumn
                key={col.status}
                label={col.label}
                color={col.color}
                jobs={col.jobs}
                columnWidth={COLUMN_WIDTH}
              />
            ))}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundSecondary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.white,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.textDark },
  subtitle: { fontSize: 13, color: colors.textGray, marginTop: 2 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  // Wide (desktop/tablet) three-column layout
  wideKanban: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 14,
    paddingHorizontal: 12,
    gap: 0,
  },
  columnDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },

  // Narrow (mobile) tab layout
  columnTabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  columnTab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  columnTabText: { fontSize: 13, color: colors.textGray, fontWeight: '500' },
  tabBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeText: { fontSize: 11, fontWeight: '700' },
  swipeKanban: { paddingVertical: 14, gap: 16 },

  // Shared column styles
  column: { paddingHorizontal: 8 },
  columnHeader: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  columnTitle: { fontSize: 15, fontWeight: '700' },
  columnBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  columnBadgeText: { fontSize: 11, fontWeight: '700' },
  emptyColumn: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 13, color: colors.textLight },
});

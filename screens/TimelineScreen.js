import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '../components/Common';
import { colors, spacing, fontSize, radius } from '../utils/theme';
import { getTimelineEntries, getControlVisitById, formatDateIndo, getTodayDateString } from '../utils/storage';

const FILTERS = [
  { key: 'semua', label: 'Semua' },
  { key: 'gejala', label: 'Gejala' },
  { key: 'kontrol', label: 'Kontrol' },
  { key: 'obat', label: 'Obat' },
  { key: 'jurnal', label: 'Jurnal' },
  { key: 'milestone', label: 'Milestone' },
];

const TYPE_CONFIG = {
  gejala: { icon: 'sad-outline', bg: '#FDF3E3', color: '#854F0B' },
  kontrol: { icon: 'pulse-outline', bg: '#E6F1FB', color: '#185FA5' },
  obat: { icon: 'medical-outline', bg: '#EBF2EC', color: '#2D5A3D' },
  jurnal: { icon: 'document-text-outline', bg: '#EAF3DE', color: '#3B6D11' },
  milestone: { icon: 'flag-outline', bg: '#FBF0F0', color: '#A32D2D' },
};

const BULAN_NAMA = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI_NAMA = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function TimelineScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  // Filter sekarang array - mendukung pilih lebih dari satu kategori sekaligus
  // Array kosong [] artinya "semua" (tidak ada filter aktif)
  const [activeFilters, setActiveFilters] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  const [visitResultsCache, setVisitResultsCache] = useState({}); // { refVisitId: visit }

  const loadData = useCallback(async () => {
    const data = await getTimelineEntries();
    setEntries(data);

    // Pre-fetch data kontrol untuk entri bertipe kontrol, supaya chip hasil pemeriksaan bisa ditampilkan
    const kontrolEntries = data.filter((e) => e.entryType === 'kontrol' && e.refVisitId);
    const cache = {};
    for (const entry of kontrolEntries) {
      if (!cache[entry.refVisitId]) {
        const visit = await getControlVisitById(entry.refVisitId);
        if (visit) cache[entry.refVisitId] = visit;
      }
    }
    setVisitResultsCache(cache);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Toggle satu kategori filter on/off (multi-select)
  const toggleFilter = (key) => {
    if (key === 'semua') {
      setActiveFilters([]);
      return;
    }
    setActiveFilters((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const filteredEntries = useMemo(() => {
    let result = entries;

    // Filter kategori - kalau ada filter aktif, entry harus match salah satu yang dipilih
    if (activeFilters.length > 0) {
      result = result.filter((e) => activeFilters.includes(e.entryType));
    }

    // Pencarian keyword - cari di judul, deskripsi, dan tag (case-insensitive)
    const keyword = searchKeyword.trim().toLowerCase();
    if (keyword) {
      result = result.filter((e) => {
        const inTitle = (e.title || '').toLowerCase().includes(keyword);
        const inDesc = (e.description || '').toLowerCase().includes(keyword);
        const inTags = (e.tags || []).some((t) => t.toLowerCase().includes(keyword));
        return inTitle || inDesc || inTags;
      });
    }

    return result;
  }, [entries, activeFilters, searchKeyword]);

  const handleEntryPress = (entry) => {
    if (entry.refVisitId) {
      navigation.navigate('DetailKontrol', { visitId: entry.refVisitId });
    } else if (entry.refStockHistoryId) {
      // Entri obat OTOMATIS (dari tambah botol) - hanya bisa dilihat lewat halaman Obat, tidak bisa diedit di sini
      navigation.navigate('Obat', { screen: 'DetailObat', params: { medicineId: entry.refMedicineId } });
    } else {
      // Entri manual (jurnal, gejala, milestone, atau "obat" yang dibuat manual) - bisa diedit langsung
      navigation.navigate('EditTimeline', { entryId: entry.id });
    }
  };

  const entriesByDate = useMemo(() => {
    const map = {};
    filteredEntries.forEach((e) => {
      if (!map[e.entryDate]) map[e.entryDate] = [];
      map[e.entryDate].push(e);
    });
    return map;
  }, [filteredEntries]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [calYear, calMonth]);

  const changeMonth = (delta) => {
    let newMonth = calMonth + delta;
    let newYear = calYear;
    if (newMonth < 0) { newMonth = 11; newYear -= 1; }
    if (newMonth > 11) { newMonth = 0; newYear += 1; }
    setCalMonth(newMonth);
    setCalYear(newYear);
    setSelectedDate(null);
  };

  const dateStringFor = (day) => {
    const m = String(calMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${calYear}-${m}-${d}`;
  };

  // Kelompokkan entri per bulan-tahun untuk ditampilkan dengan divider nama bulan di list
  const groupedByMonth = useMemo(() => {
    // Pakai Map agar SEMUA entri di bulan yang sama selalu tergabung dalam satu grup,
    // apa pun urutan kemunculannya di array (tidak bergantung pada entri berurutan rapi)
    const monthMap = new Map();
    filteredEntries.forEach((entry) => {
      const d = new Date(entry.entryDate);
      const sortKey = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      const label = `${BULAN_NAMA[d.getMonth()]} ${d.getFullYear()}`;
      if (!monthMap.has(sortKey)) {
        monthMap.set(sortKey, { monthLabel: label, sortKey, items: [] });
      }
      monthMap.get(sortKey).items.push(entry);
    });
    // Urutkan grup dari bulan terbaru ke terlama, konsisten dengan urutan list secara keseluruhan
    return Array.from(monthMap.values()).sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));
  }, [filteredEntries]);

  const selectedEntries = selectedDate ? (entriesByDate[selectedDate] || []) : [];
  const todayString = getTodayDateString();

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Timeline</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.viewToggleBtn}
            onPress={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
          >
            <Ionicons
              name={viewMode === 'list' ? 'calendar-outline' : 'list-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('TambahTimeline')}>
            <Ionicons name="add" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={searchKeyword}
          onChangeText={setSearchKeyword}
          placeholder="Cari judul, catatan, atau gejala..."
          placeholderTextColor={colors.textTertiary}
        />
        {searchKeyword.length > 0 && (
          <TouchableOpacity onPress={() => setSearchKeyword('')}>
            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {FILTERS.map((f) => {
          const isActive = f.key === 'semua' ? activeFilters.length === 0 : activeFilters.includes(f.key);
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTag, isActive && styles.filterTagActive]}
              onPress={() => toggleFilter(f.key)}
            >
              {isActive && f.key !== 'semua' && (
                <Ionicons name="checkmark" size={11} color={colors.green} style={{ marginRight: 2 }} />
              )}
              <Text style={[styles.filterTagText, isActive && styles.filterTagTextActive]} numberOfLines={1}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {viewMode === 'list' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {filteredEntries.length === 0 && (
            <Text style={styles.emptyText}>Belum ada catatan untuk kategori ini.</Text>
          )}

          {groupedByMonth.map((group, groupIdx) => (
            <View key={group.monthLabel}>
              <View style={styles.monthDivider}>
                <Text style={styles.monthDividerText}>{group.monthLabel}</Text>
              </View>
              {group.items.map((entry, idx) => {
                const config = TYPE_CONFIG[entry.entryType] || TYPE_CONFIG.jurnal;
                const isLastInGroup = idx === group.items.length - 1;
                const isLastGroup = groupIdx === groupedByMonth.length - 1;
                const isLast = isLastInGroup && isLastGroup;
                const visitData = entry.entryType === 'kontrol' && entry.refVisitId
                  ? visitResultsCache[entry.refVisitId]
                  : null;
                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.timelineItem}
                    onPress={() => handleEntryPress(entry)}
                  >
                    {!isLast && <View style={styles.timelineLine} />}
                    <View style={[styles.timelineDot, { backgroundColor: config.bg }]}>
                      <Ionicons name={config.icon} size={12} color={config.color} />
                    </View>
                    <View style={styles.timelineBody}>
                      <Text style={styles.timelineTitle}>{entry.title}</Text>
                      <Text style={styles.timelineDate}>
                        {formatDateIndo(entry.entryDate)} · {entry.entryType}
                      </Text>
                      {entry.description && (
                        <Text style={styles.timelineDesc}>{entry.description}</Text>
                      )}
                      {entry.tags && entry.tags.length > 0 && (
                        <View style={styles.tagRow}>
                          {entry.tags.map((tag, i) => (
                            <View key={i} style={styles.tagChip}>
                              <Text style={styles.tagChipText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {visitData && (visitData.bloodPressureSys || visitData.weight || visitData.viralLoad || visitData.cd4) && (
                        <View style={styles.tagRow}>
                          {visitData.bloodPressureSys && (
                            <View style={styles.tagChip}>
                              <Text style={styles.tagChipText}>Tensi {visitData.bloodPressureSys}/{visitData.bloodPressureDia}</Text>
                            </View>
                          )}
                          {visitData.weight && (
                            <View style={styles.tagChip}>
                              <Text style={styles.tagChipText}>Berat {visitData.weight}kg</Text>
                            </View>
                          )}
                          {visitData.viralLoad && (
                            <View style={styles.tagChip}>
                              <Text style={styles.tagChipText}>VL {visitData.viralLoad}</Text>
                            </View>
                          )}
                          {visitData.cd4 && (
                            <View style={styles.tagChip}>
                              <Text style={styles.tagChipText}>CD4 {visitData.cd4}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => changeMonth(-1)}>
              <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{BULAN_NAMA[calMonth]} {calYear}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)}>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {HARI_NAMA.map((h) => (
              <Text key={h} style={styles.weekDayLabel}>{h}</Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, idx) => {
              if (day === null) return <View key={`empty-${idx}`} style={styles.calCell} />;
              const dateStr = dateStringFor(day);
              const hasEntries = !!entriesByDate[dateStr];
              const isToday = dateStr === todayString;
              const isSelected = dateStr === selectedDate;
              return (
                <TouchableOpacity
                  key={dateStr}
                  style={styles.calCell}
                  onPress={() => setSelectedDate(isSelected ? null : dateStr)}
                >
                  <View
                    style={[
                      styles.calDayCircle,
                      isToday && styles.calDayToday,
                      isSelected && !isToday && styles.calDaySelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calDayText,
                        isToday && styles.calDayTextToday,
                        isSelected && !isToday && styles.calDayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                  {hasEntries && <View style={styles.calDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionHeading, { marginTop: spacing.lg }]}>
            {selectedDate ? formatDateIndo(selectedDate) : 'Ketuk tanggal untuk lihat catatan'}
          </Text>

          {selectedDate && selectedEntries.length === 0 && (
            <Text style={styles.emptyText}>Tidak ada catatan pada tanggal ini.</Text>
          )}

          {selectedEntries.map((entry) => {
            const config = TYPE_CONFIG[entry.entryType] || TYPE_CONFIG.jurnal;
            return (
              <TouchableOpacity
                key={entry.id}
                style={styles.calEntryCard}
                onPress={() => handleEntryPress(entry)}
              >
                <View style={[styles.timelineDot, { backgroundColor: config.bg }]}>
                  <Ionicons name={config.icon} size={12} color={config.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.timelineTitle}>{entry.title}</Text>
                  {entry.description && <Text style={styles.timelineDesc}>{entry.description}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.h1 - 4,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  viewToggleBtn: {
    padding: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.small,
    color: colors.textPrimary,
    paddingVertical: 9,
  },
  filterScroll: {
    flexGrow: 0,
    marginBottom: spacing.md,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 2,
    gap: spacing.xs,
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 0.5,
    borderColor: colors.border,
    marginRight: spacing.xs,
    flexShrink: 0,
  },
  filterTagActive: {
    backgroundColor: colors.greenBg,
    borderColor: colors.green,
  },
  filterTagText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    flexShrink: 0,
  },
  filterTagTextActive: {
    color: colors.green,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.small,
    color: colors.textTertiary,
  },
  sectionHeading: {
    fontSize: fontSize.body,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  monthDivider: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  monthDividerText: {
    fontSize: fontSize.caption,
    fontWeight: '500',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 11,
    top: 24,
    bottom: 0,
    width: 1,
    backgroundColor: colors.border,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timelineBody: {
    flex: 1,
    paddingTop: 1,
  },
  timelineTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timelineTitle: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  deleteIconBtn: {
    padding: 2,
    marginLeft: spacing.xs,
  },
  timelineDate: {
    fontSize: fontSize.caption,
    color: colors.textTertiary,
  },
  timelineDesc: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.xs,
  },
  tagChip: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagChipText: {
    fontSize: fontSize.caption - 1,
    color: colors.textSecondary,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthLabel: {
    fontSize: fontSize.h2 - 2,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekDayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.caption,
    color: colors.textTertiary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  calDayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayToday: {
    backgroundColor: colors.green,
  },
  calDaySelected: {
    backgroundColor: colors.greenBg,
    borderWidth: 1,
    borderColor: colors.green,
  },
  calDayText: {
    fontSize: fontSize.small,
    color: colors.textPrimary,
  },
  calDayTextToday: {
    color: colors.screenBg,
    fontWeight: '500',
  },
  calDayTextSelected: {
    color: colors.green,
    fontWeight: '500',
  },
  calDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.amber,
    marginTop: 2,
  },
  calEntryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.cardBgWhite,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});
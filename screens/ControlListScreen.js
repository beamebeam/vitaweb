import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper, Badge } from '../components/Common';
import { colors, spacing, fontSize, radius } from '../utils/theme';
import {
  getControlVisits,
  getUpcomingControlVisit,
  formatDateIndo,
  daysBetween,
  getTodayDateString,
} from '../utils/storage';

export default function ControlListScreen({ navigation }) {
  const [visits, setVisits] = useState([]);
  const [upcoming, setUpcoming] = useState(null);

  const loadData = useCallback(async () => {
    const data = await getControlVisits();
    setVisits(data);
    const up = await getUpcomingControlVisit();
    setUpcoming(up);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const todayString = getTodayDateString();
  const isTerlambat = upcoming?.status === 'terlambat';
  const isHariIni = upcoming?.status === 'hari_ini';

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kontrol</Text>
        <TouchableOpacity onPress={() => navigation.navigate('TambahKontrol')}>
          <Ionicons name="add" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ===== Card jadwal mendatang - dibuat menarik dan ter-highlight ===== */}
        <Text style={styles.sectionHeading}>Jadwal mendatang</Text>
        {!upcoming && (
          <TouchableOpacity
            style={styles.emptyUpcomingCard}
            onPress={() => navigation.navigate('TambahKontrol')}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.textTertiary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyUpcomingTitle}>Belum ada jadwal kontrol</Text>
              <Text style={styles.emptyUpcomingSub}>Ketuk untuk menambah jadwal pertama</Text>
            </View>
          </TouchableOpacity>
        )}

        {upcoming && (
          <View
            style={[
              styles.upcomingCard,
              isTerlambat && styles.upcomingCardDanger,
              isHariIni && styles.upcomingCardToday,
            ]}
          >
            <View style={styles.upcomingIconCircle}>
              <Ionicons
                name={isTerlambat ? 'alert-circle' : 'calendar'}
                size={22}
                color={isTerlambat ? colors.red : colors.green}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.upcomingLabel,
                  isHariIni && { color: colors.greenSoft },
                  isTerlambat && { color: colors.red },
                ]}
              >
                {isTerlambat ? 'Sudah lewat jadwal' : isHariIni ? 'Hari ini' : 'Jadwal berikutnya'}
              </Text>
              <Text
                style={[
                  styles.upcomingDate,
                  isHariIni && { color: colors.screenBg },
                  isTerlambat && { color: colors.red },
                ]}
              >
                {formatDateIndo(upcoming.date)}
              </Text>
              {isTerlambat && (
                <Text style={styles.upcomingOverdueText}>
                  Terlambat {Math.abs(daysBetween(upcoming.date, todayString))} hari — segera jadwalkan ulang
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ===== Section riwayat kunjungan - terpisah jelas dari jadwal mendatang ===== */}
        <Text style={[styles.sectionHeading, { marginTop: spacing.lg }]}>Riwayat kunjungan</Text>

        {visits.length === 0 && (
          <Text style={styles.emptyText}>Belum ada riwayat kontrol. Ketuk + untuk menambah.</Text>
        )}

        {visits.map((visit) => (
          <TouchableOpacity
            key={visit.id}
            style={styles.visitCard}
            onPress={() => navigation.navigate('DetailKontrol', { visitId: visit.id })}
          >
            <View style={styles.visitTop}>
              <View style={{ flex: 1 }}>
                <View style={styles.visitDateRow}>
                  <Text style={styles.visitDate}>{formatDateIndo(visit.visitDate)}</Text>
                  <Badge
                    text={visit.isCompleted ? 'Selesai' : 'Belum dilakukan'}
                    variant={visit.isCompleted ? 'green' : 'gray'}
                  />
                </View>
                <Text style={styles.visitSub}>
                  {visit.faskes || 'Faskes tidak diisi'}{visit.doctor ? ` · ${visit.doctor}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </View>

            {(visit.cd4 || visit.viralLoad || visit.bloodPressureSys || visit.weight) && (
              <View style={styles.vitalRow}>
                {visit.cd4 && <VitalPill label="CD4" value={`${visit.cd4} sel/mm³`} />}
                {visit.viralLoad && <VitalPill label="Viral load" value={`${visit.viralLoad}`} />}
                {visit.bloodPressureSys && (
                  <VitalPill label="Tensi" value={`${visit.bloodPressureSys}/${visit.bloodPressureDia}`} />
                )}
                {visit.weight && <VitalPill label="Berat" value={`${visit.weight} kg`} />}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScreenWrapper>
  );
}

function VitalPill({ label, value }) {
  return (
    <View style={styles.vitalPill}>
      <Text style={styles.vitalLabel}>{label}</Text>
      <Text style={styles.vitalValue}>{value}</Text>
    </View>
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
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sectionHeading: {
    fontSize: fontSize.body,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.small,
    color: colors.textTertiary,
  },

  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.greenBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.greenSoft,
  },
  upcomingCardToday: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  upcomingCardDanger: {
    backgroundColor: colors.redBg,
    borderColor: colors.red,
  },
  upcomingIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingLabel: {
    fontSize: fontSize.caption,
    fontWeight: '500',
    color: colors.green,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  upcomingDate: {
    fontSize: fontSize.h2,
    fontWeight: '500',
    color: colors.textPrimary,
    marginTop: 2,
  },
  upcomingOverdueText: {
    fontSize: fontSize.caption,
    color: colors.red,
    marginTop: 4,
  },
  emptyUpcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyUpcomingTitle: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  emptyUpcomingSub: {
    fontSize: fontSize.caption,
    color: colors.textTertiary,
    marginTop: 1,
  },

  visitCard: {
    backgroundColor: colors.cardBgWhite,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  visitTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  visitDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  visitDate: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  visitSub: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  visitActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionBtn: {
    padding: 4,
  },
  vitalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  vitalPill: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minWidth: '47%',
  },
  vitalLabel: {
    fontSize: fontSize.caption - 1,
    color: colors.textTertiary,
  },
  vitalValue: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});
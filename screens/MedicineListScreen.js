import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper, Badge } from '../components/Common';
import { colors, spacing, fontSize, radius } from '../utils/theme';
import { getMedicines } from '../utils/storage';

export default function MedicineListScreen({ navigation }) {
  const [medicines, setMedicines] = useState([]);

  const loadData = useCallback(async () => {
    const meds = await getMedicines();
    setMedicines(meds);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const activeMeds = medicines.filter((m) => m.isActive);
  const inactiveMeds = medicines.filter((m) => !m.isActive);

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Obat saya</Text>
        <TouchableOpacity onPress={() => navigation.navigate('TambahObat')}>
          <Ionicons name="add" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionHeading}>Stok & konsumsi</Text>

        {activeMeds.length === 0 && (
          <Text style={styles.emptyText}>Belum ada obat aktif. Ketuk + untuk menambah.</Text>
        )}

        {activeMeds.map((med) => {
          // Safety clamp: cegah data lama yang korup menampilkan sisa > total
          const stockRemainingClamped = Math.min(med.stockRemaining ?? 0, med.stockTotal ?? 0);
          const percent = med.stockTotal > 0 ? (stockRemainingClamped / med.stockTotal) * 100 : 0;
          const isLow = stockRemainingClamped <= 7;
          return (
            <TouchableOpacity
              key={med.id}
              style={styles.medCard}
              onPress={() => navigation.navigate('DetailObat', { medicineId: med.id })}
            >
              <View style={styles.medCardTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.medNameRow}>
                    <Text style={styles.medName}>{med.name}</Text>
                    {med.category === 'ARV' && <Badge text="ARV" variant="green" />}
                    {med.category === 'pendamping' && <Badge text="Pendamping" variant="gray" />}
                    {med.category === 'temporer' && <Badge text="Temporer" variant="amber" />}
                  </View>
                  <Text style={styles.medSub}>
                    {med.scheduleTime || 'Tanpa jam tetap'} · {med.mealRule}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.stockValue, { color: isLow ? colors.red : colors.textPrimary }]}>
                    {stockRemainingClamped}
                  </Text>
                  <Text style={[styles.stockLabel, { color: isLow ? colors.red : colors.textTertiary }]}>
                    tablet tersisa
                  </Text>
                </View>
              </View>

              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${percent}%`, backgroundColor: isLow ? colors.red : colors.amber },
                  ]}
                />
              </View>
            </TouchableOpacity>
          );
        })}

        {inactiveMeds.length > 0 && (
          <>
            <Text style={[styles.sectionHeading, { marginTop: spacing.lg }]}>Obat selesai</Text>
            {inactiveMeds.map((med) => (
              <TouchableOpacity
                key={med.id}
                style={styles.medCardInactive}
                onPress={() => navigation.navigate('DetailObat', { medicineId: med.id })}
              >
                <Text style={styles.medNameInactive}>{med.name}</Text>
                <Badge text="Selesai" variant="gray" />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
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
  medCard: {
    backgroundColor: colors.cardBgWhite,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  medCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  medNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  medName: {
    fontSize: fontSize.bodyLg,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  medSub: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stockValue: {
    fontSize: fontSize.h2,
    fontWeight: '500',
  },
  stockLabel: {
    fontSize: fontSize.caption,
  },
  progressBg: {
    height: 5,
    backgroundColor: colors.cardBg,
    borderRadius: radius.full,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  medCardInactive: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  medNameInactive: {
    fontSize: fontSize.bodyLg,
    color: colors.textSecondary,
  },
});
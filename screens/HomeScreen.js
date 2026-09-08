import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import Alert from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper, Badge } from '../components/Common';
import { TimePickerField } from '../components/DateTimeFields';
import { colors, spacing, fontSize, radius } from '../utils/theme';
import {
  getActiveMedicines,
  markMedicineTaken,
  unmarkMedicineTaken,
  getLogForToday,
  getTodayDateString,
  formatDateIndo,
  getUpcomingControlVisit,
  daysBetween,
  getProfile,
} from '../utils/storage';

// Data contoh untuk pertama kali user buka aplikasi
// Sapaan dinamis berdasarkan jam, menyertakan nama panggilan agar terasa personal
function getSapaan(nickname) {
  const hour = new Date().getHours();
  const nama = nickname ? `, ${nickname}` : '';
  if (hour < 11) return `Semoga harimu lancar${nama}`;
  if (hour < 15) return `Tetap semangat menjalani hari${nama}`;
  if (hour < 18) return `Semoga kamu sehat selalu${nama}`;
  return `Saatnya istirahat dan jaga diri${nama}`;
}

const STOCK_WARNING_THRESHOLD = 5;

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState([]);
  const [todayLogs, setTodayLogs] = useState({});
  const [upcomingVisit, setUpcomingVisit] = useState(null);
  const [profile, setProfile] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { medicine, jamInput }

  const todayString = getTodayDateString();

  const loadData = useCallback(async () => {
    const meds = await getActiveMedicines();
    setMedicines(meds);

    const logsMap = {};
    for (const med of meds) {
      const log = await getLogForToday(med.id, todayString);
      if (log) logsMap[med.id] = log;
    }
    setTodayLogs(logsMap);

    const upcoming = await getUpcomingControlVisit();
    setUpcomingVisit(upcoming);

    const p = await getProfile();
    setProfile(p);

    setLoading(false);
  }, [todayString]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleToggleTaken = async (medicine) => {
    const sudahDiminum = !!todayLogs[medicine.id];
    if (sudahDiminum) {
      // Batalkan langsung tanpa konfirmasi (ini cuma undo)
      try {
        await unmarkMedicineTaken(medicine.id, todayString);
        await loadData();
      } catch (e) {
        Alert.alert('Gagal', e.message || 'Terjadi kesalahan, coba lagi.');
      }
    } else {
      // Buka modal konfirmasi jam sebelum menandai sebagai diminum
      const now = new Date();
      const jamSekarang = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setConfirmModal({ medicine, jamInput: jamSekarang });
    }
  };

  const handleConfirmTaken = async () => {
    if (!confirmModal) return;
    const { medicine, jamInput } = confirmModal;

    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(jamInput)) {
      Alert.alert('Format jam salah', 'Gunakan format HH:MM, contoh 08:00 atau 21:30.');
      return;
    }

    try {
      await markMedicineTaken(medicine.id, medicine.scheduleTime, { takenAtTime: jamInput });
      setConfirmModal(null);
      await loadData();
    } catch (e) {
      Alert.alert('Gagal menyimpan', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  if (loading) {
    return (
      <ScreenWrapper style={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.green} />
      </ScreenWrapper>
    );
  }

  // ===== FIX BUG: progress bar sekarang dihitung dari checklist obat HARI INI =====
  // Sebelumnya progress bar memakai statistik bulanan yang tidak nyambung secara visual
  // dengan checklist di bawahnya. Sekarang keduanya konsisten.
  const totalObatHariIni = medicines.length;
  const sudahDiminumHariIni = medicines.filter((m) => !!todayLogs[m.id]).length;
  const persenHariIni = totalObatHariIni > 0
    ? Math.round((sudahDiminumHariIni / totalObatHariIni) * 100)
    : 0;

  const arvMedicines = medicines.filter((m) => m.category === 'ARV');
  // Safety clamp: jika ada data lama yang sempat korup (stockRemaining > stockTotal akibat bug lama),
  // jangan tampilkan angka yang membingungkan - batasi maksimal sebesar stockTotal-nya sendiri
  const stokArv = arvMedicines.reduce((sum, m) => sum + Math.min(m.stockRemaining ?? 0, m.stockTotal ?? 0), 0);
  const stokArvTotal = arvMedicines.reduce((sum, m) => sum + (m.stockTotal ?? 0), 0);
  // Warning aktif kalau SALAH SATU obat ARV sudah di bawah ambang batas
  const stokMenipis = arvMedicines.some((m) => m.stockRemaining <= STOCK_WARNING_THRESHOLD);
  const arvStokMenipisList = arvMedicines.filter((m) => m.stockRemaining <= STOCK_WARNING_THRESHOLD);

  const isKontrolTerlambat = upcomingVisit?.status === 'terlambat';
  const isKontrolHariIni = upcomingVisit?.status === 'hari_ini';
  const hariMenujuKontrol = upcomingVisit ? Math.abs(daysBetween(todayString, upcomingVisit.date)) : null;

  return (
    <ScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

        <View style={styles.header}>
          <View>
            <Text style={styles.dateText}>{formatDateIndo(todayString)}</Text>
            <Text style={styles.greetingText}>{getSapaan(profile?.nickname)}</Text>
          </View>
          <TouchableOpacity style={styles.bellButton}>
            <Ionicons name="notifications-outline" size={18} color={colors.green} />
          </TouchableOpacity>
        </View>

        {/* Warning stok ARV menipis - hanya muncul kalau <= 5 tablet */}
        {stokMenipis && (
          <View style={styles.warningBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.red} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>
                {arvStokMenipisList.length > 1 ? 'Beberapa obat ARV hampir habis' : 'Stok ARV hampir habis'}
              </Text>
              <Text style={styles.warningSub}>
                {arvStokMenipisList.map((m) => `${m.name} (${m.stockRemaining} tablet)`).join(', ')}
                {' '}— segera ambil obat baru
              </Text>
            </View>
          </View>
        )}

        {/* Hero card - sekarang merefleksikan checklist obat HARI INI, bukan statistik bulanan */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Obat hari ini</Text>
          <View style={styles.heroValueRow}>
            <Text style={styles.heroValue}>{sudahDiminumHariIni}/{totalObatHariIni}</Text>
            <Text style={styles.heroSub}>
              {persenHariIni === 100 ? 'Semua sudah diminum' : `${persenHariIni}% selesai hari ini`}
            </Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${persenHariIni}%` }]} />
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Stok ARV</Text>
            <Text style={[styles.statValue, { color: stokMenipis ? colors.red : colors.amber }]}>
              {stokArv}/{stokArvTotal}
            </Text>
            <Text style={[styles.statNote, stokMenipis && { color: colors.red }]}>
              sisa {stokArv} dari {stokArvTotal}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Kontrol</Text>
            <Text
              style={[
                styles.statValue,
                { color: isKontrolTerlambat ? colors.red : isKontrolHariIni ? colors.green : colors.green },
              ]}
            >
              {hariMenujuKontrol !== null
                ? (isKontrolHariIni ? 'Hari ini' : hariMenujuKontrol)
                : '-'}
            </Text>
            <Text style={[styles.statNote, isKontrolTerlambat && { color: colors.red }]}>
              {hariMenujuKontrol === null
                ? 'belum ada jadwal'
                : isKontrolTerlambat
                ? `terlambat ${hariMenujuKontrol} hari`
                : isKontrolHariIni
                ? 'jangan lupa kontrol'
                : 'hari lagi'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Obat hari ini</Text>
        {medicines.length === 0 && (
          <Text style={styles.emptyText}>Belum ada obat. Tambahkan di tab Obat.</Text>
        )}
        {medicines.map((obat) => {
          const sudahDiminum = !!todayLogs[obat.id];
          return (
            <View key={obat.id} style={styles.medItem}>
              <View style={[styles.medIcon, { backgroundColor: sudahDiminum ? colors.greenBg : colors.cardBg }]}>
                <Ionicons name="medical-outline" size={16} color={sudahDiminum ? colors.green : colors.textTertiary} />
              </View>
              <View style={styles.medInfo}>
                <View style={styles.medNameRow}>
                  <Text style={styles.medName}>{obat.name}</Text>
                  {obat.category === 'ARV' && <Badge text="ARV" variant="green" />}
                  {obat.category === 'pendamping' && <Badge text="Pendamping" variant="gray" />}
                  {obat.category === 'temporer' && <Badge text="Temporer" variant="amber" />}
                </View>
                <Text style={styles.medSub}>{obat.scheduleTime || 'Tanpa jam tetap'} · {obat.mealRule}</Text>
              </View>
              <TouchableOpacity
                style={[styles.medCheck, { backgroundColor: sudahDiminum ? colors.greenBg : colors.cardBg }]}
                onPress={() => handleToggleTaken(obat)}
              >
                <Ionicons name="checkmark" size={14} color={sudahDiminum ? colors.green : '#D1D5DB'} />
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Section terpisah untuk jadwal kontrol, judul konsisten dengan "Obat hari ini" */}
        <Text style={styles.sectionHeading}>Jadwal kontrol</Text>
        {(() => {
          if (!upcomingVisit) {
            // State kosong: belum ada jadwal kontrol sama sekali
            return (
              <TouchableOpacity
                style={styles.kontrolBannerEmpty}
                onPress={() => navigation.navigate('Kontrol', { screen: 'TambahKontrol' })}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textTertiary} />
                <View style={styles.kontrolInfo}>
                  <Text style={styles.kontrolTitleEmpty}>Belum ada jadwal kontrol</Text>
                  <Text style={styles.kontrolSubEmpty}>Ketuk untuk menambah jadwal</Text>
                </View>
                <Ionicons name="add-circle-outline" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            );
          }

          const isTerlambat = upcomingVisit.status === 'terlambat';
          const isHariIni = upcomingVisit.status === 'hari_ini';

          const bannerStyle = isTerlambat
            ? styles.kontrolBannerDanger
            : isHariIni
            ? styles.kontrolBannerToday
            : styles.kontrolBanner;

          const titleText = isTerlambat
            ? 'Jadwal kontrol terlewat'
            : isHariIni
            ? 'Kontrol hari ini'
            : 'Kontrol berikutnya';

          const iconColor = isTerlambat ? colors.red : isHariIni ? colors.screenBg : colors.green;
          const iconName = isTerlambat ? 'alert-circle' : 'calendar-outline';
          const textColor = isTerlambat ? colors.red : isHariIni ? colors.screenBg : colors.textPrimary;
          const subColor = isTerlambat ? colors.red : isHariIni ? colors.greenSoft : colors.green;

          return (
            <TouchableOpacity
              style={bannerStyle}
              onPress={() => navigation.navigate('Kontrol', { screen: 'DaftarKontrol' })}
            >
              <Ionicons name={iconName} size={18} color={iconColor} />
              <View style={styles.kontrolInfo}>
                <Text style={[styles.kontrolTitle, { color: textColor }]}>
                  {titleText}
                </Text>
                <Text style={[styles.kontrolSub, { color: subColor }]}>
                  {formatDateIndo(upcomingVisit.date)}
                  {isTerlambat && ` · terlambat ${Math.abs(daysBetween(upcomingVisit.date, todayString))} hari`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={iconColor} />
            </TouchableOpacity>
          );
        })()}

      </ScrollView>

      <Modal visible={!!confirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Konfirmasi minum obat</Text>
            <Text style={styles.modalSub}>
              {confirmModal?.medicine.name}
              {confirmModal?.medicine.scheduleTime ? ` · terjadwal ${confirmModal.medicine.scheduleTime}` : ' · tanpa jam tetap'}
            </Text>
            <Text style={styles.modalFieldLabel}>Jam diminum</Text>
            <TimePickerField
              value={confirmModal?.jamInput}
              onChange={(jam) => setConfirmModal((prev) => ({ ...prev, jamInput: jam }))}
              placeholder="Pilih jam"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setConfirmModal(null)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleConfirmTaken}>
                <Text style={styles.modalSaveText}>Konfirmasi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dateText: {
    fontSize: fontSize.caption,
    color: colors.textTertiary,
  },
  greetingText: {
    fontSize: fontSize.h1 - 4,
    fontWeight: '500',
    color: colors.textPrimary,
    marginTop: 2,
  },
  bellButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.greenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.redBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningTitle: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.red,
  },
  warningSub: {
    fontSize: fontSize.caption,
    color: colors.red,
    marginTop: 1,
  },
  heroCard: {
    backgroundColor: colors.green,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroLabel: {
    fontSize: fontSize.caption,
    color: colors.greenSoft,
    marginBottom: 4,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  heroValue: {
    fontSize: fontSize.hero,
    fontWeight: '500',
    color: colors.screenBg,
  },
  heroSub: {
    fontSize: fontSize.small,
    color: colors.greenSoft,
  },
  progressBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    marginTop: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.greenSoft,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  statLabel: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  statValue: {
    fontSize: fontSize.h1 - 2,
    fontWeight: '500',
  },
  statNote: {
    fontSize: fontSize.caption,
    color: colors.textTertiary,
    marginTop: 1,
  },
  sectionHeading: {
    fontSize: fontSize.body,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.small,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  medItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardBgWhite,
    borderRadius: radius.lg,
    padding: 11,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  medIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medInfo: {
    flex: 1,
  },
  medNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  medName: {
    fontSize: fontSize.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  medSub: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  medCheck: {
    width: 28,
    height: 28,
    borderRadius: radius.sm + 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kontrolBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.greenBg,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  kontrolBannerToday: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.green,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  kontrolBannerDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.redBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.red,
  },
  kontrolBannerEmpty: {
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
  kontrolTitleEmpty: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  kontrolSubEmpty: {
    fontSize: fontSize.caption,
    color: colors.textTertiary,
    marginTop: 1,
  },
  kontrolInfo: {
    flex: 1,
  },
  kontrolTitle: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  kontrolSub: {
    fontSize: fontSize.caption,
    color: colors.green,
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.screenBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
  },
  modalTitle: {
    fontSize: fontSize.h2,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalFieldLabel: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  modalInput: {
    backgroundColor: colors.cardBg,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    fontSize: fontSize.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.small,
  },
  modalSaveBtn: {
    flex: 1,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.green,
    alignItems: 'center',
  },
  modalSaveText: {
    color: colors.screenBg,
    fontSize: fontSize.small,
    fontWeight: '500',
  },
});
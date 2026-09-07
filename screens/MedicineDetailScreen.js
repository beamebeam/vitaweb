import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper, ScreenHeader, Badge, Card } from '../components/Common';
import { DatePickerField, TimePickerField, FieldLabel } from '../components/DateTimeFields';
import { colors, spacing, fontSize, radius } from '../utils/theme';
import {
  getMedicineById,
  getLogsForBottle,
  getOrphanLogsForMedicine,
  getStockHistoryForMedicine,
  addNewStock,
  updateStockHistoryEntry,
  deleteStockHistoryEntry,
  addManualMedicineLog,
  markMedicineTaken,
  updateMedicineLog,
  deleteMedicineLog,
  deactivateMedicine,
  restoreMedicine,
  deleteMedicine,
  formatDateIndo,
  formatDateShortIndo,
  formatDoseText,
  getTodayDateString,
  calculateMinutesDiff,
} from '../utils/storage';
import { rescheduleAllMedicineReminders } from '../utils/notifications';

function getKeteranganWaktu(log) {
  const diff = calculateMinutesDiff(log.scheduledTime, log.takenAtTime);
  if (Math.abs(diff) <= 30) return 'Tepat waktu';

  const absDiff = Math.abs(diff);
  const hours = Math.floor(absDiff / 60);
  const minutes = absDiff % 60;
  let durasi;
  if (hours > 0 && minutes > 0) {
    durasi = `${hours} jam ${minutes} menit`;
  } else if (hours > 0) {
    durasi = `${hours} jam`;
  } else {
    durasi = `${minutes} menit`;
  }

  return diff > 30 ? `Terlambat ${durasi}` : `Lebih awal ${durasi}`;
}

export default function MedicineDetailScreen({ route, navigation }) {
  const { medicineId } = route.params;
  const [medicine, setMedicine] = useState(null);
  const [stockHistory, setStockHistory] = useState([]);
  const [expandedBottle, setExpandedBottle] = useState(null);
  const [bottleLogs, setBottleLogs] = useState({});
  const [orphanLogs, setOrphanLogs] = useState([]);
  const [expandedOrphan, setExpandedOrphan] = useState(false);

  const [showAddStock, setShowAddStock] = useState(false);
  const [newStockAmount, setNewStockAmount] = useState('30');
  const [newStockStartDate, setNewStockStartDate] = useState(getTodayDateString());

  const [editingBottle, setEditingBottle] = useState(null); // { id, editStartDate, editAmount }

  const [showManualLog, setShowManualLog] = useState(false);
  const [manualDate, setManualDate] = useState(getTodayDateString());
  const [manualTime, setManualTime] = useState('');

  const [editingLog, setEditingLog] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  const loadData = useCallback(async () => {
    const med = await getMedicineById(medicineId);
    setMedicine(med);
    const history = await getStockHistoryForMedicine(medicineId);
    setStockHistory(history);

    const orphans = await getOrphanLogsForMedicine(medicineId);
    setOrphanLogs(orphans);

    if (expandedBottle !== null) {
      const logsForThisBottle = await getLogsForBottle(medicineId, expandedBottle);
      setBottleLogs((prev) => ({ ...prev, [expandedBottle]: logsForThisBottle }));
    }
  }, [medicineId, expandedBottle]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleOpenAddStock = () => {
    setNewStockAmount('30');
    setNewStockStartDate(getTodayDateString());
    setShowAddStock(true);
  };

  const handleAddStock = async () => {
    const amount = parseInt(newStockAmount, 10);
    if (!amount || amount <= 0) {
      Alert.alert('Jumlah tidak valid', 'Masukkan jumlah tablet yang benar.');
      return;
    }
    if (!newStockStartDate) {
      Alert.alert('Tanggal kosong', 'Pilih tanggal mulai botol ini.');
      return;
    }
    try {
      await addNewStock(medicineId, amount, newStockStartDate);
      setShowAddStock(false);
      await loadData();
    } catch (e) {
      Alert.alert('Gagal menyimpan', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  // Tombol "Minum sekarang" - selalu pakai tanggal HARI INI (sesuai aturan baru)
  const handleQuickTaken = async () => {
    try {
      await markMedicineTaken(medicineId, medicine.scheduleTime);
      await loadData();
    } catch (e) {
      Alert.alert('Gagal menyimpan', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  const handleOpenManualLog = () => {
    setManualDate(getTodayDateString());
    setManualTime(medicine.scheduleTime || '');
    setShowManualLog(true);
  };

  const handleSaveManualLog = async () => {
    if (!manualDate) {
      Alert.alert('Tanggal kosong', 'Pilih tanggal minum obat.');
      return;
    }
    if (!manualTime) {
      Alert.alert('Jam kosong', 'Pilih jam minum obat.');
      return;
    }
    try {
      // bottleNumber tidak perlu dipilih - otomatis dicari dari rentang tanggal botol yang sesuai
      await addManualMedicineLog(medicineId, medicine.scheduleTime, manualDate, manualTime);
      setShowManualLog(false);
      await loadData();
    } catch (e) {
      Alert.alert('Gagal menyimpan', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  const handleOpenEditLog = (log) => {
    setEditingLog({ ...log, editDate: log.date, editTime: log.takenAtTime });
  };

  const handleSaveEditLog = async () => {
    if (!editingLog.editDate || !editingLog.editTime) {
      Alert.alert('Data tidak lengkap', 'Tanggal dan jam wajib diisi.');
      return;
    }
    try {
      await updateMedicineLog(editingLog.id, {
        dateString: editingLog.editDate,
        takenAtTime: editingLog.editTime,
      });
      setEditingLog(null);
      await loadData();
    } catch (e) {
      Alert.alert('Gagal menyimpan', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  const handleDeleteLog = (log) => {
    Alert.alert(
      'Hapus log ini?',
      `Log minum pada ${formatDateIndo(log.date)} jam ${log.takenAtTime} akan dihapus. Stok akan dihitung ulang otomatis.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMedicineLog(log.id);
              await loadData();
            } catch (e) {
              Alert.alert('Gagal menghapus', e.message || 'Terjadi kesalahan, coba lagi.');
            }
          },
        },
      ]
    );
  };

  const handleOpenEditBottle = (bottle) => {
    setEditingBottle({ id: bottle.id, editStartDate: bottle.startDate, editAmount: String(bottle.amount) });
  };

  const handleSaveEditBottle = async () => {
    const amount = parseInt(editingBottle.editAmount, 10);
    if (!amount || amount <= 0) {
      Alert.alert('Jumlah tidak valid', 'Masukkan jumlah tablet yang benar.');
      return;
    }
    if (!editingBottle.editStartDate) {
      Alert.alert('Tanggal kosong', 'Pilih tanggal mulai botol ini.');
      return;
    }
    try {
      await updateStockHistoryEntry(editingBottle.id, {
        startDate: editingBottle.editStartDate,
        amount,
      });
      setEditingBottle(null);
      await loadData();
    } catch (e) {
      Alert.alert('Gagal menyimpan', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  const handleDeleteBottle = () => {
    Alert.alert(
      'Hapus botol ini?',
      'Riwayat botol ini akan terhapus. Log minum yang sudah tercatat di rentang tanggalnya TIDAK ikut terhapus, tapi nomor botolnya mungkin berubah karena urutan dihitung ulang.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStockHistoryEntry(editingBottle.id);
              setEditingBottle(null);
              await loadData();
            } catch (e) {
              Alert.alert('Gagal menghapus', e.message || 'Terjadi kesalahan, coba lagi.');
            }
          },
        },
      ]
    );
  };

  const handleMarkFinished = () => {
    Alert.alert(
      'Tandai obat selesai?',
      `${medicine.name} akan dipindahkan ke daftar obat selesai. Kamu masih bisa melihat riwayatnya, dan bisa mengaktifkan kembali kapan saja.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, selesai',
          onPress: async () => {
            await deactivateMedicine(medicineId);
            try { await rescheduleAllMedicineReminders(); } catch (e) {}
            await loadData();
          },
        },
      ]
    );
  };

  const handleRestore = () => {
    Alert.alert(
      'Aktifkan kembali obat ini?',
      `${medicine.name} akan kembali muncul di daftar obat aktif dan checklist harian.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, aktifkan',
          onPress: async () => {
            await restoreMedicine(medicineId);
            try { await rescheduleAllMedicineReminders(); } catch (e) {}
            await loadData();
          },
        },
      ]
    );
  };

  const handleOpenDeleteConfirm = () => {
    setDeleteConfirmInput('');
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    const today = getTodayDateString();
    if (deleteConfirmInput.trim() !== today) {
      Alert.alert('Konfirmasi tidak cocok', `Ketik tanggal hari ini (${today}) dengan benar untuk menghapus.`);
      return;
    }
    try {
      await deleteMedicine(medicineId);
      try { await rescheduleAllMedicineReminders(); } catch (e) {}
      setShowDeleteConfirm(false);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Gagal menghapus', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  const handleToggleBottle = async (bottleNumber) => {
    if (expandedBottle === bottleNumber) {
      setExpandedBottle(null);
      return;
    }
    setExpandedBottle(bottleNumber);
    const logsForThisBottle = await getLogsForBottle(medicineId, bottleNumber);
    setBottleLogs((prev) => ({ ...prev, [bottleNumber]: logsForThisBottle }));
  };

  if (!medicine) {
    return (
      <ScreenWrapper>
        <ScreenHeader title="Memuat..." onBack={() => navigation.goBack()} />
      </ScreenWrapper>
    );
  }

  const stockRemaining = medicine.stockRemaining ?? 0;
  const stockTotal = medicine.stockTotal ?? 0;
  const percent = stockTotal > 0 ? Math.min(100, Math.max(0, (stockRemaining / stockTotal) * 100)) : 0;
  const isStockLow = stockRemaining <= 5;

  // Botol yang sedang berjalan = botol terakhir berdasarkan urutan tanggal (yang paling baru dimulai)
  const currentBottle = stockHistory[stockHistory.length - 1];

  return (
    <ScreenWrapper>
      <ScreenHeader title={medicine.name} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.tagRow}>
          {medicine.category === 'ARV' && <Badge text="ARV" variant="green" />}
          {medicine.category === 'pendamping' && <Badge text="Obat pendamping" variant="gray" />}
          {medicine.category === 'temporer' && <Badge text="Temporer" variant="amber" />}
          <Badge text={medicine.isActive ? 'Aktif' : 'Selesai'} variant={medicine.isActive ? 'green' : 'gray'} />
        </View>

        {!medicine.isActive && (
          <View style={styles.inactiveBanner}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.inactiveBannerText}>
              Obat ini sudah ditandai selesai. Riwayat tetap tersimpan dan bisa diaktifkan kembali di bagian bawah halaman.
            </Text>
          </View>
        )}

        <Card style={{ marginBottom: spacing.md }}>
          <InfoRow label="Jam minum" value={medicine.scheduleTime || 'Tidak ditentukan'} />
          <InfoRow label="Aturan makan" value={medicine.mealRule} />
          <InfoRow
            label="Dosis"
            value={formatDoseText(medicine.doseAmount, medicine.frequencyUnit)}
            last={!medicine.notes}
          />
          {medicine.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Catatan</Text>
              <Text style={styles.notesText}>{medicine.notes}</Text>
            </View>
          ) : null}
        </Card>

        {medicine.isActive && (
          <>
            <Text style={styles.sectionHeading}>Stok saat ini</Text>
            <Card style={{ marginBottom: spacing.md }}>
              <View style={styles.stockTopRow}>
                <View>
                  <Text style={styles.miniLabel}>Botol ke-{currentBottle?.bottleNumber || 1}</Text>
                  <Text style={styles.miniValue}>
                    {currentBottle
                      ? `${formatDateShortIndo(currentBottle.startDate)} → ${formatDateShortIndo(currentBottle.endDateCalculated)}`
                      : '-'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.stockBigValue, { color: isStockLow ? colors.red : colors.textPrimary }]}>
                    {stockRemaining}/{stockTotal}
                  </Text>
                  <Text style={[styles.miniLabel, isStockLow && { color: colors.red }]}>total tablet tersisa</Text>
                </View>
              </View>
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${percent}%`, backgroundColor: isStockLow ? colors.red : colors.amber },
                  ]}
                />
              </View>
              <TouchableOpacity style={styles.addStockButton} onPress={handleOpenAddStock}>
                <Ionicons name="add-circle-outline" size={16} color={colors.green} />
                <Text style={styles.addStockButtonText}>Dapat obat baru (tambah botol)</Text>
              </TouchableOpacity>
            </Card>

            <View style={styles.quickActionRow}>
              <TouchableOpacity style={styles.quickActionPrimary} onPress={handleQuickTaken}>
                <Ionicons name="checkmark-circle" size={16} color={colors.screenBg} />
                <Text style={styles.quickActionPrimaryText}>Minum sekarang</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionSecondary} onPress={handleOpenManualLog}>
                <Ionicons name="create-outline" size={16} color={colors.textPrimary} />
                <Text style={styles.quickActionSecondaryText}>Catat manual</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: spacing.lg }} />
          </>
        )}

        <Text style={styles.sectionHeading}>Riwayat botol & log minum</Text>
        <Text style={styles.sectionSubNote}>Ketuk botol untuk lihat log · ketuk ikon pensil untuk edit tanggal/jumlah</Text>

        {stockHistory.length === 0 && (
          <Card>
            <Text style={styles.emptyText}>Belum ada riwayat botol.</Text>
          </Card>
        )}

        <Card style={{ padding: 0, marginBottom: spacing.lg }}>
          {stockHistory.map((h, idx) => {
            const isExpanded = expandedBottle === h.bottleNumber;
            const logsInBottle = bottleLogs[h.bottleNumber] || [];
            const isCurrentBottle = idx === stockHistory.length - 1;
            return (
              <View key={h.id}>
                <View
                  style={[styles.historyRow, idx === stockHistory.length - 1 && !isExpanded && { borderBottomWidth: 0 }]}
                >
                  <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => handleToggleBottle(h.bottleNumber)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>
                        Botol ke-{h.bottleNumber} <Text style={styles.historyStatusInline}>· {isCurrentBottle ? 'Sedang berjalan' : 'Selesai'}</Text>
                      </Text>
                      <Text style={styles.historySub}>
                        {formatDateShortIndo(h.startDate)} → {formatDateShortIndo(h.endDateCalculated)} · {h.amount} tablet
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleOpenEditBottle(h)} style={styles.logIconBtn}>
                    <Ionicons name="pencil-outline" size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>

                {isExpanded && (
                  <View style={styles.bottleLogContainer}>
                    {logsInBottle.length === 0 && (
                      <Text style={styles.emptyTextSmall}>Belum ada log minum di botol ini.</Text>
                    )}
                    {logsInBottle.map((log) => {
                      return (
                        <View key={log.id} style={styles.bottleLogRow}>
                          <View
                            style={[
                              styles.logDot,
                              { backgroundColor: log.status === 'tepat' ? colors.green : colors.amber },
                            ]}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.bottleLogText}>
                              {formatDateIndo(log.date)} · {log.takenAtTime}
                            </Text>
                            <Text style={styles.bottleLogSub}>{getKeteranganWaktu(log)}</Text>
                          </View>
                          <TouchableOpacity onPress={() => handleOpenEditLog(log)} style={styles.logIconBtn}>
                            <Ionicons name="pencil-outline" size={13} color={colors.textTertiary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteLog(log)} style={styles.logIconBtn}>
                            <Ionicons name="trash-outline" size={13} color={colors.textTertiary} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </Card>

        {orphanLogs.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>Riwayat terpisah</Text>
            <Text style={styles.sectionSubNote}>
              Log minum dengan tanggal di luar rentang botol manapun yang tercatat
            </Text>
            <Card style={{ padding: 0, marginBottom: spacing.lg }}>
              <TouchableOpacity
                style={[styles.historyRow, !expandedOrphan && { borderBottomWidth: 0 }]}
                onPress={() => setExpandedOrphan(!expandedOrphan)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>{orphanLogs.length} log di luar rentang botol</Text>
                  <Text style={styles.historySub}>Ketuk untuk lihat detail</Text>
                </View>
                <Ionicons
                  name={expandedOrphan ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
              {expandedOrphan && (
                <View style={styles.bottleLogContainer}>
                  {orphanLogs.map((log) => (
                    <View key={log.id} style={styles.bottleLogRow}>
                      <View style={[styles.logDot, { backgroundColor: log.status === 'tepat' ? colors.green : colors.amber }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bottleLogText}>
                          {formatDateIndo(log.date)} · {log.takenAtTime}
                        </Text>
                        <Text style={styles.bottleLogSub}>{getKeteranganWaktu(log)}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleOpenEditLog(log)} style={styles.logIconBtn}>
                        <Ionicons name="pencil-outline" size={13} color={colors.textTertiary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteLog(log)} style={styles.logIconBtn}>
                        <Ionicons name="trash-outline" size={13} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          </>
        )}

        <Text style={styles.sectionHeading}>Kelola obat ini</Text>
        <Card style={{ padding: 0, marginBottom: spacing.xl }}>
          <TouchableOpacity
            style={styles.manageRow}
            onPress={() => navigation.navigate('EditObat', { medicineId })}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.manageRowText}>Edit informasi obat</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {medicine.isActive ? (
            <TouchableOpacity style={styles.manageRow} onPress={handleMarkFinished}>
              <Ionicons name="checkmark-done-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.manageRowText}>Tandai obat ini selesai</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.manageRow} onPress={handleRestore}>
              <Ionicons name="refresh-outline" size={18} color={colors.green} />
              <Text style={[styles.manageRowText, { color: colors.green }]}>Aktifkan kembali obat ini</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.green} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.manageRow, { borderBottomWidth: 0 }]}
            onPress={handleOpenDeleteConfirm}
          >
            <Ionicons name="trash-outline" size={18} color={colors.red} />
            <Text style={[styles.manageRowText, { color: colors.red }]}>Hapus obat ini permanen</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.red} />
          </TouchableOpacity>
        </Card>
      </ScrollView>

      {/* Modal: Dapat obat baru - sekarang dengan tanggal mulai bisa diisi manual */}
      <Modal visible={showAddStock} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Dapat obat baru</Text>
            <Text style={styles.modalSub}>
              Pilih tanggal mulai botol ini sebenarnya - bisa hari ini atau tanggal lampau untuk mengisi riwayat lama.
            </Text>
            <FieldLabel required>Jumlah tablet</FieldLabel>
            <TextInput
              style={[styles.modalInput, { marginBottom: spacing.md }]}
              value={newStockAmount}
              onChangeText={setNewStockAmount}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor={colors.textTertiary}
            />
            <DatePickerField
              label="Tanggal mulai botol ini"
              required
              value={newStockStartDate}
              onChange={setNewStockStartDate}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddStock(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddStock}>
                <Text style={styles.modalSaveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Edit botol - ubah tanggal mulai dan/atau jumlah tablet */}
      <Modal visible={!!editingBottle} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit botol</Text>
            <Text style={styles.modalSub}>
              Mengubah tanggal mulai atau jumlah akan menghitung ulang rentang tanggal botol ini dan total stok obat.
            </Text>
            {editingBottle && (
              <>
                <FieldLabel required>Jumlah tablet</FieldLabel>
                <TextInput
                  style={[styles.modalInput, { marginBottom: spacing.md }]}
                  value={editingBottle.editAmount}
                  onChangeText={(v) => setEditingBottle((prev) => ({ ...prev, editAmount: v }))}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={colors.textTertiary}
                />
                <DatePickerField
                  label="Tanggal mulai"
                  required
                  value={editingBottle.editStartDate}
                  onChange={(d) => setEditingBottle((prev) => ({ ...prev, editStartDate: d }))}
                />
              </>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditingBottle(null)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveEditBottle}>
                <Text style={styles.modalSaveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.deleteBottleBtn} onPress={handleDeleteBottle}>
              <Ionicons name="trash-outline" size={14} color={colors.red} />
              <Text style={styles.deleteBottleBtnText}>Hapus botol ini</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Catat minum manual - botol otomatis, tidak perlu dipilih lagi */}
      <Modal visible={showManualLog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Catat minum obat</Text>
            <Text style={styles.modalSub}>
              Untuk mencatat obat yang sudah diminum sebelumnya. Botol akan ditentukan otomatis berdasarkan tanggal.
            </Text>
            <DatePickerField label="Tanggal" required value={manualDate} onChange={setManualDate} />
            <TimePickerField label="Jam diminum" required value={manualTime} onChange={setManualTime} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowManualLog(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveManualLog}>
                <Text style={styles.modalSaveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Edit log minum yang sudah tersimpan */}
      <Modal visible={!!editingLog} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit log minum</Text>
            <Text style={styles.modalSub}>Ubah tanggal atau jam pencatatan ini. Status dan botol dihitung ulang otomatis.</Text>
            {editingLog && (
              <>
                <DatePickerField
                  label="Tanggal"
                  required
                  value={editingLog.editDate}
                  onChange={(d) => setEditingLog((prev) => ({ ...prev, editDate: d }))}
                />
                <TimePickerField
                  label="Jam diminum"
                  required
                  value={editingLog.editTime}
                  onChange={(t) => setEditingLog((prev) => ({ ...prev, editTime: t }))}
                />
              </>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditingLog(null)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveEditLog}>
                <Text style={styles.modalSaveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Hapus obat dengan konfirmasi tanggal */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Hapus obat ini?</Text>
            <Text style={styles.modalSub}>
              Semua riwayat log dan stok obat ini akan terhapus permanen. Untuk konfirmasi, ketik tanggal hari ini dalam format YYYY-MM-DD:
            </Text>
            <FieldLabel>Ketik: {getTodayDateString()}</FieldLabel>
            <TextInput
              style={styles.modalInput}
              value={deleteConfirmInput}
              onChangeText={setDeleteConfirmInput}
              placeholder={getTodayDateString()}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDeleteBtn} onPress={handleConfirmDelete}>
                <Text style={styles.modalSaveText}>Hapus permanen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

function InfoRow({ label, value, last }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  inactiveBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  inactiveBannerText: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: fontSize.body,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionSubNote: {
    fontSize: fontSize.caption - 1,
    color: colors.textTertiary,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: fontSize.caption,
    color: colors.textTertiary,
  },
  infoValue: {
    fontSize: fontSize.small,
    color: colors.textPrimary,
  },
  notesBox: {
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  notesLabel: {
    fontSize: fontSize.caption,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  notesText: {
    fontSize: fontSize.small,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  stockTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  miniLabel: {
    fontSize: fontSize.caption,
    color: colors.textTertiary,
  },
  miniValue: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textPrimary,
    marginTop: 1,
  },
  stockBigValue: {
    fontSize: fontSize.h1 - 2,
    fontWeight: '500',
  },
  progressBg: {
    height: 6,
    backgroundColor: colors.cardBg,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  stockHint: {
    fontSize: fontSize.caption - 1,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    lineHeight: 14,
  },
  addStockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.green,
    backgroundColor: colors.greenBg,
  },
  addStockButtonText: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.green,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickActionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.green,
    borderRadius: radius.lg,
    paddingVertical: 12,
  },
  quickActionPrimaryText: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.screenBg,
  },
  quickActionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    paddingVertical: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  quickActionSecondaryText: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: fontSize.small,
    color: colors.textTertiary,
  },
  emptyTextSmall: {
    fontSize: fontSize.caption,
    color: colors.textTertiary,
    padding: spacing.md,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  logIconBtn: {
    padding: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  historyTitle: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  historyStatusInline: {
    fontSize: fontSize.caption,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  historySub: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bottleLogContainer: {
    backgroundColor: colors.cardBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  bottleLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  bottleLogText: {
    fontSize: fontSize.caption,
    color: colors.textPrimary,
  },
  bottleLogSub: {
    fontSize: fontSize.caption - 1,
    color: colors.textTertiary,
    marginTop: 1,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  manageRowText: {
    flex: 1,
    fontSize: fontSize.small,
    color: colors.textPrimary,
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
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: colors.cardBg,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    fontSize: fontSize.body,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  modalDeleteBtn: {
    flex: 1,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.red,
    alignItems: 'center',
  },
  modalSaveText: {
    color: colors.screenBg,
    fontSize: fontSize.small,
    fontWeight: '500',
  },
  deleteBottleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  deleteBottleBtnText: {
    fontSize: fontSize.small,
    color: colors.red,
  },
});
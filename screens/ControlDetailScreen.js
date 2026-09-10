import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Linking } from 'react-native';
import Alert from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper, Card, Badge, PrimaryButton } from '../components/Common';
import { colors, spacing, fontSize, radius } from '../utils/theme';
import {
  getControlVisitById,
  addAttachmentToVisit,
  updateAttachment,
  deleteAttachment,
  deleteControlVisit,
  updateControlVisit,
  markControlVisitCompleted,
  unmarkControlVisitCompleted,
  formatDateIndo,
  getActiveMedicines,
  getMedicinesReceivedForVisit,
  addMedicineReceivedInVisit,
  unlinkMedicineFromVisit,
} from '../utils/storage';
import { rescheduleControlReminder } from '../utils/notifications';

export default function ControlDetailScreen({ route, navigation }) {
  const { visitId } = route.params;
  const [visit, setVisit] = useState(null);
  const [showAddAttachment, setShowAddAttachment] = useState(false);
  const [attLabel, setAttLabel] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const [editingAttachmentId, setEditingAttachmentId] = useState(null); // null = mode tambah baru

  const [showExamResult, setShowExamResult] = useState(false);
  const [cd4, setCd4] = useState('');
  const [viralLoad, setViralLoad] = useState('');
  const [bloodPressureSys, setBloodPressureSys] = useState('');
  const [bloodPressureDia, setBloodPressureDia] = useState('');
  const [weight, setWeight] = useState('');

  const [medicinesReceived, setMedicinesReceived] = useState([]);
  const [activeMedicines, setActiveMedicines] = useState([]);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [showMedicinePicker, setShowMedicinePicker] = useState(false);
  const [selectedMedicineId, setSelectedMedicineId] = useState(null);
  const [receivedAmount, setReceivedAmount] = useState('30');

  const loadData = useCallback(async () => {
    const data = await getControlVisitById(visitId);
    setVisit(data);
    const received = await getMedicinesReceivedForVisit(visitId);
    setMedicinesReceived(received);
    const meds = await getActiveMedicines();
    setActiveMedicines(meds);
  }, [visitId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleOpenAddAttachment = () => {
    setEditingAttachmentId(null);
    setAttLabel('');
    setAttUrl('');
    setShowAddAttachment(true);
  };

  const handleOpenEditAttachment = (att) => {
    setEditingAttachmentId(att.id);
    setAttLabel(att.label);
    setAttUrl(att.urlOrPath);
    setShowAddAttachment(true);
  };

  const handleSaveAttachment = async () => {
    if (!attLabel.trim() || !attUrl.trim()) {
      Alert.alert('Lengkapi data', 'Isi nama dan link/path dokumen.');
      return;
    }
    try {
      if (editingAttachmentId) {
        await updateAttachment(visitId, editingAttachmentId, { label: attLabel.trim(), urlOrPath: attUrl.trim() });
      } else {
        await addAttachmentToVisit(visitId, { label: attLabel.trim(), urlOrPath: attUrl.trim() });
      }
      setAttLabel('');
      setAttUrl('');
      setEditingAttachmentId(null);
      setShowAddAttachment(false);
      await loadData();
    } catch (e) {
      Alert.alert('Gagal menyimpan', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  const handleDeleteAttachment = (att) => {
    Alert.alert('Hapus dokumen ini?', `"${att.label}" akan dihapus.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAttachment(visitId, att.id);
            await loadData();
          } catch (e) {
            Alert.alert('Gagal menghapus', e.message || 'Terjadi kesalahan, coba lagi.');
          }
        },
      },
    ]);
  };

  const handleOpenAddMedicine = () => {
    setSelectedMedicineId(activeMedicines[0]?.id || null);
    setReceivedAmount('30');
    setShowAddMedicine(true);
  };

  const handleSaveMedicineReceived = async () => {
    if (!selectedMedicineId) {
      Alert.alert('Pilih obat', 'Pilih obat yang didapat pada kontrol ini.');
      return;
    }
    const amount = parseInt(receivedAmount, 10);
    if (!amount || amount <= 0) {
      Alert.alert('Jumlah tidak valid', 'Masukkan jumlah tablet yang benar.');
      return;
    }
    try {
      await addMedicineReceivedInVisit(visitId, selectedMedicineId, amount, visit.visitDate);
      setShowAddMedicine(false);
      await loadData();
    } catch (e) {
      Alert.alert('Gagal menyimpan', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  const handleRemoveMedicineReceived = (item) => {
    Alert.alert(
      'Lepas tanda obat ini?',
      `"${item.medicine?.name || 'Obat'}" tidak akan lagi ditandai berasal dari kontrol ini. Riwayat botolnya tetap ada di halaman Obat.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Lepas',
          style: 'destructive',
          onPress: async () => {
            try {
              await unlinkMedicineFromVisit(item.id);
              await loadData();
            } catch (e) {
              Alert.alert('Gagal', e.message || 'Terjadi kesalahan, coba lagi.');
            }
          },
        },
      ]
    );
  };

  const handleOpenExamResult = () => {
    setCd4(visit.cd4 ? String(visit.cd4) : '');
    setViralLoad(visit.viralLoad || '');
    setBloodPressureSys(visit.bloodPressureSys ? String(visit.bloodPressureSys) : '');
    setBloodPressureDia(visit.bloodPressureDia ? String(visit.bloodPressureDia) : '');
    setWeight(visit.weight ? String(visit.weight) : '');
    setShowExamResult(true);
  };

  const handleSaveExamResult = async () => {
    try {
      await updateControlVisit(visitId, {
        cd4: cd4 ? parseFloat(cd4) : null,
        viralLoad: viralLoad ? viralLoad.trim() : null,
        bloodPressureSys: bloodPressureSys ? parseFloat(bloodPressureSys) : null,
        bloodPressureDia: bloodPressureDia ? parseFloat(bloodPressureDia) : null,
        weight: weight ? parseFloat(weight) : null,
      });
      setShowExamResult(false);
      await loadData();
    } catch (e) {
      Alert.alert('Gagal menyimpan', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  const handleDelete = () => {
    Alert.alert('Hapus kunjungan ini?', 'Tindakan ini tidak bisa dibatalkan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteControlVisit(visitId);
            try { await rescheduleControlReminder(); } catch (e) {}
            navigation.goBack();
          } catch (e) {
            Alert.alert('Gagal menghapus', e.message || 'Terjadi kesalahan, coba lagi.');
          }
        },
      },
    ]);
  };

  const handleToggleCompleted = async () => {
    try {
      if (visit.isCompleted) {
        await unmarkControlVisitCompleted(visitId);
      } else {
        await markControlVisitCompleted(visitId);
      }
      try { await rescheduleControlReminder(); } catch (e) {}
      await loadData();
    } catch (e) {
      Alert.alert('Gagal', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  const openAttachment = (urlOrPath) => {
    if (urlOrPath.startsWith('http')) {
      Linking.openURL(urlOrPath).catch(() => Alert.alert('Tidak bisa membuka link'));
    } else {
      Alert.alert('Path lokal', urlOrPath);
    }
  };

  if (!visit) {
    return (
      <ScreenWrapper>
        <View style={styles.headerCustom}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitleCustom}>Memuat...</Text>
          <View style={{ width: 20 }} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.headerCustom}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitleCustom}>Detail kontrol</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={{ marginBottom: spacing.md }}>
          <View style={styles.visitDateRow}>
            <Text style={styles.visitDate}>{formatDateIndo(visit.visitDate)}</Text>
            <Badge text={visit.isCompleted ? 'Selesai' : 'Belum dilakukan'} variant={visit.isCompleted ? 'green' : 'gray'} />
          </View>
          <InfoRow label="Faskes" value={visit.faskes || 'Belum diisi'} />
          <InfoRow label="Dokter" value={visit.doctor || 'Belum diisi'} last />
        </Card>

        <TouchableOpacity
          style={[styles.completedBtn, visit.isCompleted ? styles.completedBtnDone : styles.completedBtnPrimary]}
          onPress={handleToggleCompleted}
        >
          <Ionicons
            name={visit.isCompleted ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={18}
            color={visit.isCompleted ? colors.green : colors.screenBg}
          />
          <Text style={[styles.completedBtnText, visit.isCompleted ? { color: colors.green } : { color: colors.screenBg }]}>
            {visit.isCompleted ? 'Kontrol ini sudah selesai dilakukan' : 'Tandai kontrol ini sudah selesai'}
          </Text>
        </TouchableOpacity>

        {visit.notes && (
          <Card style={{ marginBottom: spacing.sm }}>
            <Text style={styles.cardLabel}>Catatan kunjungan</Text>
            <Text style={styles.notesText}>{visit.notes}</Text>
          </Card>
        )}

        <Card style={{ marginBottom: spacing.sm }}>
          <View style={styles.attachmentHeader}>
            <Text style={styles.cardLabel}>Hasil pemeriksaan</Text>
          </View>
          {!(visit.cd4 || visit.viralLoad || visit.bloodPressureSys || visit.weight) && (
            <Text style={styles.emptyText}>Belum ada hasil pemeriksaan.</Text>
          )}
          {visit.cd4 && <InfoRow label="CD4" value={`${visit.cd4} sel/mm³`} />}
          {visit.viralLoad && <InfoRow label="Viral load" value={visit.viralLoad} />}
          {visit.bloodPressureSys && (
            <InfoRow label="Tensi" value={`${visit.bloodPressureSys}/${visit.bloodPressureDia} mmHg`} />
          )}
          {visit.weight && <InfoRow label="Berat badan" value={`${visit.weight} kg`} last />}
          <TouchableOpacity style={styles.addAttachmentBtn} onPress={handleOpenExamResult}>
            <Text style={styles.addAttachmentText}>
              {(visit.cd4 || visit.viralLoad || visit.bloodPressureSys || visit.weight) ? 'Edit hasil pemeriksaan' : '+ Tambah hasil pemeriksaan'}
            </Text>
          </TouchableOpacity>
        </Card>

        <Card style={{ marginBottom: spacing.sm }}>
          <View style={styles.attachmentHeader}>
            <Text style={styles.cardLabel}>Obat diterima</Text>
          </View>
          {medicinesReceived.length === 0 && (
            <Text style={styles.emptyText}>Belum ada obat yang ditandai dari kontrol ini.</Text>
          )}
          {medicinesReceived.map((item) => (
            <View key={item.id} style={styles.attachmentRow}>
              <View style={styles.attachmentMain}>
                <Ionicons name="medical-outline" size={18} color={colors.green} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.attachmentLabel}>{item.medicine?.name || 'Obat sudah dihapus'}</Text>
                  <Text style={styles.attachmentUrl}>{item.amount} tablet</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleRemoveMedicineReceived(item)} style={styles.logIconBtn}>
                <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addAttachmentBtn} onPress={handleOpenAddMedicine}>
            <Text style={styles.addAttachmentText}>+ Tandai obat diterima</Text>
          </TouchableOpacity>
        </Card>

        <Card style={{ marginBottom: spacing.sm }}>
          <View style={styles.attachmentHeader}>
            <Text style={styles.cardLabel}>Dokumen & foto</Text>
          </View>
          {(!visit.attachments || visit.attachments.length === 0) && (
            <Text style={styles.emptyText}>Belum ada dokumen.</Text>
          )}
          {visit.attachments?.map((att) => (
            <View key={att.id} style={styles.attachmentRow}>
              <TouchableOpacity style={styles.attachmentMain} onPress={() => openAttachment(att.urlOrPath)}>
                <Ionicons name="document-text-outline" size={18} color={colors.green} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.attachmentLabel}>{att.label}</Text>
                  <Text style={styles.attachmentUrl}>{att.urlOrPath}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleOpenEditAttachment(att)} style={styles.logIconBtn}>
                <Ionicons name="pencil-outline" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteAttachment(att)} style={styles.logIconBtn}>
                <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addAttachmentBtn} onPress={handleOpenAddAttachment}>
            <Text style={styles.addAttachmentText}>+ Tambah dokumen / link</Text>
          </TouchableOpacity>
        </Card>

        <Text style={styles.sectionHeading}>Kelola kontrol ini</Text>
        <Card style={{ padding: 0, marginBottom: spacing.xl }}>
          <TouchableOpacity
            style={styles.manageRow}
            onPress={() => navigation.navigate('EditKontrol', { visitId })}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.manageRowText}>Edit informasi kontrol</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.manageRow, { borderBottomWidth: 0 }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color={colors.red} />
            <Text style={[styles.manageRowText, { color: colors.red }]}>Hapus kontrol ini permanen</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.red} />
          </TouchableOpacity>
        </Card>
      </ScrollView>

      <Modal visible={showExamResult} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Hasil pemeriksaan</Text>
            <Text style={styles.modalSubText}>
              Semua field opsional. CD4/viral load biasanya hanya diperiksa setiap 6 bulan–1 tahun.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={cd4}
              onChangeText={setCd4}
              placeholder="CD4 (sel/mm³)"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.modalInput}
              value={viralLoad}
              onChangeText={setViralLoad}
              placeholder="Viral load (misal: <20 atau tidak terdeteksi)"
              placeholderTextColor={colors.textTertiary}
            />
            <View style={styles.modalRow2}>
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                value={bloodPressureSys}
                onChangeText={setBloodPressureSys}
                placeholder="Tensi sistolik"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                value={bloodPressureDia}
                onChangeText={setBloodPressureDia}
                placeholder="Tensi diastolik"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
            <TextInput
              style={styles.modalInput}
              value={weight}
              onChangeText={setWeight}
              placeholder="Berat badan (kg)"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowExamResult(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveExamResult}>
                <Text style={styles.modalSaveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAddAttachment} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{editingAttachmentId ? 'Edit dokumen' : 'Tambah dokumen'}</Text>
            <TextInput
              style={styles.modalInput}
              value={attLabel}
              onChangeText={setAttLabel}
              placeholder="Nama dokumen (misal: Hasil lab Mei)"
              placeholderTextColor={colors.textTertiary}
            />
            <TextInput
              style={styles.modalInput}
              value={attUrl}
              onChangeText={setAttUrl}
              placeholder="Link Google Drive / path foto"
              placeholderTextColor={colors.textTertiary}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddAttachment(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveAttachment}>
                <Text style={styles.modalSaveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAddMedicine} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Tandai obat diterima</Text>
            <Text style={styles.modalSubText}>
              Pilih obat yang sudah ada di halaman Obat. Kalau obatnya belum ada, tambahkan dulu
              di tab Obat, lalu kembali ke sini.
            </Text>
            {activeMedicines.length === 0 ? (
              <Text style={styles.emptyText}>Belum ada obat aktif. Tambahkan obat dulu di tab Obat.</Text>
            ) : (
              <TouchableOpacity style={styles.modalInput} onPress={() => setShowMedicinePicker(true)}>
                <Text style={{ fontSize: fontSize.body, color: colors.textPrimary }}>
                  {activeMedicines.find((m) => m.id === selectedMedicineId)?.name || 'Pilih obat'}
                </Text>
              </TouchableOpacity>
            )}
            <TextInput
              style={styles.modalInput}
              value={receivedAmount}
              onChangeText={setReceivedAmount}
              placeholder="Jumlah tablet"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddMedicine(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveMedicineReceived} disabled={activeMedicines.length === 0}>
                <Text style={styles.modalSaveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showMedicinePicker} transparent animationType="slide">
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowMedicinePicker(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerSheetTitle}>Pilih obat</Text>
            {activeMedicines.map((med) => (
              <TouchableOpacity
                key={med.id}
                style={styles.pickerOption}
                onPress={() => { setSelectedMedicineId(med.id); setShowMedicinePicker(false); }}
              >
                <Text style={[styles.pickerOptionText, selectedMedicineId === med.id && styles.pickerOptionTextActive]}>
                  {med.name}
                </Text>
                {selectedMedicineId === med.id && <Ionicons name="checkmark" size={16} color={colors.green} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
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
  headerCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitleCustom: {
    fontSize: fontSize.h2,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  visitDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  visitDate: {
    fontSize: fontSize.body,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  visitSub: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  completedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  completedBtnPrimary: {
    backgroundColor: colors.green,
  },
  completedBtnDone: {
    backgroundColor: colors.greenBg,
    borderWidth: 0.5,
    borderColor: colors.green,
  },
  completedBtnText: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textSecondary,
    flex: 1,
  },
  cardLabel: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  notesText: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    lineHeight: 20,
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
  attachmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyText: {
    fontSize: fontSize.small,
    color: colors.textTertiary,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  attachmentMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logIconBtn: {
    padding: 4,
  },
  sectionHeading: {
    fontSize: fontSize.body,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
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
  attachmentLabel: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  attachmentUrl: {
    fontSize: fontSize.caption - 1,
    color: colors.textTertiary,
  },
  addAttachmentBtn: {
    marginTop: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  addAttachmentText: {
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
    marginBottom: spacing.md,
  },
  modalSubText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  modalRow2: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalInput: {
    backgroundColor: colors.cardBg,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    fontSize: fontSize.body,
    marginBottom: spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.screenBg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  pickerSheetTitle: {
    fontSize: fontSize.h2,
    fontWeight: '500',
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  pickerOptionText: {
    fontSize: fontSize.bodyLg,
    color: colors.textPrimary,
  },
  pickerOptionTextActive: {
    color: colors.green,
    fontWeight: '500',
  },
});
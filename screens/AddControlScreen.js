import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import Alert from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, PrimaryButton } from '../components/Common';
import { DatePickerField, FieldLabel } from '../components/DateTimeFields';
import { colors, spacing, fontSize, radius } from '../utils/theme';
import { saveControlVisit, updateControlVisit, getControlVisitById, markControlVisitCompleted, unmarkControlVisitCompleted, getTodayDateString, getProfile } from '../utils/storage';
import { rescheduleControlReminder } from '../utils/notifications';

export default function AddControlScreen({ navigation, route }) {
  // Kalau ada visitId di params, berarti ini mode EDIT, bukan tambah baru
  const editingVisitId = route?.params?.visitId || null;
  const isEditMode = !!editingVisitId;

  const [visitDate, setVisitDate] = useState(getTodayDateString());
  const [faskes, setFaskes] = useState('');
  const [doctor, setDoctor] = useState('');
  const [notes, setNotes] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  // Kalau mode edit, ambil data lama dan isi semua field.
  // Kalau mode tambah baru, auto-isi faskes dari "Faskes utama" di Pengaturan (biar tidak ketik ulang tiap kali).
  useEffect(() => {
    if (!isEditMode) {
      (async () => {
        try {
          const profile = await getProfile();
          if (profile?.faskes) setFaskes(profile.faskes);
        } catch (e) {}
      })();
      return;
    }
    (async () => {
      const visit = await getControlVisitById(editingVisitId);
      if (visit) {
        setVisitDate(visit.visitDate || getTodayDateString());
        setFaskes(visit.faskes || '');
        setDoctor(visit.doctor || '');
        setNotes(visit.notes || '');
        setIsCompleted(!!visit.isCompleted);
      }
      setLoading(false);
    })();
  }, [isEditMode, editingVisitId]);

  const handleSave = async () => {
    if (!visitDate.trim()) {
      Alert.alert('Tanggal kosong', 'Mohon isi tanggal kunjungan.');
      return;
    }
    if (!faskes.trim()) {
      Alert.alert('Faskes kosong', 'Mohon isi nama faskes / rumah sakit.');
      return;
    }

    const payload = {
      visitDate: visitDate.trim(),
      faskes: faskes.trim(),
      doctor: doctor.trim(),
      notes: notes.trim(),
    };

    setSaving(true);
    try {
      if (isEditMode) {
        await updateControlVisit(editingVisitId, payload);
      } else {
        await saveControlVisit({ ...payload, attachments: [], isCompleted: false });
      }
      try { await rescheduleControlReminder(); } catch (e) {}
      navigation.goBack();
    } catch (e) {
      Alert.alert('Gagal menyimpan', 'Terjadi kesalahan, coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCompleted = async () => {
    try {
      if (isCompleted) {
        await unmarkControlVisitCompleted(editingVisitId);
        setIsCompleted(false);
      } else {
        await markControlVisitCompleted(editingVisitId);
        setIsCompleted(true);
      }
      try { await rescheduleControlReminder(); } catch (e) {}
    } catch (e) {
      Alert.alert('Gagal', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Memuat...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit kontrol' : 'Tambah kontrol'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={styles.saveText}>Simpan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isEditMode && (
          <TouchableOpacity
            style={[styles.completedToggle, isCompleted ? styles.completedToggleDone : styles.completedTogglePrimary]}
            onPress={handleToggleCompleted}
          >
            <Ionicons
              name={isCompleted ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={20}
              color={isCompleted ? colors.green : colors.screenBg}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.completedToggleTitle, isCompleted ? { color: colors.green } : { color: colors.screenBg }]}>
                {isCompleted ? 'Kontrol ini sudah selesai' : 'Tandai sebagai selesai'}
              </Text>
              <Text style={[styles.completedToggleSub, !isCompleted && { color: colors.greenSoft }]}>
                {isCompleted
                  ? 'Ketuk untuk membatalkan tanda selesai'
                  : 'Jadwal ini masih dihitung sebagai kontrol mendatang'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <DatePickerField
          label="Tanggal jadwal kontrol"
          required
          value={visitDate}
          onChange={setVisitDate}
          placeholder="Pilih tanggal kontrol"
        />

        <View style={styles.faskesCard}>
          <Field label="Faskes / rumah sakit" required value={faskes} onChangeText={setFaskes} placeholder="RSUD Soreang" />
          <Field label="Dokter" value={doctor} onChangeText={setDoctor} placeholder="dr. Santika (opsional)" />
        </View>

        <View style={styles.field}>
          <FieldLabel>Catatan kunjungan</FieldLabel>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Kondisi umum, perubahan resep, dll..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
          />
        </View>

        <Text style={styles.attachmentNote}>
          Hasil pemeriksaan (CD4, viral load, tensi, berat badan) serta dokumen & foto bisa ditambahkan {isEditMode ? '' : 'setelah kunjungan ini disimpan, '}dari halaman detail kontrol.
        </Text>

        <PrimaryButton title={isEditMode ? 'Simpan perubahan' : 'Simpan kontrol'} onPress={handleSave} disabled={saving} />
      </ScrollView>
    </ScreenWrapper>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, half, required }) {
  return (
    <View style={[styles.field, half && { flex: 1 }]}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={keyboardType}
      />
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
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.h2 - 2,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  saveText: {
    fontSize: fontSize.body,
    fontWeight: '500',
    color: colors.green,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.cardBg,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  textarea: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  faskesCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  attachmentNote: {
    fontSize: fontSize.caption,
    color: colors.textTertiary,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  completedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  completedTogglePrimary: {
    backgroundColor: colors.green,
  },
  completedToggleDone: {
    backgroundColor: colors.greenBg,
    borderWidth: 0.5,
    borderColor: colors.green,
  },
  completedToggleTitle: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  completedToggleSub: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
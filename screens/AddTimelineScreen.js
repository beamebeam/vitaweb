import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, PrimaryButton } from '../components/Common';
import { DatePickerField, FieldLabel } from '../components/DateTimeFields';
import { colors, spacing, fontSize, radius } from '../utils/theme';
import {
  saveTimelineEntry,
  updateTimelineEntry,
  deleteTimelineEntry,
  getTimelineEntries,
  getActiveMedicines,
  getTodayDateString,
} from '../utils/storage';

const ENTRY_TYPES = [
  { value: 'gejala', label: 'Gejala', icon: 'sad-outline' },
  { value: 'jurnal', label: 'Jurnal harian', icon: 'document-text-outline' },
  { value: 'obat', label: 'Obat', icon: 'medical-outline' },
  { value: 'milestone', label: 'Milestone', icon: 'flag-outline' },
];

const GEJALA_TAGS_BASE = ['Demam', 'Mual', 'Lelah', 'Pusing', 'Diare', 'Batuk', 'Nyeri', 'Keringat malam'];
const SEVERITY_OPTIONS = ['Ringan', 'Sedang', 'Berat'];

export default function AddTimelineScreen({ navigation, route }) {
  const editingEntryId = route?.params?.entryId || null;
  const isEditMode = !!editingEntryId;

  const [entryDate, setEntryDate] = useState(getTodayDateString());
  const [entryType, setEntryType] = useState('jurnal');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [severity, setSeverity] = useState('Ringan');
  const [medicines, setMedicines] = useState([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState(null);
  const [showMedicinePicker, setShowMedicinePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    (async () => {
      const meds = await getActiveMedicines();
      setMedicines(meds);

      if (isEditMode) {
        const entries = await getTimelineEntries();
        const entry = entries.find((e) => e.id === editingEntryId);
        if (entry) {
          setEntryDate(entry.entryDate || getTodayDateString());
          setEntryType(entry.entryType || 'jurnal');
          setTitle(entry.title || '');
          setDescription(entry.description || '');
          setSelectedTags(entry.tags || []);
          setSeverity(entry.severity || 'Ringan');
          setSelectedMedicineId(entry.refMedicineId || null);
        }
      } else if (meds.length > 0) {
        setSelectedMedicineId(meds[0].id);
      }
      setLoading(false);
    })();
  }, [isEditMode, editingEntryId]);

  const allGejalaTags = Array.from(
    new Set([...GEJALA_TAGS_BASE, ...selectedTags.filter((t) => !GEJALA_TAGS_BASE.includes(t))])
  );

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    const tag = customTagInput.trim();
    if (!tag) return;
    if (!selectedTags.includes(tag)) {
      setSelectedTags((prev) => [...prev, tag]);
    }
    setCustomTagInput('');
    setShowCustomTagInput(false);
  };

  const handleSave = async () => {
    if (entryType === 'obat' && !selectedMedicineId) {
      Alert.alert('Obat belum dipilih', 'Mohon pilih obat untuk catatan ini.');
      return;
    }

    const selectedMedicine = medicines.find((m) => m.id === selectedMedicineId);
    const kategoriLabel = selectedMedicine?.category === 'ARV'
      ? 'ARV'
      : selectedMedicine?.category === 'pendamping'
      ? 'Pendamping'
      : 'Temporer';

    // Untuk kategori obat, judul SELALU format "Kategori: NamaObat" - konsisten dengan entri otomatis,
    // tidak bisa ditimpa bebas oleh user supaya formatnya seragam di seluruh Timeline
    const finalTitle = entryType === 'obat' && selectedMedicine
      ? `${kategoriLabel}: ${selectedMedicine.name}`
      : title.trim() || (
          entryType === 'gejala' && selectedTags.length > 0
            ? selectedTags.join(', ')
            : ENTRY_TYPES.find((t) => t.value === entryType)?.label
        );

    if (!entryDate.trim()) {
      Alert.alert('Tanggal kosong', 'Mohon isi tanggal catatan.');
      return;
    }

    const payload = {
      entryDate: entryDate.trim(),
      entryType,
      title: finalTitle,
      description: description.trim(),
      severity: entryType === 'gejala' ? severity : null,
      tags: entryType === 'gejala' ? selectedTags : [],
      // refMedicineId hanya diisi untuk catatan obat MANUAL (tanpa refStockHistoryId),
      // berbeda dari entri otomatis saat tambah botol yang punya kedua referensi itu
      refMedicineId: entryType === 'obat' ? selectedMedicineId : null,
    };

    setSaving(true);
    try {
      if (isEditMode) {
        await updateTimelineEntry(editingEntryId, payload);
      } else {
        await saveTimelineEntry(payload);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Gagal menyimpan', 'Terjadi kesalahan, coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Hapus catatan ini?', 'Tindakan ini tidak bisa dibatalkan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          await deleteTimelineEntry(editingEntryId);
          navigation.goBack();
        },
      },
    ]);
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
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit catatan' : 'Tambah catatan'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={styles.saveText}>Simpan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <DatePickerField
          label="Tanggal"
          required
          value={entryDate}
          onChange={setEntryDate}
          placeholder="Pilih tanggal catatan"
        />

        <View style={styles.field}>
          <FieldLabel required>Jenis catatan</FieldLabel>
          <View style={styles.typeGrid}>
            {ENTRY_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeOption, entryType === t.value && styles.typeOptionSelected]}
                onPress={() => setEntryType(t.value)}
              >
                <Ionicons
                  name={t.icon}
                  size={18}
                  color={entryType === t.value ? colors.green : colors.textSecondary}
                />
                <Text style={[styles.typeOptionText, entryType === t.value && styles.typeOptionTextSelected]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {entryType === 'gejala' && (
          <>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Judul (opsional)</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Contoh: Demam tinggi malam hari"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={styles.fieldHintBelow}>Kosongkan untuk otomatis pakai daftar gejala sebagai judul.</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Gejala yang dirasakan</Text>
              <View style={styles.tagRow}>
                {allGejalaTags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.tagAddNew}
                  onPress={() => setShowCustomTagInput(!showCustomTagInput)}
                >
                  <Ionicons name="add" size={13} color={colors.textSecondary} />
                  <Text style={styles.tagText}>Lainnya</Text>
                </TouchableOpacity>
              </View>

              {showCustomTagInput && (
                <View style={styles.customTagRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={customTagInput}
                    onChangeText={setCustomTagInput}
                    placeholder="Tulis gejala lain..."
                    placeholderTextColor={colors.textTertiary}
                    onSubmitEditing={handleAddCustomTag}
                  />
                  <TouchableOpacity style={styles.customTagAddBtn} onPress={handleAddCustomTag}>
                    <Text style={styles.customTagAddText}>Tambah</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Tingkat keparahan</Text>
              <View style={styles.severityRow}>
                {SEVERITY_OPTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.severityOption, severity === s && styles.severityOptionActive]}
                    onPress={() => setSeverity(s)}
                  >
                    <Text style={[styles.severityText, severity === s && styles.severityTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {entryType === 'obat' && (
          <View style={styles.field}>
            <FieldLabel required>Pilih obat</FieldLabel>
            {medicines.length === 0 ? (
              <Text style={styles.emptyMedicineText}>
                Belum ada obat aktif. Tambahkan obat dulu di tab Obat.
              </Text>
            ) : (
              <TouchableOpacity style={styles.medicinePicker} onPress={() => setShowMedicinePicker(true)}>
                <Text style={styles.medicinePickerText}>
                  {medicines.find((m) => m.id === selectedMedicineId)?.name || 'Pilih obat'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {entryType !== 'gejala' && entryType !== 'obat' && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Judul</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={entryType === 'milestone' ? 'Contoh: CD4 meningkat ke 480' : 'Judul singkat'}
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{entryType === 'obat' ? 'Catatan obat (opsional)' : 'Catatan tambahan (opsional)'}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Detail lebih lanjut..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
          />
        </View>

        <PrimaryButton title={isEditMode ? 'Simpan perubahan' : 'Simpan catatan'} onPress={handleSave} disabled={saving} />

        {isEditMode && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={15} color={colors.red} />
            <Text style={styles.deleteBtnText}>Hapus catatan ini</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={showMedicinePicker} transparent animationType="slide">
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowMedicinePicker(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerSheetTitle}>Pilih obat</Text>
            {medicines.map((med) => (
              <TouchableOpacity
                key={med.id}
                style={styles.pickerOption}
                onPress={() => { setSelectedMedicineId(med.id); setShowMedicinePicker(false); }}
              >
                <View>
                  <Text style={[styles.pickerOptionText, selectedMedicineId === med.id && styles.pickerOptionTextActive]}>
                    {med.name}
                  </Text>
                  <Text style={styles.pickerOptionSub}>{med.category === 'ARV' ? 'ARV' : med.category === 'pendamping' ? 'Pendamping' : 'Temporer'}</Text>
                </View>
                {selectedMedicineId === med.id && <Ionicons name="checkmark" size={16} color={colors.green} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  fieldHintBelow: {
    fontSize: fontSize.caption - 1,
    color: colors.textTertiary,
    marginTop: 4,
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  typeOption: {
    flexBasis: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
  },
  typeOptionSelected: {
    borderColor: colors.green,
    backgroundColor: colors.greenBg,
  },
  typeOptionText: {
    fontSize: fontSize.small,
    color: colors.textPrimary,
  },
  typeOptionTextSelected: {
    color: colors.green,
    fontWeight: '500',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  tagActive: {
    backgroundColor: colors.amberBg,
    borderColor: colors.amber,
  },
  tagText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  tagTextActive: {
    color: colors.amber,
    fontWeight: '500',
  },
  tagAddNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  customTagRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  customTagAddBtn: {
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.green,
    borderRadius: radius.md,
  },
  customTagAddText: {
    color: colors.screenBg,
    fontSize: fontSize.small,
    fontWeight: '500',
  },
  severityRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  severityOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  severityOptionActive: {
    backgroundColor: colors.amberBg,
    borderColor: colors.amber,
  },
  severityText: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
  },
  severityTextActive: {
    color: colors.amber,
    fontWeight: '500',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  deleteBtnText: {
    fontSize: fontSize.small,
    color: colors.red,
  },
  medicinePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  medicinePickerText: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  emptyMedicineText: {
    fontSize: fontSize.small,
    color: colors.textTertiary,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
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
  pickerOptionSub: {
    fontSize: fontSize.caption,
    color: colors.textTertiary,
    marginTop: 1,
  },
});
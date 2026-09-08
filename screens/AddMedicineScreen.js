import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Modal } from 'react-native';
import Alert from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, PrimaryButton } from '../components/Common';
import { DatePickerField, TimePickerField, FieldLabel } from '../components/DateTimeFields';
import { colors, spacing, fontSize, radius } from '../utils/theme';
import { saveMedicine, updateMedicine, getMedicineById, getTodayDateString } from '../utils/storage';
import { rescheduleAllMedicineReminders } from '../utils/notifications';

const KATEGORI_OPTIONS = [
  { value: 'ARV', label: 'ARV', icon: 'medical' },
  { value: 'pendamping', label: 'Obat pendamping', sub: 'Cotrimox, INH, dll', icon: 'medical-outline' },
  { value: 'temporer', label: 'Obat temporer', sub: 'Ada tanggal selesai', icon: 'time-outline' },
];

const ATURAN_MAKAN_OPTIONS = ['Sebelum makan', 'Setelah makan', 'Lainnya'];
const FREQUENCY_OPTIONS = ['Jam', 'Hari', 'Minggu', 'Bulan'];

export default function AddMedicineScreen({ navigation, route }) {
  // Kalau ada medicineId di params, berarti ini mode EDIT
  const editingMedicineId = route?.params?.medicineId || null;
  const isEditMode = !!editingMedicineId;

  const [name, setName] = useState('');
  const [category, setCategory] = useState('ARV');
  const [scheduleTime, setScheduleTime] = useState('21:00');
  const [mealRule, setMealRule] = useState('Sebelum makan');
  const [mealRuleCustom, setMealRuleCustom] = useState('');
  const [doseAmount, setDoseAmount] = useState('1');
  const [frequencyUnit, setFrequencyUnit] = useState('Hari');
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
  const [stockTotal, setStockTotal] = useState('30');
  const [stockStartDate, setStockStartDate] = useState(getTodayDateString());
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    if (!isEditMode) return;
    (async () => {
      const med = await getMedicineById(editingMedicineId);
      if (med) {
        setName(med.name || '');
        setCategory(med.category || 'ARV');
        setScheduleTime(med.scheduleTime || '21:00');
        const isPreset = ATURAN_MAKAN_OPTIONS.slice(0, 2).includes(med.mealRule);
        setMealRule(isPreset ? med.mealRule : 'Lainnya');
        setMealRuleCustom(isPreset ? '' : (med.mealRule || ''));
        setDoseAmount(String(med.doseAmount ?? 1));
        setFrequencyUnit(med.frequencyUnit || 'Hari');
        setStockTotal(String(med.stockTotal ?? 30));
        setEndDate(med.endDate || '');
        setNotes(med.notes || '');
      }
      setLoading(false);
    })();
  }, [isEditMode, editingMedicineId]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nama obat kosong', 'Mohon isi nama obat terlebih dahulu.');
      return;
    }
    if (category === 'ARV' && !scheduleTime) {
      Alert.alert('Jam minum kosong', 'Jam minum wajib diisi untuk obat ARV.');
      return;
    }
    if (mealRule === 'Lainnya' && !mealRuleCustom.trim()) {
      Alert.alert('Aturan makan kosong', 'Mohon isi aturan makan secara manual.');
      return;
    }
    if (category === 'temporer' && !endDate) {
      Alert.alert('Tanggal selesai kosong', 'Obat temporer wajib memiliki tanggal selesai.');
      return;
    }
    const parsedDose = parseFloat(doseAmount);
    if (!parsedDose || parsedDose <= 0) {
      Alert.alert('Dosis tidak valid', 'Jumlah dosis minum harus lebih dari 0.');
      return;
    }
    if (!isEditMode) {
      const parsedStock = parseInt(stockTotal, 10);
      if (!parsedStock || parsedStock <= 0) {
        Alert.alert('Stok tidak valid', 'Jumlah stok awal harus lebih dari 0.');
        return;
      }
    }

    const finalMealRule = mealRule === 'Lainnya' ? mealRuleCustom.trim() : mealRule;

    setSaving(true);
    try {
      if (isEditMode) {
        await updateMedicine(editingMedicineId, {
          name: name.trim(),
          category,
          scheduleTime,
          mealRule: finalMealRule,
          doseAmount: parsedDose,
          frequencyUnit,
          endDate: category === 'temporer' ? endDate : null,
          notes: notes.trim(),
        });
        // Catatan: stockTotal TIDAK diubah lewat form edit ini, karena perubahan stok
        // punya alur khusus lewat "+ Dapat obat baru" agar riwayat botol tetap akurat
      } else {
        await saveMedicine({
          name: name.trim(),
          category,
          scheduleTime,
          mealRule: finalMealRule,
          doseAmount: parsedDose,
          frequencyUnit,
          stockTotal: parseInt(stockTotal, 10) || 0,
          stockStartDate: stockStartDate || getTodayDateString(),
          endDate: category === 'temporer' ? endDate : null,
          notes: notes.trim(),
        });
      }
      // Jadwalkan ulang notifikasi - dibungkus try-catch tersendiri supaya kalau gagal
      // (misal izin belum diberikan) tidak menggagalkan proses simpan obatnya
      try {
        await rescheduleAllMedicineReminders();
      } catch (notifError) {
        console.log('Gagal menjadwalkan notifikasi:', notifError);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Gagal menyimpan', 'Terjadi kesalahan, coba lagi.');
    } finally {
      setSaving(false);
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
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit obat' : 'Tambah obat'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={styles.saveText}>Simpan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.field}>
          <FieldLabel required>Nama obat</FieldLabel>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Contoh: Cotrimoxazole"
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel required>Kategori</FieldLabel>
          {KATEGORI_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.optionRow, category === opt.value && styles.optionRowSelected]}
              onPress={() => setCategory(opt.value)}
            >
              <Ionicons
                name={opt.icon}
                size={16}
                color={category === opt.value ? colors.green : colors.textSecondary}
              />
              <View>
                <Text style={[styles.optionText, category === opt.value && styles.optionTextSelected]}>
                  {opt.label}
                </Text>
                {opt.sub && <Text style={styles.optionSub}>{opt.sub}</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TimePickerField
          label="Jam minum"
          required={category === 'ARV'}
          value={scheduleTime}
          onChange={setScheduleTime}
          placeholder={category === 'ARV' ? 'Pilih jam minum' : 'Pilih jam minum (opsional)'}
        />

        <View style={styles.field}>
          <FieldLabel required>Dosis minum</FieldLabel>
          <View style={styles.doseRowFull}>
            <TextInput
              style={[styles.input, styles.doseAmountInput]}
              value={doseAmount}
              onChangeText={setDoseAmount}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={colors.textTertiary}
            />
            <Text style={styles.doseStaticText}>x Minum per</Text>
            <TouchableOpacity style={styles.doseFrequencyPicker} onPress={() => setShowFrequencyPicker(true)}>
              <Text style={styles.doseFrequencyPickerText}>{frequencyUnit}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <Modal visible={showFrequencyPicker} transparent animationType="fade">
          <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowFrequencyPicker(false)}>
            <View style={styles.pickerSheet}>
              {FREQUENCY_OPTIONS.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={styles.pickerOption}
                  onPress={() => { setFrequencyUnit(unit); setShowFrequencyPicker(false); }}
                >
                  <Text style={[styles.pickerOptionText, frequencyUnit === unit && styles.pickerOptionTextActive]}>
                    {unit}
                  </Text>
                  {frequencyUnit === unit && <Ionicons name="checkmark" size={16} color={colors.green} />}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <View style={styles.field}>
          <FieldLabel required>Aturan makan</FieldLabel>
          <View style={styles.tagRow}>
            {ATURAN_MAKAN_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.tag, mealRule === opt && styles.tagActive]}
                onPress={() => setMealRule(opt)}
              >
                <Text style={[styles.tagText, mealRule === opt && styles.tagTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {mealRule === 'Lainnya' && (
            <TextInput
              style={[styles.input, { marginTop: spacing.sm }]}
              value={mealRuleCustom}
              onChangeText={setMealRuleCustom}
              placeholder="Contoh: 1 jam sebelum tidur, dengan banyak air"
              placeholderTextColor={colors.textTertiary}
            />
          )}
        </View>

        {!isEditMode && (
          <View style={styles.field}>
            <FieldLabel required>Stok awal (jumlah tablet)</FieldLabel>
            <TextInput
              style={styles.input}
              value={stockTotal}
              onChangeText={setStockTotal}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        )}

        {!isEditMode && (
          <DatePickerField
            label="Tanggal mulai botol ini"
            required
            value={stockStartDate}
            onChange={setStockStartDate}
            placeholder="Pilih tanggal mulai"
          />
        )}
        {!isEditMode && (
          <Text style={styles.fieldHintBelow}>
            Kalau kamu sudah minum obat ini sejak lama, pilih tanggal sebenarnya kapan mulai botol pertama — bukan harus hari ini. Kamu bisa catat log minum yang sudah lewat lewat menu "Catat manual" di halaman detail obat setelah ini disimpan.
          </Text>
        )}

        {category === 'temporer' && (
          <DatePickerField
            label="Tanggal selesai"
            required
            value={endDate}
            onChange={setEndDate}
            placeholder="Pilih tanggal selesai"
          />
        )}

        <View style={styles.field}>
          <FieldLabel>Catatan (opsional)</FieldLabel>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Contoh: diminum bersamaan dengan vitamin B6, atau efek samping yang perlu diwaspadai"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
          />
        </View>

        <PrimaryButton title={isEditMode ? 'Simpan perubahan' : 'Simpan obat'} onPress={handleSave} disabled={saving} />
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
  fieldHintBelow: {
    fontSize: fontSize.caption - 1,
    color: colors.textTertiary,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    lineHeight: 15,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: spacing.xs,
  },
  optionRowSelected: {
    borderColor: colors.green,
    backgroundColor: colors.greenBg,
  },
  optionText: {
    fontSize: fontSize.small,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    color: colors.green,
    fontWeight: '500',
  },
  optionSub: {
    fontSize: fontSize.caption - 1,
    color: colors.textTertiary,
  },
  doseRowFull: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  doseStaticText: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  doseAmountInput: {
    width: 64,
    textAlign: 'center',
  },
  doseFrequencyPicker: {
    flex: 1,
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
  doseFrequencyPickerText: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
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
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
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
    backgroundColor: colors.greenBg,
    borderColor: colors.green,
  },
  tagText: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },
  tagTextActive: {
    color: colors.green,
    fontWeight: '500',
  },
});
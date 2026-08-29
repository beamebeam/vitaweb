import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, PrimaryButton } from '../../components/Common';
import { DatePickerField, TimePickerField, FieldLabel } from '../../components/DateTimeFields';
import { colors, spacing, fontSize, radius } from '../../utils/theme';
import { saveProfile, markOnboardingCompleted, saveMedicine } from '../../utils/storage';

const TOTAL_STEPS = 3;

const ATURAN_MAKAN_OPTIONS = ['Sebelum makan', 'Setelah makan', 'Lainnya'];

export default function OnboardingScreen({ onFinish }) {
  const [step, setStep] = useState(0);

  const [nickname, setNickname] = useState('');
  const [diagnosisDate, setDiagnosisDate] = useState('');
  const [cd4AtDiagnosis, setCd4AtDiagnosis] = useState('');
  const [faskes, setFaskes] = useState('');

  const [addMedicineNow, setAddMedicineNow] = useState(true);
  const [medName, setMedName] = useState('');
  const [medTime, setMedTime] = useState('21:00');
  const [medMealRule, setMedMealRule] = useState('Sebelum makan');
  const [medMealRuleCustom, setMedMealRuleCustom] = useState('');
  const [medStock, setMedStock] = useState('30');

  const [saving, setSaving] = useState(false);

  const goNext = () => {
    if (step === 1 && !nickname.trim()) {
      Alert.alert('Nama panggilan kosong', 'Mohon isi nama panggilan terlebih dahulu.');
      return;
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await saveProfile({
        nickname: nickname.trim(),
        diagnosisDate: diagnosisDate || null,
        cd4AtDiagnosis: cd4AtDiagnosis ? parseFloat(cd4AtDiagnosis) : null,
        faskes: faskes.trim(),
      });

      if (addMedicineNow && medName.trim()) {
        const finalMealRule = medMealRule === 'Lainnya' ? medMealRuleCustom.trim() : medMealRule;
        await saveMedicine({
          name: medName.trim(),
          category: 'ARV',
          scheduleTime: medTime,
          mealRule: finalMealRule || 'Sebelum makan',
          stockTotal: parseInt(medStock, 10) || 30,
          bottleNumber: 1,
        });
      }

      await markOnboardingCompleted();
      onFinish();
    } catch (e) {
      Alert.alert('Gagal menyimpan', 'Terjadi kesalahan, coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <View style={styles.stepDots}>
          {Array.from({ length: TOTAL_STEPS + 1 }).map((_, i) => (
            <View key={i} style={[styles.dot, i <= step && styles.dotActive]} />
          ))}
        </View>

        {step === 0 && (
          <View style={styles.centerStep}>
            <View style={styles.iconCircleLarge}>
              <Ionicons name="heart" size={36} color={colors.green} />
            </View>
            <Text style={styles.titleLarge}>Vita</Text>
            <Text style={styles.subtitleLarge}>Pendamping kesehatan{'\n'}pribadimu setiap hari</Text>
            <View style={{ width: '100%', marginTop: spacing.xl }}>
              <PrimaryButton title="Mulai sekarang" onPress={goNext} />
              <Text style={styles.note}>
                Data tersimpan hanya di perangkat ini.{'\n'}Tidak ada server, tidak ada cloud.
              </Text>
            </View>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={styles.title}>Kenalan dulu</Text>
            <Text style={styles.subtitle}>Informasi ini membantu Vita menyusun timeline kesehatanmu.</Text>

            <View style={styles.field}>
              <FieldLabel required>Nama panggilan</FieldLabel>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder="Contoh: Ari, Budi, ..."
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={styles.fieldHint}>Tidak perlu nama asli. Ini hanya untuk sapaan di aplikasi.</Text>
            </View>

            <DatePickerField
              label="Tanggal pertama diagnosis HIV (opsional)"
              value={diagnosisDate}
              onChange={setDiagnosisDate}
              placeholder="Pilih tanggal"
            />

            <View style={styles.field}>
              <FieldLabel>CD4 awal saat diagnosis (opsional)</FieldLabel>
              <TextInput
                style={styles.input}
                value={cd4AtDiagnosis}
                onChangeText={setCd4AtDiagnosis}
                keyboardType="numeric"
                placeholder="Contoh: 210"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.field}>
              <FieldLabel>Fasilitas kesehatan utama (opsional)</FieldLabel>
              <TextInput
                style={styles.input}
                value={faskes}
                onChangeText={setFaskes}
                placeholder="Contoh: RSUD Soreang"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.lockNote}>
              <Ionicons name="lock-closed-outline" size={13} color={colors.textTertiary} />
              <Text style={styles.lockNoteText}>Data ini tersimpan lokal dan tidak pernah dikirim ke mana pun.</Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.title}>Obat ARV pertama</Text>
            <Text style={styles.subtitle}>Kamu bisa menambah atau mengubah obat lain nanti dari tab Obat.</Text>

            <TouchableOpacity
              style={styles.skipRow}
              onPress={() => setAddMedicineNow(!addMedicineNow)}
            >
              <Ionicons
                name={addMedicineNow ? 'checkbox' : 'square-outline'}
                size={18}
                color={addMedicineNow ? colors.green : colors.textTertiary}
              />
              <Text style={styles.skipRowText}>Tambahkan obat ARV sekarang</Text>
            </TouchableOpacity>

            {addMedicineNow && (
              <>
                <View style={styles.field}>
                  <FieldLabel required>Nama obat ARV</FieldLabel>
                  <TextInput
                    style={styles.input}
                    value={medName}
                    onChangeText={setMedName}
                    placeholder="Contoh: TDF/3TC/DTG"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <TimePickerField label="Jam minum" required value={medTime} onChange={setMedTime} />

                <View style={styles.field}>
                  <FieldLabel required>Aturan makan</FieldLabel>
                  <View style={styles.tagRow}>
                    {ATURAN_MAKAN_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.tag, medMealRule === opt && styles.tagActive]}
                        onPress={() => setMedMealRule(opt)}
                      >
                        <Text style={[styles.tagText, medMealRule === opt && styles.tagTextActive]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {medMealRule === 'Lainnya' && (
                    <TextInput
                      style={[styles.input, { marginTop: spacing.sm }]}
                      value={medMealRuleCustom}
                      onChangeText={setMedMealRuleCustom}
                      placeholder="Tulis aturan makan..."
                      placeholderTextColor={colors.textTertiary}
                    />
                  )}
                </View>

                <View style={styles.field}>
                  <FieldLabel required>Jumlah stok saat ini (tablet)</FieldLabel>
                  <TextInput
                    style={styles.input}
                    value={medStock}
                    onChangeText={setMedStock}
                    keyboardType="numeric"
                    placeholder="30"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.centerStep}>
            <View style={styles.iconCircleLarge}>
              <Ionicons name="checkmark-circle" size={36} color={colors.green} />
            </View>
            <Text style={styles.titleLarge}>Semua siap!</Text>
            <Text style={styles.subtitleLarge}>
              Vita sudah siap menemanimu.{'\n'}Yuk mulai catat perjalanan kesehatanmu.
            </Text>
          </View>
        )}

        <View style={styles.navRow}>
          {step > 0 && step < TOTAL_STEPS && (
            <TouchableOpacity style={styles.backButton} onPress={goBack}>
              <Text style={styles.backButtonText}>Kembali</Text>
            </TouchableOpacity>
          )}
          {step > 0 && step < TOTAL_STEPS && (
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Lanjut" onPress={goNext} />
            </View>
          )}
          {step === TOTAL_STEPS && (
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Masuk ke Vita" onPress={handleFinish} disabled={saving} />
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 18,
    backgroundColor: colors.green,
  },
  centerStep: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  iconCircleLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.greenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  titleLarge: {
    fontSize: 24,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitleLarge: {
    fontSize: fontSize.bodyLg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  note: {
    fontSize: fontSize.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: spacing.md,
  },
  title: {
    fontSize: fontSize.h1 - 2,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 19,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldHint: {
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
  lockNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: spacing.sm,
  },
  lockNoteText: {
    flex: 1,
    fontSize: fontSize.caption - 1,
    color: colors.textTertiary,
    lineHeight: 14,
  },
  skipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  skipRowText: {
    fontSize: fontSize.small,
    color: colors.textPrimary,
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
  navRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
  },
  backButtonText: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
  },
});
import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { ScreenWrapper } from '../components/Common';
import { colors, spacing, fontSize, radius } from '../utils/theme';
import {
  getProfile,
  saveProfile,
  exportAllDataAsCsv,
  importAllDataFromCsv,
  clearAllData,
  getTodayDateString,
  setPinCode,
  disablePin,
  verifyPinCode,
  signOutUser,
  getSession,
} from '../utils/storage';
import PinSetupModal from './PinSetupModal';
import {
  requestNotificationPermission,
  cancelAllNotifications,
  rescheduleAllMedicineReminders,
  rescheduleControlReminder,
} from '../utils/notifications';

export default function SettingsScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const [showEditNickname, setShowEditNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');

  const [showEditFaskes, setShowEditFaskes] = useState(false);
  const [faskesInput, setFaskesInput] = useState('');

  const [showEditEmergency, setShowEditEmergency] = useState(false);
  const [emergencyInput, setEmergencyInput] = useState('');

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearConfirmInput, setClearConfirmInput] = useState('');

  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [pinVerifyInput, setPinVerifyInput] = useState('');
  const [pinVerifyPurpose, setPinVerifyPurpose] = useState(null); // 'disable' | 'change'

  const [showExportResult, setShowExportResult] = useState(false);
  const [exportedText, setExportedText] = useState('');
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  const [showImportInput, setShowImportInput] = useState(false);
  const [importText, setImportText] = useState('');

  const loadData = useCallback(async () => {
    const p = await getProfile();
    setProfile(p);
    const session = await getSession();
    setUserEmail(session?.user?.email || '');
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleOpenEditNickname = () => {
    setNicknameInput(profile?.nickname || '');
    setShowEditNickname(true);
  };

  const handleSaveNickname = async () => {
    if (!nicknameInput.trim()) {
      Alert.alert('Nama kosong', 'Mohon isi nama panggilan.');
      return;
    }
    await saveProfile({ nickname: nicknameInput.trim() });
    setShowEditNickname(false);
    await loadData();
  };

  const handleOpenEditFaskes = () => {
    setFaskesInput(profile?.faskes || '');
    setShowEditFaskes(true);
  };

  const handleSaveFaskes = async () => {
    await saveProfile({ faskes: faskesInput.trim() });
    setShowEditFaskes(false);
    await loadData();
  };

  const handleOpenEditEmergency = () => {
    setEmergencyInput(profile?.emergencyContact || '');
    setShowEditEmergency(true);
  };

  const handleSaveEmergency = async () => {
    await saveProfile({ emergencyContact: emergencyInput.trim() });
    setShowEditEmergency(false);
    await loadData();
  };

  // Toggle PIN: kalau mau AKTIFKAN -> buka setup PIN baru.
  // Kalau mau MATIKAN dan PIN sudah aktif -> minta verifikasi PIN lama dulu demi keamanan.
  const handleTogglePin = () => {
    if (profile?.pinEnabled) {
      setPinVerifyPurpose('disable');
      setPinVerifyInput('');
      setShowPinVerify(true);
    } else {
      setShowPinSetup(true);
    }
  };

  const handleOpenChangePin = () => {
    setPinVerifyPurpose('change');
    setPinVerifyInput('');
    setShowPinVerify(true);
  };

  const handleConfirmPinVerify = async () => {
    const isValid = await verifyPinCode(pinVerifyInput);
    if (!isValid) {
      Alert.alert('PIN salah', 'PIN yang kamu masukkan tidak cocok.');
      return;
    }
    setShowPinVerify(false);
    if (pinVerifyPurpose === 'disable') {
      await disablePin();
      await loadData();
      Alert.alert('PIN dimatikan', 'Aplikasi tidak akan meminta PIN lagi saat dibuka.');
    } else if (pinVerifyPurpose === 'change') {
      setShowPinSetup(true);
    }
  };

  const handlePinSetupComplete = async (newPin) => {
    await setPinCode(newPin);
    setShowPinSetup(false);
    await loadData();
    Alert.alert('PIN tersimpan', 'PIN kamu sudah aktif dan akan diminta setiap kali membuka Vita.');
  };

  const handleToggleNotifications = async () => {
    if (profile?.notificationsEnabled) {
      await cancelAllNotifications();
      await saveProfile({ notificationsEnabled: false });
      await loadData();
    } else {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Izin notifikasi ditolak',
          Platform.OS === 'web'
            ? 'Pengingat terjadwal (jam minum obat & kontrol) belum didukung di versi web Vita. Gunakan aplikasi mobile untuk fitur ini.'
            : 'Vita tidak bisa mengirim pengingat tanpa izin notifikasi. Aktifkan izin notifikasi untuk Vita di pengaturan HP kamu.'
        );
        return;
      }
      await saveProfile({ notificationsEnabled: true });
      try {
        await rescheduleAllMedicineReminders();
        await rescheduleControlReminder();
      } catch (e) {}
      await loadData();
      Alert.alert('Pengingat aktif', 'Vita akan mengingatkan jam minum obat dan jadwal kontrol.');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await exportAllDataAsCsv();
      setExportedText(csv);
      setCopiedFeedback(false);
      setShowExportResult(true);
    } catch (e) {
      Alert.alert('Gagal mengekspor', 'Terjadi kesalahan saat menyiapkan data.');
    } finally {
      setExporting(false);
    }
  };

  const handleCopyExport = async () => {
    await Clipboard.setStringAsync(exportedText);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2500);
  };

  const handleOpenImport = () => {
    setImportText('');
    setShowImportInput(true);
  };

  const handlePasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    setImportText(text);
  };

  const handleConfirmImport = () => {
    if (!importText.trim()) {
      Alert.alert('Teks kosong', 'Tempel (paste) data backup terlebih dahulu.');
      return;
    }
    if (!importText.includes('===SECTION:')) {
      Alert.alert('Format tidak dikenali', 'Teks ini sepertinya bukan hasil ekspor Vita. Pastikan kamu menempel teks lengkap dari backup.');
      return;
    }

    Alert.alert(
      'Impor data?',
      'Semua data yang ada saat ini akan DIGANTI dengan data dari teks backup ini. Tindakan ini tidak bisa dibatalkan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, impor',
          style: 'destructive',
          onPress: async () => {
            setImporting(true);
            try {
              await importAllDataFromCsv(importText);
              await loadData();
              setShowImportInput(false);
              Alert.alert('Berhasil', 'Data berhasil diimpor.');
            } catch (e) {
              Alert.alert('Gagal mengimpor', 'Teks tidak valid atau rusak.');
            } finally {
              setImporting(false);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Keluar dari akun?', 'Kamu bisa login lagi kapan saja dengan email dan password yang sama.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await signOutUser();
        },
      },
    ]);
  };

  const handleConfirmClearAll = async () => {
    const today = getTodayDateString();
    if (clearConfirmInput.trim() !== today) {
      Alert.alert('Konfirmasi tidak cocok', `Ketik tanggal hari ini (${today}) dengan benar.`);
      return;
    }
    await clearAllData();
    setShowClearConfirm(false);
    Alert.alert('Selesai', 'Semua data telah dihapus. Silakan tutup dan buka ulang aplikasi.');
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pengaturan</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        <Text style={styles.sectionHeading}>Akun</Text>
        <View style={styles.sectionCard}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: colors.greenBg }]}>
              <Ionicons name="mail-outline" size={16} color={colors.green} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Login sebagai</Text>
              <Text style={styles.rowSub}>{userEmail || '-'}</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.row, { borderBottomWidth: 0 }]} onPress={handleSignOut}>
            <View style={[styles.rowIcon, { backgroundColor: colors.redBg }]}>
              <Ionicons name="log-out-outline" size={16} color={colors.red} />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: colors.red }]}>Keluar</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeading}>Profil</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.row} onPress={handleOpenEditNickname}>
            <View style={[styles.rowIcon, { backgroundColor: colors.greenBg }]}>
              <Ionicons name="person-outline" size={16} color={colors.green} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Nama panggilan</Text>
              <Text style={styles.rowSub}>{profile?.nickname || 'Belum diatur'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={handleOpenEditFaskes}>
            <View style={[styles.rowIcon, { backgroundColor: colors.greenBg }]}>
              <Ionicons name="medkit-outline" size={16} color={colors.green} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Faskes utama</Text>
              <Text style={styles.rowSub}>{profile?.faskes || 'Belum diatur'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, { borderBottomWidth: 0 }]} onPress={handleOpenEditEmergency}>
            <View style={[styles.rowIcon, { backgroundColor: colors.redBg }]}>
              <Ionicons name="call-outline" size={16} color={colors.red} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Nomor darurat</Text>
              <Text style={styles.rowSub}>{profile?.emergencyContact || 'Belum diatur'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeading}>Notifikasi</Text>
        <View style={styles.sectionCard}>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.greenBg }]}>
              <Ionicons name="notifications-outline" size={16} color={colors.green} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Pengingat obat & kontrol</Text>
              <Text style={styles.rowSub}>
                {profile?.notificationsEnabled ? 'Aktif · sesuai jam minum tiap obat' : 'Nonaktif'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, profile?.notificationsEnabled ? styles.toggleOn : styles.toggleOff]}
              onPress={handleToggleNotifications}
            >
              <View style={[styles.toggleKnob, profile?.notificationsEnabled && styles.toggleKnobOn]} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Keamanan</Text>
        <View style={styles.sectionCard}>
          <View style={[styles.row, !profile?.pinEnabled && { borderBottomWidth: 0 }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.greenBg }]}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.green} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Kunci PIN</Text>
              <Text style={styles.rowSub}>
                {profile?.pinEnabled ? 'Aktif · diminta saat membuka Vita' : 'Nonaktif'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, profile?.pinEnabled ? styles.toggleOn : styles.toggleOff]}
              onPress={handleTogglePin}
            >
              <View style={[styles.toggleKnob, profile?.pinEnabled && styles.toggleKnobOn]} />
            </TouchableOpacity>
          </View>
          {profile?.pinEnabled && (
            <TouchableOpacity style={[styles.row, { borderBottomWidth: 0 }]} onPress={handleOpenChangePin}>
              <View style={[styles.rowIcon, { backgroundColor: colors.cardBg }]}>
                <Ionicons name="key-outline" size={16} color={colors.textSecondary} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Ubah PIN</Text>
                <Text style={styles.rowSub}>Ganti 6 digit PIN saat ini</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionHeading}>Data & backup</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.row} onPress={handleExport} disabled={exporting}>
            <View style={[styles.rowIcon, { backgroundColor: colors.cardBg }]}>
              <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Ekspor data</Text>
              <Text style={styles.rowSub}>{exporting ? 'Menyiapkan...' : 'Salin semua data sebagai teks'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, { borderBottomWidth: 0 }]} onPress={handleOpenImport} disabled={importing}>
            <View style={[styles.rowIcon, { backgroundColor: colors.cardBg }]}>
              <Ionicons name="clipboard-outline" size={16} color={colors.textSecondary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Impor data</Text>
              <Text style={styles.rowSub}>{importing ? 'Memproses...' : 'Tempel teks backup untuk memulihkan'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionNote}>
          Ekspor akan menyalin seluruh data (profil, obat, log minum, riwayat botol, kontrol, timeline) sebagai teks ke clipboard.
          Tempel ke Notes, WhatsApp ke diri sendiri, atau email sebagai cadangan. Untuk memulihkan, salin teks itu lalu gunakan menu Impor.
        </Text>

        <Text style={styles.sectionHeading}>Tentang</Text>
        <View style={styles.sectionCard}>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.cardBg }]}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Privasi</Text>
              <Text style={styles.rowSub}>Data tersimpan aman di akunmu (Supabase) dan dilindungi lewat login - pengguna lain tidak bisa melihat datamu.</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Zona berbahaya</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => { setClearConfirmInput(''); setShowClearConfirm(true); }}
          >
            <View style={[styles.rowIcon, { backgroundColor: colors.redBg }]}>
              <Ionicons name="trash-outline" size={16} color={colors.red} />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: colors.red }]}>Hapus semua data</Text>
              <Text style={styles.rowSub}>Tidak bisa dibatalkan. Ekspor dulu kalau perlu cadangan.</Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Modal visible={showEditNickname} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Ubah nama panggilan</Text>
            <TextInput
              style={styles.modalInput}
              value={nicknameInput}
              onChangeText={setNicknameInput}
              placeholder="Nama panggilan"
              placeholderTextColor={colors.textTertiary}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditNickname(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveNickname}>
                <Text style={styles.modalSaveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditFaskes} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Ubah faskes utama</Text>
            <TextInput
              style={styles.modalInput}
              value={faskesInput}
              onChangeText={setFaskesInput}
              placeholder="Contoh: RSUD Soreang"
              placeholderTextColor={colors.textTertiary}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditFaskes(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveFaskes}>
                <Text style={styles.modalSaveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditEmergency} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Ubah nomor darurat</Text>
            <Text style={styles.modalSub}>Nomor kontak yang bisa dihubungi saat keadaan darurat (keluarga, teman dekat, atau faskes).</Text>
            <TextInput
              style={styles.modalInput}
              value={emergencyInput}
              onChangeText={setEmergencyInput}
              placeholder="Contoh: 0812-3456-7890"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditEmergency(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveEmergency}>
                <Text style={styles.modalSaveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showClearConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Hapus semua data?</Text>
            <Text style={styles.modalSub}>
              Semua profil, obat, log, kontrol, dan timeline akan terhapus permanen. Ketik tanggal hari ini ({getTodayDateString()}) untuk konfirmasi:
            </Text>
            <TextInput
              style={styles.modalInput}
              value={clearConfirmInput}
              onChangeText={setClearConfirmInput}
              placeholder={getTodayDateString()}
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowClearConfirm(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDeleteBtn} onPress={handleConfirmClearAll}>
                <Text style={styles.modalSaveText}>Hapus semua</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Hasil export - tampilkan teks + tombol copy */}
      <Modal visible={showExportResult} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Data berhasil disiapkan</Text>
            <Text style={styles.modalSub}>
              Ketuk "Salin ke clipboard" lalu tempel (paste) ke Notes, WhatsApp, atau email untuk disimpan sebagai cadangan.
            </Text>
            <ScrollView style={styles.exportPreviewBox}>
              <Text style={styles.exportPreviewText}>{exportedText}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyExport}>
              <Ionicons
                name={copiedFeedback ? 'checkmark-circle' : 'copy-outline'}
                size={16}
                color={colors.screenBg}
              />
              <Text style={styles.copyButtonText}>
                {copiedFeedback ? 'Tersalin!' : 'Salin ke clipboard'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtnFull} onPress={() => setShowExportResult(false)}>
              <Text style={styles.modalCancelText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Import - tempel teks backup */}
      <Modal visible={showImportInput} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Impor data</Text>
            <Text style={styles.modalSub}>
              Tempel teks backup yang sebelumnya disalin lewat menu Ekspor.
            </Text>
            <TouchableOpacity style={styles.pasteButton} onPress={handlePasteFromClipboard}>
              <Ionicons name="clipboard-outline" size={15} color={colors.green} />
              <Text style={styles.pasteButtonText}>Tempel dari clipboard</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.importTextarea}
              value={importText}
              onChangeText={setImportText}
              placeholder="Tempel teks backup di sini..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={8}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowImportInput(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleConfirmImport} disabled={importing}>
                <Text style={styles.modalSaveText}>Impor</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Verifikasi PIN lama sebelum disable atau ubah PIN */}
      <Modal visible={showPinVerify} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Masukkan PIN saat ini</Text>
            <Text style={styles.modalSub}>
              {pinVerifyPurpose === 'disable'
                ? 'Untuk mematikan kunci PIN, masukkan PIN kamu saat ini.'
                : 'Untuk mengubah PIN, masukkan PIN kamu saat ini.'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={pinVerifyInput}
              onChangeText={setPinVerifyInput}
              placeholder="6 digit PIN"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPinVerify(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleConfirmPinVerify}>
                <Text style={styles.modalSaveText}>Lanjutkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PinSetupModal
        visible={showPinSetup}
        onClose={() => setShowPinSetup(false)}
        onComplete={handlePinSetupComplete}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
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
    fontSize: fontSize.caption,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.cardBgWhite,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionNote: {
    fontSize: fontSize.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: fontSize.small,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
  },
  toggleOn: {
    backgroundColor: colors.green,
    alignItems: 'flex-end',
  },
  toggleOff: {
    backgroundColor: colors.border,
    alignItems: 'flex-start',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleKnobOn: {},
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
    marginBottom: spacing.sm,
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
  exportPreviewBox: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.sm,
    maxHeight: 220,
    marginBottom: spacing.md,
  },
  exportPreviewText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.green,
    borderRadius: radius.md,
    paddingVertical: 12,
    marginBottom: spacing.sm,
  },
  copyButtonText: {
    color: colors.screenBg,
    fontSize: fontSize.small,
    fontWeight: '500',
  },
  modalCancelBtnFull: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 0.5,
    borderColor: colors.green,
    backgroundColor: colors.greenBg,
    borderRadius: radius.md,
    paddingVertical: 9,
    marginBottom: spacing.sm,
  },
  pasteButtonText: {
    color: colors.green,
    fontSize: fontSize.caption,
    fontWeight: '500',
  },
  importTextarea: {
    backgroundColor: colors.cardBg,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: fontSize.caption,
    color: colors.textPrimary,
    minHeight: 140,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
});
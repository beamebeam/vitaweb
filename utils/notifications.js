import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getActiveMedicines, getUpcomingControlVisit } from './storage';

// Browser tidak mendukung notifikasi terjadwal berulang (calendar trigger) seperti di HP -
// ini keterbatasan platform web, bukan bug. Semua fungsi di bawah jadi no-op aman di web
// supaya tidak error, tapi fitur pengingat memang tidak akan aktif kalau dibuka lewat browser.
const isWeb = Platform.OS === 'web';

// Konfigurasi default: notifikasi tetap muncul sebagai banner + suara walau app sedang dibuka
if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Minta izin notifikasi ke user - wajib dipanggil sebelum menjadwalkan apa pun
export async function requestNotificationPermission() {
  if (isWeb) {
    console.log('Pengingat notifikasi terjadwal tidak didukung di versi web.');
    return false;
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Pengingat Vita',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  return finalStatus === 'granted';
}

export async function getNotificationPermissionStatus() {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// ID notifikasi memakai prefix supaya bisa dikenali & dibersihkan per kategori
const MEDICINE_NOTIF_PREFIX = 'vita-med-';
const CONTROL_NOTIF_ID = 'vita-control-reminder';

// Membatalkan semua notifikasi obat yang terjadwal sebelumnya, supaya tidak dobel saat dijadwalkan ulang
async function cancelAllMedicineNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const medicineNotifs = scheduled.filter((n) => n.identifier?.startsWith(MEDICINE_NOTIF_PREFIX));
  for (const notif of medicineNotifs) {
    await Notifications.cancelScheduledNotificationAsync(notif.identifier);
  }
}

// Menjadwalkan ulang SEMUA notifikasi pengingat obat, berdasarkan jam minum tiap obat aktif.
// Dipanggil setiap kali ada perubahan: tambah/edit/hapus obat, atau toggle pengingat di Settings.
export async function rescheduleAllMedicineReminders() {
  if (isWeb) return;
  await cancelAllMedicineNotifications();

  const medicines = await getActiveMedicines();
  for (const med of medicines) {
    if (!med.scheduleTime) continue; // obat tanpa jam tetap (pendamping/temporer opsional) dilewati

    const [hour, minute] = med.scheduleTime.split(':').map(Number);
    if (isNaN(hour) || isNaN(minute)) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: `${MEDICINE_NOTIF_PREFIX}${med.id}`,
      content: {
        title: 'Waktunya minum obat',
        body: `${med.name} - ${med.scheduleTime} - ${med.mealRule || ''}`.trim(),
        sound: true,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
  }
}

// Menjadwalkan pengingat kontrol H-3 dan H-1 dari jadwal kontrol terdekat yang belum selesai.
export async function rescheduleControlReminder() {
  if (isWeb) return;
  await Notifications.cancelScheduledNotificationAsync(`${CONTROL_NOTIF_ID}-h3`).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(`${CONTROL_NOTIF_ID}-h1`).catch(() => {});

  const upcoming = await getUpcomingControlVisit();
  if (!upcoming) return;

  const visitDate = new Date(upcoming.date);
  const now = new Date();

  const h3Date = new Date(visitDate);
  h3Date.setDate(h3Date.getDate() - 3);
  h3Date.setHours(9, 0, 0, 0);

  const h1Date = new Date(visitDate);
  h1Date.setDate(h1Date.getDate() - 1);
  h1Date.setHours(9, 0, 0, 0);

  if (h3Date > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${CONTROL_NOTIF_ID}-h3`,
      content: {
        title: 'Pengingat kontrol',
        body: `Jadwal kontrol 3 hari lagi${upcoming.source?.faskes ? ` (${upcoming.source.faskes})` : ''}`,
        sound: true,
      },
      trigger: h3Date,
    });
  }

  if (h1Date > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${CONTROL_NOTIF_ID}-h1`,
      content: {
        title: 'Pengingat kontrol',
        body: `Jadwal kontrol besok${upcoming.source?.faskes ? ` (${upcoming.source.faskes})` : ''}`,
        sound: true,
      },
      trigger: h1Date,
    });
  }
}

// Membatalkan SEMUA notifikasi Vita - dipakai saat user mematikan pengingat dari Settings
export async function cancelAllNotifications() {
  if (isWeb) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
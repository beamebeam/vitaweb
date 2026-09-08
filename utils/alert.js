import { Alert as RNAlert, Platform } from 'react-native';

// ===== KENAPA FILE INI ADA =====
// Alert.alert() bawaan React Native, kalau dijalankan di web lewat react-native-web,
// adalah fungsi KOSONG (tidak melakukan apa-apa sama sekali - lihat source react-native-web:
// `class Alert { static alert() {} }`). Akibatnya semua dialog konfirmasi ("Hapus item ini?")
// dan semua pesan error/validasi di seluruh app TIDAK PERNAH muncul di web, dan tombol aksi
// di dalamnya (onPress) tidak pernah terpanggil.
//
// File ini menyediakan pengganti dengan NAMA & CARA PAKAI YANG SAMA PERSIS seperti Alert asli
// (`Alert.alert(title, message, buttons)`), supaya semua pemanggilannya di seluruh screen
// TIDAK PERLU diubah satupun - cukup ganti baris importnya saja.
// Di HP/native, ini tetap memanggil Alert asli seperti biasa (tidak ada perubahan perilaku).
// Di web, ini pakai window.alert/window.confirm bawaan browser sebagai gantinya.

function alertWeb(title, message, buttons) {
  const text = message ? `${title}\n\n${message}` : title;

  // Tanpa tombol custom, atau cuma 1 tombol -> cukup window.alert biasa
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    const onlyButton = buttons && buttons[0];
    if (onlyButton && typeof onlyButton.onPress === 'function') onlyButton.onPress();
    return;
  }

  // 2 tombol atau lebih (misal Batal/Hapus) -> pakai window.confirm.
  // Tombol dengan style 'cancel' dianggap tombol batal, sisanya dianggap tombol aksi utama.
  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const actionButton = buttons.find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];

  const confirmed = window.confirm(text);
  const target = confirmed ? actionButton : cancelButton;
  if (target && typeof target.onPress === 'function') target.onPress();
}

const Alert = {
  alert(title, message, buttons) {
    if (Platform.OS === 'web') {
      alertWeb(title, message, buttons);
    } else {
      RNAlert.alert(title, message, buttons);
    }
  },
};

export default Alert;

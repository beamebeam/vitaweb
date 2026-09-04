import { useWindowDimensions, Platform } from 'react-native';

// Lebar minimum (px) supaya dianggap "desktop" - di bawah ini tetap pakai tampilan mobile
// (termasuk kalau browser desktop tapi jendelanya dikecilkan, tetap fallback ke mobile).
export const DESKTOP_BREAKPOINT = 900;

// Cuma aktif di web - di aplikasi mobile native (Expo Go / build iOS/Android) selalu false,
// supaya tidak ada perubahan perilaku sama sekali untuk pengguna HP.
export function useIsDesktop() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
}

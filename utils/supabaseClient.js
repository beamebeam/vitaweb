import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ambil dari environment variable. Untuk build web (Vercel/lokal), variabel ini HARUS
// diawali "EXPO_PUBLIC_" supaya Expo/Metro ikut membundelnya ke kode client.
// Lihat README.md bagian "Setup Supabase" untuk cara mendapatkan nilai ini.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Tidak melempar error supaya app tetap bisa di-build; tapi jelas kelihatan di console
  // kalau env var belum diisi, supaya gampang di-debug.
  console.warn(
    '[Vita] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY belum diset. ' +
    'Buat file .env (lihat .env.example) atau set Environment Variables di Vercel.'
  );
}

// Di web, sesi login disimpan otomatis lewat localStorage bawaan browser.
// Di native (iOS/Android), dipakai AsyncStorage supaya sesi tetap tersimpan antar-buka-app.
const authStorage = Platform.OS === 'web' ? undefined : AsyncStorage;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'public-anon-key-placeholder',
  {
    auth: {
      storage: authStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

export function isSupabaseConfigured() {
  return !!supabaseUrl && !!supabaseAnonKey;
}

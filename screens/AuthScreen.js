import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Alert from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, PrimaryButton } from '../components/Common';
import { colors, spacing, fontSize, radius } from '../utils/theme';
import { signInWithEmail, signUpWithEmail, resetPasswordForEmail } from '../utils/storage';
import { isSupabaseConfigured } from '../utils/supabaseClient';

export default function AuthScreen() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const configured = isSupabaseConfigured();

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Lengkapi data', 'Isi email dan password terlebih dahulu.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password terlalu pendek', 'Password minimal 6 karakter.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email.trim(), password);
        Alert.alert(
          'Akun berhasil dibuat',
          'Kalau konfirmasi email diaktifkan di project Supabase kamu, cek inbox email untuk verifikasi sebelum login. Kalau tidak, kamu sudah bisa langsung masuk.'
        );
        setMode('signin');
      } else {
        await signInWithEmail(email.trim(), password);
        // Setelah berhasil, App.js akan otomatis mendeteksi perubahan sesi login
      }
    } catch (e) {
      Alert.alert('Gagal', e.message || 'Terjadi kesalahan, coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Isi email dulu', 'Masukkan email kamu di atas, lalu ketuk "Lupa password?" lagi.');
      return;
    }
    try {
      await resetPasswordForEmail(email.trim());
      Alert.alert('Email terkirim', 'Link untuk reset password sudah dikirim ke email kamu.');
    } catch (e) {
      Alert.alert('Gagal', e.message || 'Terjadi kesalahan, coba lagi.');
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.iconCircle}>
            <Ionicons name="heart" size={32} color={colors.green} />
          </View>
          <Text style={styles.title}>Vita</Text>
          <Text style={styles.subtitle}>
            {mode === 'signin' ? 'Masuk ke akunmu' : 'Buat akun baru'}
          </Text>

          {!configured && (
            <View style={styles.warningBox}>
              <Ionicons name="warning-outline" size={16} color={colors.red} />
              <Text style={styles.warningText}>
                Supabase belum dikonfigurasi. Set EXPO_PUBLIC_SUPABASE_URL dan
                EXPO_PUBLIC_SUPABASE_ANON_KEY (lihat README) sebelum login/daftar bisa berfungsi.
              </Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="nama@email.com"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Minimal 6 karakter"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {mode === 'signin' && (
            <TouchableOpacity onPress={handleForgotPassword} style={{ marginBottom: spacing.lg }}>
              <Text style={styles.linkText}>Lupa password?</Text>
            </TouchableOpacity>
          )}

          {loading ? (
            <ActivityIndicator size="small" color={colors.green} style={{ marginVertical: spacing.md }} />
          ) : (
            <PrimaryButton
              title={mode === 'signin' ? 'Masuk' : 'Daftar'}
              onPress={handleSubmit}
            />
          )}

          <TouchableOpacity
            style={styles.switchModeRow}
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            <Text style={styles.switchModeText}>
              {mode === 'signin' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
              <Text style={styles.switchModeTextBold}>
                {mode === 'signin' ? 'Daftar di sini' : 'Masuk di sini'}
              </Text>
            </Text>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Data kesehatanmu tersimpan aman di akunmu sendiri dan tidak bisa dilihat pengguna lain.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.greenBg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.bodyLg,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.redBg,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.red,
    lineHeight: 16,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
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
  linkText: {
    fontSize: fontSize.caption,
    color: colors.green,
    textAlign: 'right',
  },
  switchModeRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
  },
  switchModeTextBold: {
    color: colors.green,
    fontWeight: '500',
  },
  footerNote: {
    fontSize: fontSize.caption - 1,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 15,
  },
});

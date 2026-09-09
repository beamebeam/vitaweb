import React from 'react';
import { View, Text, StyleSheet, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../utils/theme';

// ===== ScreenWrapper =====
// Pembungkus halaman yang menghitung status bar dengan benar di Android & iOS
// Ini memperbaiki masalah konten tertutup status bar
export function ScreenWrapper({ children, style }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.wrapper,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
        style,
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.screenBg} />
      {children}
    </View>
  );
}

// ===== ScreenHeader =====
// Header standar dengan judul dan tombol back opsional
export function ScreenHeader({ title, onBack, rightIcon, onRightPress }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {onBack && (
          <Ionicons
            name="arrow-back"
            size={20}
            color={colors.textSecondary}
            onPress={onBack}
            style={{ marginRight: spacing.sm }}
          />
        )}
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      {rightIcon && (
        <Ionicons
          name={rightIcon}
          size={20}
          color={colors.textSecondary}
          onPress={onRightPress}
        />
      )}
    </View>
  );
}

// ===== BottomNav =====
const NAV_ITEMS = [
  { key: 'Beranda', icon: 'home', label: 'Beranda' },
  { key: 'Obat', icon: 'medical-outline', label: 'Obat' },
  { key: 'Kontrol', icon: 'pulse-outline', label: 'Kontrol' },
  { key: 'Timeline', icon: 'time-outline', label: 'Timeline' },
];

export function BottomNav({ activeTab, onTabPress }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.navbar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.navItem}
            onPress={() => onTabPress(item.key)}
          >
            <Ionicons
              name={isActive ? item.icon.replace('-outline', '') : item.icon}
              size={20}
              color={isActive ? colors.green : colors.textTertiary}
            />
            <Text
              style={[
                styles.navLabel,
                isActive && { color: colors.green, fontWeight: '500' },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ===== Badge =====
export function Badge({ text, variant = 'gray' }) {
  const variants = {
    green: { bg: colors.greenBg, text: colors.green },
    amber: { bg: colors.amberBg, text: colors.amber },
    red: { bg: colors.redBg, text: colors.red },
    gray: { bg: colors.cardBg, text: colors.textSecondary },
  };
  const v = variants[variant] || variants.gray;
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      <Text style={[styles.badgeText, { color: v.text }]}>{text}</Text>
    </View>
  );
}

// ===== Card =====
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ===== PrimaryButton =====
export function PrimaryButton({ title, onPress, variant = 'primary', disabled }) {
  const variants = {
    primary: { bg: colors.green, text: colors.screenBg },
    secondary: { bg: colors.cardBg, text: colors.green, border: colors.green },
    danger: { bg: colors.redBg, text: colors.red, border: colors.red },
  };
  const v = variants[variant] || variants.primary;
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border, borderWidth: v.border ? 1 : 0 },
        disabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <Text style={[styles.buttonText, { color: v.text }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.h2,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    backgroundColor: colors.screenBg,
  },
  navItem: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.md,
  },
  navLabel: {
    fontSize: fontSize.caption - 1,
    color: colors.textTertiary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: fontSize.caption - 1,
    fontWeight: '500',
  },
  card: {
    backgroundColor: colors.cardBgWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  button: {
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: fontSize.bodyLg,
    fontWeight: '500',
  },
});
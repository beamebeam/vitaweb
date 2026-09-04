import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../utils/theme';

// Item navigasi sama seperti BottomNav (Common.js), supaya tab mobile & sidebar desktop
// selalu konsisten kalau nanti ada perubahan menu.
const NAV_ITEMS = [
  { key: 'Beranda', icon: 'home-outline', iconActive: 'home', label: 'Beranda' },
  { key: 'Obat', icon: 'medical-outline', iconActive: 'medical', label: 'Obat' },
  { key: 'Kontrol', icon: 'pulse-outline', iconActive: 'pulse', label: 'Kontrol' },
  { key: 'Timeline', icon: 'time-outline', iconActive: 'time', label: 'Timeline' },
  { key: 'Pengaturan', icon: 'settings-outline', iconActive: 'settings', label: 'Pengaturan' },
];

// Sidebar kiri untuk tampilan desktop - menggantikan tab bar bawah yang dipakai di mobile.
export default function SidebarNav({ activeTab, onTabPress }) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.brandRow}>
        <View style={styles.brandIcon}>
          <Ionicons name="heart" size={18} color={colors.screenBg} />
        </View>
        <Text style={styles.brandText}>Vita</Text>
      </View>

      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onTabPress(item.key)}
            >
              <Ionicons
                name={isActive ? item.iconActive : item.icon}
                size={19}
                color={isActive ? colors.green : colors.textSecondary}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 220,
    borderRightWidth: 0.5,
    borderRightColor: colors.border,
    backgroundColor: colors.cardBgWhite,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xl,
  },
  brandIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: fontSize.h2,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  navList: {
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  navItemActive: {
    backgroundColor: colors.greenBg,
  },
  navLabel: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
  },
  navLabelActive: {
    color: colors.green,
    fontWeight: '600',
  },
});

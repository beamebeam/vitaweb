import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../utils/theme';
import { verifyPinCode } from '../utils/storage';

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

export default function PinLockScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePress = async (key) => {
    if (key === '') return;
    setError(false);

    if (key === 'del') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (pin.length >= 6) return;
    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === 6) {
      const isValid = await verifyPinCode(newPin);
      if (isValid) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 600);
      }
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.lockIcon}>
        <Ionicons name="heart" size={28} color="#fff" />
      </View>
      <Text style={styles.title}>Vita</Text>
      <Text style={styles.subtitle}>Masukkan PIN untuk membuka</Text>

      <View style={styles.pinDots}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.pinDot,
              i < pin.length && styles.pinDotFilled,
              error && styles.pinDotError,
            ]}
          />
        ))}
      </View>

      {error && <Text style={styles.errorText}>PIN salah, coba lagi</Text>}

      <View style={styles.keypad}>
        {KEYPAD_ROWS.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.keypadRow}>
            {row.map((key, keyIdx) => (
              <TouchableOpacity
                key={keyIdx}
                style={[styles.key, key === '' && styles.keyEmpty]}
                onPress={() => handlePress(key)}
                disabled={key === ''}
              >
                {key === 'del' ? (
                  <Ionicons name="backspace-outline" size={22} color="rgba(255,255,255,0.8)" />
                ) : (
                  <Text style={styles.keyText}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  lockIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: fontSize.small,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.xl,
  },
  pinDots: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.lg,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  pinDotFilled: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  pinDotError: {
    backgroundColor: '#F09595',
    borderColor: '#F09595',
  },
  errorText: {
    fontSize: fontSize.caption,
    color: '#FCEBEB',
    marginBottom: spacing.md,
  },
  keypad: {
    gap: 14,
    marginTop: spacing.md,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 22,
  },
  key: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyEmpty: {
    backgroundColor: 'transparent',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#fff',
  },
});
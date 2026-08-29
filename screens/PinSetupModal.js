import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../utils/theme';

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

// step: 'enter' (isi PIN baru) -> 'confirm' (ulangi PIN untuk konfirmasi)
export default function PinSetupModal({ visible, onClose, onComplete }) {
  const [step, setStep] = useState('enter');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setStep('enter');
    setFirstPin('');
    setPin('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePress = (key) => {
    if (key === '') return;
    setError('');

    if (key === 'del') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (pin.length >= 6) return;
    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === 6) {
      if (step === 'enter') {
        setFirstPin(newPin);
        setPin('');
        setStep('confirm');
      } else {
        if (newPin === firstPin) {
          onComplete(newPin);
          reset();
        } else {
          setError('PIN tidak cocok, coba lagi dari awal');
          setTimeout(() => {
            setPin('');
            setStep('enter');
            setFirstPin('');
          }, 800);
        }
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.title}>
            {step === 'enter' ? 'Buat PIN baru' : 'Ulangi PIN'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'enter' ? 'Masukkan 6 digit angka' : 'Masukkan sekali lagi untuk konfirmasi'}
          </Text>

          <View style={styles.pinDots}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={[styles.pinDot, i < pin.length && styles.pinDotFilled]} />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : <View style={{ height: 18 }} />}

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
                      <Ionicons name="backspace-outline" size={20} color={colors.textSecondary} />
                    ) : (
                      <Text style={styles.keyText}>{key}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.screenBg,
    borderTopLeftRadius: radius.lg + 6,
    borderTopRightRadius: radius.lg + 6,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.lg,
    zIndex: 1,
  },
  title: {
    fontSize: fontSize.h2,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  pinDots: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.sm,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  pinDotFilled: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  errorText: {
    fontSize: fontSize.caption,
    color: colors.red,
    marginBottom: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  keypad: {
    gap: 12,
    marginTop: spacing.md,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 20,
  },
  key: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyEmpty: {
    backgroundColor: 'transparent',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});
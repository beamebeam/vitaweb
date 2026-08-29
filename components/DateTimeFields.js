import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, fontSize, radius } from '../utils/theme';
import { formatDateIndo } from '../utils/storage';

// ===== Helper konversi =====
function dateStringToDate(dateString) {
  if (dateString && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

function dateToDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function timeStringToDate(timeString) {
  const date = new Date();
  if (timeString && /^\d{1,2}:\d{2}$/.test(timeString)) {
    const [h, m] = timeString.split(':').map(Number);
    date.setHours(h, m, 0, 0);
  }
  return date;
}

function dateToTimeString(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ===== FieldLabel dengan tanda wajib =====
export function FieldLabel({ children, required }) {
  return (
    <Text style={styles.fieldLabel}>
      {children}
      {required && <Text style={styles.requiredMark}> *</Text>}
    </Text>
  );
}

// ===== Style input HTML native untuk web (dipakai hanya saat Platform.OS === 'web') =====
const webInputStyle = {
  backgroundColor: colors.cardBg,
  border: `0.5px solid ${colors.border}`,
  borderRadius: radius.md,
  paddingLeft: spacing.md,
  paddingRight: spacing.md,
  paddingTop: 10,
  paddingBottom: 10,
  fontSize: fontSize.body,
  color: colors.textPrimary,
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  outline: 'none',
};

// ===== DatePickerField =====
// value & onChange memakai format string 'YYYY-MM-DD' agar konsisten dengan storage
export function DatePickerField({ label, value, onChange, required, placeholder = 'Pilih tanggal' }) {
  const [showPicker, setShowPicker] = useState(false);

  // Di web, @react-native-community/datetimepicker tidak punya implementasi (render null).
  // Pakai <input type="date"> HTML asli - formatnya (YYYY-MM-DD) sudah pas dengan format storage kita.
  if (Platform.OS === 'web') {
    return (
      <View style={styles.field}>
        {label && <FieldLabel required={required}>{label}</FieldLabel>}
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={webInputStyle}
        />
      </View>
    );
  }

  const handleChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios'); // iOS pickernya inline, Android auto-close
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    if (selectedDate) {
      onChange(dateToDateString(selectedDate));
    }
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
  };

  return (
    <View style={styles.field}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <TouchableOpacity style={styles.pickerInput} onPress={() => setShowPicker(true)}>
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
          {value ? formatDateIndo(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={16} color={colors.textTertiary} />
      </TouchableOpacity>

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={dateStringToDate(value)}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      )}

      {showPicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="fade">
          <View style={styles.iosModalOverlay}>
            <View style={styles.iosModalBox}>
              <View style={styles.iosModalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.iosModalCancel}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.iosModalDone}>Selesai</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateStringToDate(value)}
                mode="date"
                display="spinner"
                onChange={handleChange}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ===== TimePickerField =====
// value & onChange memakai format string 'HH:MM'
export function TimePickerField({ label, value, onChange, required, placeholder = 'Pilih jam' }) {
  const [showPicker, setShowPicker] = useState(false);

  // Sama seperti DatePickerField - di web pakai <input type="time"> bawaan browser.
  // Formatnya (HH:MM, 24 jam) sudah pas dengan format storage kita.
  if (Platform.OS === 'web') {
    return (
      <View style={styles.field}>
        {label && <FieldLabel required={required}>{label}</FieldLabel>}
        <input
          type="time"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={webInputStyle}
        />
      </View>
    );
  }

  const handleChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    if (selectedDate) {
      onChange(dateToTimeString(selectedDate));
    }
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
  };

  return (
    <View style={styles.field}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <TouchableOpacity style={styles.pickerInput} onPress={() => setShowPicker(true)}>
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
          {value || placeholder}
        </Text>
        <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
      </TouchableOpacity>

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={timeStringToDate(value)}
          mode="time"
          is24Hour
          display="default"
          onChange={handleChange}
        />
      )}

      {showPicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="fade">
          <View style={styles.iosModalOverlay}>
            <View style={styles.iosModalBox}>
              <View style={styles.iosModalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.iosModalCancel}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.iosModalDone}>Selesai</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={timeStringToDate(value)}
                mode="time"
                is24Hour
                display="spinner"
                onChange={handleChange}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSize.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  requiredMark: {
    color: colors.red,
    fontWeight: '700',
  },
  pickerInput: {
    backgroundColor: colors.cardBg,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerValue: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
  },
  pickerPlaceholder: {
    fontSize: fontSize.body,
    color: colors.textTertiary,
  },
  iosModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  iosModalBox: {
    backgroundColor: colors.screenBg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.lg,
  },
  iosModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  iosModalCancel: {
    fontSize: fontSize.body,
    color: colors.textSecondary,
  },
  iosModalDone: {
    fontSize: fontSize.body,
    color: colors.green,
    fontWeight: '500',
  },
});
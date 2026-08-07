import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Switch, Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme';
import { MedicineReminder, RepeatType } from '../types/medicine';

interface AddEditReminderModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (reminder: Omit<MedicineReminder, 'id' | 'createdAt' | 'updatedAt' | 'notificationIds'>) => Promise<void>;
  editingReminder?: MedicineReminder;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AddEditReminderModal({
  visible,
  onClose,
  onSave,
  editingReminder,
}: AddEditReminderModalProps) {
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [repeat, setRepeat] = useState<RepeatType>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [startDate, setStartDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState(new Date());
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load editing data
  useEffect(() => {
    if (editingReminder) {
      setMedicineName(editingReminder.medicineName);
      setDosage(editingReminder.dosage);
      const [hours, minutes] = editingReminder.time.split(':').map(Number);
      const timeDate = new Date();
      timeDate.setHours(hours, minutes);
      setTime(timeDate);
      setRepeat(editingReminder.repeat);
      setSelectedDays(editingReminder.selectedDays || [0, 1, 2, 3, 4, 5, 6]);
      setStartDate(new Date(editingReminder.startDate));
      setHasEndDate(!!editingReminder.endDate);
      setEndDate(editingReminder.endDate ? new Date(editingReminder.endDate) : new Date());
      setNotes(editingReminder.notes || '');
      setEnabled(editingReminder.enabled);
    } else {
      resetForm();
    }
  }, [editingReminder, visible]);

  const resetForm = () => {
    setMedicineName('');
    setDosage('');
    setTime(new Date());
    setRepeat('daily');
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    setStartDate(new Date());
    setHasEndDate(false);
    setEndDate(new Date());
    setNotes('');
    setEnabled(true);
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleSave = async () => {
    if (!medicineName.trim() || !dosage.trim()) {
      alert('Please enter medicine name and dosage');
      return;
    }

    if (repeat === 'custom' && selectedDays.length === 0) {
      alert('Please select at least one day');
      return;
    }

    setSaving(true);
    try {
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');

      await onSave({
        medicineName: medicineName.trim(),
        dosage: dosage.trim(),
        time: `${hours}:${minutes}`,
        repeat,
        selectedDays: repeat === 'custom' ? selectedDays : undefined,
        startDate: startDate.toISOString(),
        endDate: hasEndDate ? endDate.toISOString() : undefined,
        notes: notes.trim() || undefined,
        enabled,
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error('Error saving reminder:', error);
      alert('Failed to save reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {editingReminder ? 'Edit Reminder' : 'Add Reminder'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <ScrollView style={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Medicine Name */}
              <View style={styles.field}>
                <Text style={styles.label}>Medicine Name *</Text>
                <TextInput
                  style={styles.input}
                  value={medicineName}
                  onChangeText={setMedicineName}
                  placeholder="e.g., Folic Acid"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

            {/* Dosage */}
            <View style={styles.field}>
              <Text style={styles.label}>Dosage *</Text>
              <TextInput
                style={styles.input}
                value={dosage}
                onChangeText={setDosage}
                placeholder="e.g., 1 Tablet"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Time */}
            <View style={styles.field}>
              <Text style={styles.label}>Time *</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="time"
                  value={`${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':');
                    const newTime = new Date(time);
                    newTime.setHours(parseInt(hours), parseInt(minutes));
                    setTime(newTime);
                  }}
                  style={{
                    backgroundColor: Colors.surfaceSecondary,
                    borderRadius: Radius.md,
                    padding: Spacing.md,
                    border: `1px solid ${Colors.border}`,
                    fontSize: 14,
                    color: Colors.textPrimary,
                    width: '100%',
                  }}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={styles.inputText}>
                      {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                  {showTimePicker && (
                    <DateTimePicker
                      value={time}
                      mode="time"
                      is24Hour={false}
                      onChange={(event, selectedTime) => {
                        setShowTimePicker(Platform.OS === 'ios');
                        if (selectedTime) setTime(selectedTime);
                      }}
                    />
                  )}
                </>
              )}
            </View>

            {/* Repeat Type */}
            <View style={styles.field}>
              <Text style={styles.label}>Repeat</Text>
              <View style={styles.repeatBtns}>
                <TouchableOpacity
                  style={[styles.repeatBtn, repeat === 'daily' && styles.repeatBtnActive]}
                  onPress={() => setRepeat('daily')}
                >
                  <Text style={[styles.repeatBtnText, repeat === 'daily' && styles.repeatBtnTextActive]}>
                    Daily
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.repeatBtn, repeat === 'custom' && styles.repeatBtnActive]}
                  onPress={() => setRepeat('custom')}
                >
                  <Text style={[styles.repeatBtnText, repeat === 'custom' && styles.repeatBtnTextActive]}>
                    Custom Days
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Selected Days (if custom) */}
            {repeat === 'custom' && (
              <View style={styles.field}>
                <Text style={styles.label}>Select Days *</Text>
                <View style={styles.daysRow}>
                  {DAYS_OF_WEEK.map((day, index) => {
                    const isSelected = selectedDays.includes(index);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.dayBtn, isSelected && styles.dayBtnActive]}
                        onPress={() => toggleDay(index)}
                      >
                        <Text style={[styles.dayBtnText, isSelected && styles.dayBtnTextActive]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Start Date */}
            <View style={styles.field}>
              <Text style={styles.label}>Start Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={startDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    setStartDate(newDate);
                  }}
                  style={{
                    backgroundColor: Colors.surfaceSecondary,
                    borderRadius: Radius.md,
                    padding: Spacing.md,
                    border: `1px solid ${Colors.border}`,
                    fontSize: 14,
                    color: Colors.textPrimary,
                    width: '100%',
                  }}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text style={styles.inputText}>
                      {startDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                  {showStartDatePicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      onChange={(event, selectedDate) => {
                        setShowStartDatePicker(Platform.OS === 'ios');
                        if (selectedDate) setStartDate(selectedDate);
                      }}
                    />
                  )}
                </>
              )}
            </View>

            {/* End Date Toggle */}
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Set End Date</Text>
              <Switch
                value={hasEndDate}
                onValueChange={setHasEndDate}
                trackColor={{ false: Colors.borderLight, true: Colors.primaryLight }}
                thumbColor={hasEndDate ? Colors.primary : Colors.textMuted}
              />
            </View>

            {/* End Date */}
            {hasEndDate && (
              <View style={styles.field}>
                <Text style={styles.label}>End Date</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={endDate.toISOString().split('T')[0]}
                    min={startDate.toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      setEndDate(newDate);
                    }}
                    style={{
                      backgroundColor: Colors.surfaceSecondary,
                      borderRadius: Radius.md,
                      padding: Spacing.md,
                      border: `1px solid ${Colors.border}`,
                      fontSize: 14,
                      color: Colors.textPrimary,
                      width: '100%',
                    }}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Text style={styles.inputText}>
                        {endDate.toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                    {showEndDatePicker && (
                      <DateTimePicker
                        value={endDate}
                        mode="date"
                        minimumDate={startDate}
                        onChange={(event, selectedDate) => {
                          setShowEndDatePicker(Platform.OS === 'ios');
                          if (selectedDate) setEndDate(selectedDate);
                        }}
                      />
                    )}
                  </>
                )}
              </View>
            )}

            {/* Notes */}
            <View style={styles.field}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g., Take after breakfast"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Enabled Toggle */}
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Enable Reminder</Text>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: Colors.borderLight, true: Colors.primaryLight }}
                thumbColor={enabled ? Colors.primary : Colors.textMuted}
              />
            </View>

            <View style={{ height: Spacing.xl }} />
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>
                {saving ? 'Saving...' : editingReminder ? 'Update' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 10, 46, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    maxHeight: '90%',
    ...Shadows.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  form: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  field: {
    marginBottom: Spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  inputText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  repeatBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  repeatBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  repeatBtnActive: {
    backgroundColor: Colors.primaryLight + '30',
    borderColor: Colors.primary,
  },
  repeatBtnText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  repeatBtnTextActive: {
    color: Colors.primary,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  dayBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBtnActive: {
    backgroundColor: Colors.primaryLight + '30',
    borderColor: Colors.primary,
  },
  dayBtnText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  dayBtnTextActive: {
    color: Colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    ...Typography.bodyBold,
    color: Colors.textOnAccent,
  },
});

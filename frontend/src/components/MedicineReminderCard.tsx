import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme';
import { MedicineReminder } from '../types/medicine';

interface MedicineReminderCardProps {
  reminder: MedicineReminder;
  onToggle: (id: string) => void;
  onEdit: (reminder: MedicineReminder) => void;
  onDelete: (id: string) => void;
  onMarkTaken?: () => void;
  onSnooze?: () => void;
}

export function MedicineReminderCard({ reminder, onToggle, onEdit, onDelete }: MedicineReminderCardProps) {
  const getNextReminderTime = () => {
    if (!reminder.enabled) return 'Disabled';
    
    const [hours, minutes] = reminder.time.split(':').map(Number);
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);

    if (reminderTime < now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const diffMs = reminderTime.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours === 0) {
      return `In ${diffMinutes} minutes`;
    } else if (diffHours < 24) {
      return `In ${diffHours}h ${diffMinutes}m`;
    } else {
      return `Tomorrow at ${reminder.time}`;
    }
  };

  const getRepeatText = () => {
    if (reminder.repeat === 'daily') return 'Daily';
    if (reminder.repeat === 'custom' && reminder.selectedDays) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return reminder.selectedDays.map((d) => days[d]).join(', ');
    }
    return '';
  };

  return (
    <View style={[styles.card, !reminder.enabled && styles.cardDisabled]}>
      {/* Header with Toggle */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>💊</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.medicineName}>{reminder.medicineName}</Text>
          <Text style={styles.dosage}>{reminder.dosage}</Text>
        </View>
        <Switch
          value={reminder.enabled}
          onValueChange={() => onToggle(reminder.id)}
          trackColor={{ false: Colors.border, true: Colors.primary + '40' }}
          thumbColor={reminder.enabled ? Colors.primary : Colors.textMuted}
        />
      </View>

      {/* Time and Repeat Info */}
      <View style={styles.infoRow}>
        <View style={styles.timeInfo}>
          <Text style={styles.timeLabel}>Next Reminder</Text>
          <Text style={[styles.timeValue, !reminder.enabled && styles.textDisabled]}>
            {getNextReminderTime()}
          </Text>
        </View>
        <View style={styles.repeatInfo}>
          <Text style={styles.repeatLabel}>Repeat</Text>
          <Text style={styles.repeatValue}>{getRepeatText()}</Text>
        </View>
      </View>

      {/* Notes */}
      {reminder.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notes}>📝 {reminder.notes}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(reminder)}>
          <Text style={styles.actionButtonText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => onDelete(reminder.id)}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>🗑 Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: Colors.surfaceSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  icon: {
    fontSize: 24,
  },
  headerInfo: {
    flex: 1,
  },
  medicineName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    fontSize: 16,
    marginBottom: 2,
  },
  dosage: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  timeInfo: {
    flex: 1,
    backgroundColor: Colors.lavenderBg,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.lavenderLight + '40',
  },
  timeLabel: {
    ...Typography.micro,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  timeValue: {
    ...Typography.bodyBold,
    color: Colors.primary,
    fontSize: 13,
  },
  textDisabled: {
    color: Colors.textMuted,
  },
  repeatInfo: {
    flex: 1,
    backgroundColor: Colors.tealBg,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.tealLight + '40',
  },
  repeatLabel: {
    ...Typography.micro,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  repeatValue: {
    ...Typography.bodyBold,
    color: Colors.teal,
    fontSize: 13,
  },
  notesContainer: {
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  notes: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: Colors.coralBg,
    borderColor: Colors.coral + '40',
  },
  deleteButtonText: {
    color: Colors.coral,
  },
});

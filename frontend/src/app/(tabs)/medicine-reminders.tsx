import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import { GlassCard, SectionHeader, EmptyState, Badge } from '../../components/PremiumUI';
import { MedicineReminderCard } from '../../components/MedicineReminderCard';
import AddEditReminderModal from '../../components/AddEditReminderModal';
import { useMedicineReminders } from '../../hooks/useMedicineReminders';
import { NotificationService } from '../../services/notificationService';
import { MedicineReminder } from '../../types/medicine';
import DashboardLayout from '../../components/DashboardLayout';

export default function MedicineRemindersScreen() {
  const {
    reminders,
    loading,
    addReminder,
    updateReminder,
    deleteReminder,
    toggleReminder,
    logMedicineTaken,
    snoozeReminder,
    getDashboardStats,
    refresh,
  } = useMedicineReminders();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<MedicineReminder | undefined>();
  const [hasPermission, setHasPermission] = useState(false);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const granted = await NotificationService.requestPermissions();
    setHasPermission(granted);
    if (!granted) {
      Alert.alert(
        'Notifications Disabled',
        'Please enable notifications in your device settings to receive medicine reminders.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleAddReminder = async (reminder: Omit<MedicineReminder, 'id' | 'createdAt' | 'updatedAt' | 'notificationIds'>) => {
    try {
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Please enable notifications to create reminders.');
        return;
      }
      await addReminder(reminder);
    } catch (error) {
      Alert.alert('Error', 'Failed to add reminder');
    }
  };

  const handleEditReminder = async (reminder: Omit<MedicineReminder, 'id' | 'createdAt' | 'updatedAt' | 'notificationIds'>) => {
    try {
      if (!editingReminder) return;
      await updateReminder(editingReminder.id, reminder);
      setEditingReminder(undefined);
    } catch (error) {
      Alert.alert('Error', 'Failed to update reminder');
    }
  };

  const handleDeleteReminder = (id: string) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReminder(id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete reminder');
            }
          },
        },
      ]
    );
  };

  const handleToggle = async (id: string) => {
    try {
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Please enable notifications first.');
        return;
      }
      await toggleReminder(id);
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle reminder');
    }
  };

  const handleMarkTaken = async (id: string) => {
    try {
      await logMedicineTaken(id);
      Alert.alert('Success', 'Medicine marked as taken');
    } catch (error) {
      Alert.alert('Error', 'Failed to log medicine');
    }
  };

  const handleSnooze = async (id: string) => {
    try {
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Please enable notifications first.');
        return;
      }
      await snoozeReminder(id);
      Alert.alert('Snoozed', 'Reminder will notify again in 10 minutes');
    } catch (error) {
      Alert.alert('Error', 'Failed to snooze reminder');
    }
  };

  const openEditModal = (reminder: MedicineReminder) => {
    setEditingReminder(reminder);
  };

  const closeEditModal = () => {
    setEditingReminder(undefined);
  };

  const stats = getDashboardStats();
  const activeReminders = reminders.filter((r) => r.enabled);
  const inactiveReminders = reminders.filter((r) => !r.enabled);

  return (
    <DashboardLayout title="Medicine Reminders">
      <View style={styles.screenContainer}>
      {/* Header Stats */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>
              {stats.today.total}
            </Text>
            <Text style={styles.statLabel}>Total Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.mint }]}>
              {stats.today.taken}
            </Text>
            <Text style={styles.statLabel}>Taken</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.lavender }]}>
              {stats.today.remaining}
            </Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
        </View>
      </View>

      {/* Reminders List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.primary} />
        }
      >
        {/* Active Reminders */}
        {activeReminders.length > 0 && (
          <>
            <SectionHeader title="Active Reminders" icon="💊" />
            {activeReminders.map((reminder) => (
              <MedicineReminderCard
                key={reminder.id}
                reminder={reminder}
                onToggle={() => handleToggle(reminder.id)}
                onEdit={() => openEditModal(reminder)}
                onDelete={() => handleDeleteReminder(reminder.id)}
                onMarkTaken={() => handleMarkTaken(reminder.id)}
                onSnooze={() => handleSnooze(reminder.id)}
              />
            ))}
          </>
        )}

        {/* Inactive Reminders */}
        {inactiveReminders.length > 0 && (
          <>
            <SectionHeader title="Inactive Reminders" icon="🔕" />
            {inactiveReminders.map((reminder) => (
              <MedicineReminderCard
                key={reminder.id}
                reminder={reminder}
                onToggle={() => handleToggle(reminder.id)}
                onEdit={() => openEditModal(reminder)}
                onDelete={() => handleDeleteReminder(reminder.id)}
                onMarkTaken={() => handleMarkTaken(reminder.id)}
                onSnooze={() => handleSnooze(reminder.id)}
              />
            ))}
          </>
        )}

        {/* Empty State */}
        {reminders.length === 0 && !loading && (
          <EmptyState
            emoji="💊"
            title="No Medicine Reminders"
            subtitle="Create your first reminder to never miss a dose"
            action="Add Reminder"
            onAction={() => setShowAddModal(true)}
          />
        )}

        {/* Permission Warning */}
        {!hasPermission && (
          <GlassCard accent={Colors.warning} style={{ marginTop: Spacing.md }}>
            <View style={styles.warningContent}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.warningTitle}>Notifications Disabled</Text>
                <Text style={styles.warningText}>
                  Enable notifications in your device settings to receive medicine reminders.
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.warningBtn} onPress={checkPermissions}>
              <Text style={styles.warningBtnText}>Check Again</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Add Modal */}
      <AddEditReminderModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddReminder}
      />

      {/* Edit Modal */}
      {editingReminder && (
        <AddEditReminderModal
          visible={true}
          onClose={closeEditModal}
          onSave={handleEditReminder}
          editingReminder={editingReminder}
        />
      )}
      </View>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  statsCard: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h1,
    fontWeight: '800',
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  warningIcon: {
    fontSize: 24,
  },
  warningTitle: {
    ...Typography.h4,
    color: Colors.warning,
    marginBottom: 4,
  },
  warningText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  warningBtn: {
    backgroundColor: Colors.goldBg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gold + '40',
    alignItems: 'center',
  },
  warningBtnText: {
    ...Typography.bodyBold,
    color: Colors.gold,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
  },
  fabIcon: {
    fontSize: 32,
    color: Colors.textOnAccent,
    fontWeight: '300',
  },
});

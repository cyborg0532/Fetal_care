import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import { GlassCard, ProgressBar, Badge } from './PremiumUI';
import { MedicineDashboardStats } from '../types/medicine';

interface MedicineDashboardWidgetProps {
  stats: MedicineDashboardStats;
}

export default function MedicineDashboardWidget({ stats }: MedicineDashboardWidgetProps) {
  const router = useRouter();

  const progress = stats.today.total > 0 
    ? (stats.today.taken / stats.today.total) * 100 
    : 0;

  const getProgressColor = () => {
    if (progress >= 80) return Colors.mint;
    if (progress >= 50) return Colors.gold;
    return Colors.coral;
  };

  const getNextReminder = () => {
    if (stats.upcomingToday.length === 0) return null;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Find next upcoming reminder
    const upcoming = stats.upcomingToday
      .map((reminder) => {
        const [hours, minutes] = reminder.time.split(':').map(Number);
        const reminderTime = hours * 60 + minutes;
        return { reminder, reminderTime };
      })
      .filter(({ reminderTime }) => reminderTime >= currentTime)
      .sort((a, b) => a.reminderTime - b.reminderTime);

    return upcoming[0]?.reminder || null;
  };

  const nextReminder = getNextReminder();

  if (stats.today.total === 0) {
    return (
      <GlassCard accent={Colors.lavender}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>💊</Text>
          <Text style={styles.emptyTitle}>No Medicine Reminders</Text>
          <Text style={styles.emptyText}>
            Create reminders to track your medications
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/(tabs)/medicine-reminders' as any)}
          >
            <Text style={styles.emptyBtnText}>Add Reminder</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    );
  }

  return (
    <GlassCard accent={Colors.primary}>
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/medicine-reminders' as any)}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>💊</Text>
            </View>
            <View>
              <Text style={styles.title}>Medicine Reminders</Text>
              <Text style={styles.subtitle}>Today's Progress</Text>
            </View>
          </View>
          <Badge
            label={`${stats.today.taken}/${stats.today.total}`}
            color={getProgressColor()}
          />
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <ProgressBar
            progress={progress}
            color={getProgressColor()}
            height={10}
            showLabel
          />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.mint }]}>
              {stats.today.taken}
            </Text>
            <Text style={styles.statLabel}>Taken</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.lavender }]}>
              {stats.today.remaining}
            </Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
          {stats.today.missed > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: Colors.coral }]}>
                  {stats.today.missed}
                </Text>
                <Text style={styles.statLabel}>Missed</Text>
              </View>
            </>
          )}
        </View>

        {/* Next Reminder */}
        {nextReminder && (
          <View style={styles.nextReminder}>
            <View style={styles.nextReminderHeader}>
              <Text style={styles.nextReminderLabel}>⏰ Next Up</Text>
              <Text style={styles.nextReminderTime}>{nextReminder.time}</Text>
            </View>
            <View style={styles.nextReminderContent}>
              <Text style={styles.nextReminderMedicine}>
                {nextReminder.medicineName}
              </Text>
              <Text style={styles.nextReminderDosage}>{nextReminder.dosage}</Text>
            </View>
          </View>
        )}

        {/* View All Link */}
        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={() => router.push('/(tabs)/medicine-reminders' as any)}
        >
          <Text style={styles.viewAllText}>View All Reminders</Text>
          <Text style={styles.viewAllArrow}>→</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
  },
  title: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h2,
    fontWeight: '800',
  },
  statLabel: {
    ...Typography.micro,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  nextReminder: {
    backgroundColor: Colors.lavenderBg,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.lavenderLight,
    marginBottom: Spacing.sm,
  },
  nextReminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nextReminderLabel: {
    ...Typography.caption,
    color: Colors.lavender,
    fontWeight: '600',
  },
  nextReminderTime: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  nextReminderContent: {
    marginTop: 2,
  },
  nextReminderMedicine: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  nextReminderDosage: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  viewAllBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  viewAllText: {
    ...Typography.bodyBold,
    color: Colors.primary,
    fontSize: 13,
  },
  viewAllArrow: {
    ...Typography.body,
    color: Colors.primary,
    fontSize: 16,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  emptyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  emptyBtnText: {
    ...Typography.bodyBold,
    color: Colors.textOnAccent,
    fontSize: 13,
  },
});

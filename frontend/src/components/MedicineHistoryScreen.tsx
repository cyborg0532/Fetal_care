import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme';
import { GlassCard, SectionHeader, EmptyState, Badge } from './PremiumUI';
import { MedicineLog } from '../types/medicine';

interface MedicineHistoryScreenProps {
  logs: MedicineLog[];
  onClose: () => void;
}

export default function MedicineHistoryScreen({ logs, onClose }: MedicineHistoryScreenProps) {
  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups: { [date: string]: MedicineLog[] } = {};
    
    logs.forEach((log) => {
      const date = new Date(log.scheduledTime).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
    });

    // Sort dates descending (most recent first)
    const sortedDates = Object.keys(groups).sort((a, b) => {
      const dateA = new Date(groups[a][0].scheduledTime);
      const dateB = new Date(groups[b][0].scheduledTime);
      return dateB.getTime() - dateA.getTime();
    });

    return sortedDates.map((date) => ({
      date,
      logs: groups[date].sort((a, b) => {
        return new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime();
      }),
    }));
  }, [logs]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'taken':
        return Colors.mint;
      case 'missed':
        return Colors.coral;
      case 'snoozed':
        return Colors.gold;
      default:
        return Colors.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'taken':
        return '✓';
      case 'missed':
        return '✕';
      case 'snoozed':
        return '⏰';
      default:
        return '•';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medicine History</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* History List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {groupedLogs.length > 0 ? (
          groupedLogs.map((group, index) => (
            <View key={index} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{group.date}</Text>
              {group.logs.map((log) => (
                <GlassCard key={log.id} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <View style={styles.logTitleRow}>
                      <Text style={styles.logMedicine}>{log.medicineName}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(log.status) + '20' },
                        ]}
                      >
                        <Text style={[styles.statusIcon, { color: getStatusColor(log.status) }]}>
                          {getStatusIcon(log.status)}
                        </Text>
                        <Text
                          style={[styles.statusText, { color: getStatusColor(log.status) }]}
                        >
                          {log.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.logDosage}>{log.dosage}</Text>
                  </View>

                  <View style={styles.logDetails}>
                    <View style={styles.logDetailRow}>
                      <Text style={styles.logDetailLabel}>Scheduled:</Text>
                      <Text style={styles.logDetailValue}>
                        {new Date(log.scheduledTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    {log.actualTime && (
                      <View style={styles.logDetailRow}>
                        <Text style={styles.logDetailLabel}>Taken At:</Text>
                        <Text style={[styles.logDetailValue, { color: Colors.mint }]}>
                          {new Date(log.actualTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    )}

                    {log.notes && (
                      <View style={styles.logNotes}>
                        <Text style={styles.logNotesLabel}>Notes:</Text>
                        <Text style={styles.logNotesText}>{log.notes}</Text>
                      </View>
                    )}
                  </View>
                </GlassCard>
              ))}
            </View>
          ))
        ) : (
          <EmptyState
            emoji="📋"
            title="No History Yet"
            subtitle="Your medicine history will appear here once you start tracking"
          />
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.sm,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  dateGroup: {
    marginBottom: Spacing.lg,
  },
  dateHeader: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  logCard: {
    marginBottom: Spacing.sm,
  },
  logHeader: {
    marginBottom: Spacing.sm,
  },
  logTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logMedicine: {
    ...Typography.h4,
    color: Colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  statusIcon: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusText: {
    ...Typography.micro,
    fontWeight: '700',
  },
  logDosage: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  logDetails: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  logDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logDetailLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  logDetailValue: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
  },
  logNotes: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  logNotesLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  logNotesText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { GlassCard, SectionHeader, Badge } from '../../components/PremiumUI';

const NOTIFICATIONS = [
  {
    title: '⏰ Medicine reminder: Calcium tablet',
    body: 'Scheduled dosage due in 15 minutes. Remember to take it with meals.',
    time: '15m ago',
    type: 'medicine',
  },
];

export default function NotificationsScreen() {
  return (
    <DashboardLayout title="Notifications">
      <ScrollView style={styles.container} contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>🔔 Notification Center</Text>
          <Text style={styles.pageSub}>Stay up to date with your medicine updates</Text>
        </View>

        <SectionHeader title="Recent Alerts" icon="🔔" />

        {NOTIFICATIONS.map((notif, idx) => {
          let accent = Colors.primary;
          if (notif.type === 'medicine') accent = Colors.lavender;

          return (
            <GlassCard key={idx} accent={accent}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{notif.title}</Text>
                <Text style={styles.cardTime}>{notif.time}</Text>
              </View>
              <Text style={styles.cardBody}>{notif.body}</Text>
            </GlassCard>
          );
        })}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: Spacing.md },
  pageHeader: { marginBottom: Spacing.md, marginTop: Spacing.sm },
  pageTitle: { ...Typography.h2, color: Colors.textPrimary, fontWeight: '800' as const },
  pageSub: { ...Typography.body, color: Colors.textMuted, marginTop: 4 },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    flex: 1,
  },
  cardTime: {
    ...Typography.micro,
    color: Colors.textMuted,
  },
  cardBody: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
});

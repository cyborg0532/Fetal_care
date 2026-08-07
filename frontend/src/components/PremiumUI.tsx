// Premium shared card components for MaternalCare Dashboard
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme';

// ── GlassCard ────────────────────────────────────────────────────────────────
interface GlassCardProps {
  children: React.ReactNode;
  style?: any;
  accent?: string;
  onPress?: () => void;
}

export function GlassCard({ children, style, accent, onPress }: GlassCardProps) {
  const card = (
    <View
      style={[
        styles.glassCard,
        accent && { borderColor: accent + '40', borderTopWidth: 3, borderTopColor: accent },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.8}>{card}</TouchableOpacity>;
  return card;
}

// ── StatCard ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  accent?: string;
  onPress?: () => void;
  subLabel?: string;
}

export function StatCard({ icon, label, value, accent = Colors.primary, onPress, subLabel }: StatCardProps) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { borderTopColor: accent, borderTopWidth: 3 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.statIconWrap, { backgroundColor: accent + '18' }]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subLabel && <Text style={styles.statSubLabel}>{subLabel}</Text>}
    </TouchableOpacity>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  icon?: string;
}

export function SectionHeader({ title, action, onAction, icon }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        {icon && <Text style={styles.sectionIcon}>{icon}</Text>}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action && (
        <TouchableOpacity onPress={onAction} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
interface BadgeProps {
  label: string;
  color?: string;
  bg?: string;
}

export function Badge({ label, color = Colors.primary, bg }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg ?? color + '18', borderColor: color + '40' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
interface ProgressBarProps {
  progress: number;      // 0–100
  color?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({ progress, color = Colors.primary, height = 8, showLabel, label }: ProgressBarProps) {
  const clamp = Math.max(0, Math.min(100, progress));
  return (
    <View>
      {(showLabel || label) && (
        <View style={styles.progressLabelRow}>
          {label && <Text style={styles.progressLabel}>{label}</Text>}
          {showLabel && <Text style={[styles.progressPct, { color }]}>{clamp}%</Text>}
        </View>
      )}
      <View style={[styles.progressBg, { height }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${clamp}%` as any, height, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ emoji, title, subtitle, action, onAction }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
      {action && (
        <TouchableOpacity style={styles.emptyAction} onPress={onAction}>
          <Text style={styles.emptyActionText}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── ComingSoon ────────────────────────────────────────────────────────────────
export function ComingSoon({ feature }: { feature: string }) {
  return (
    <View style={styles.comingSoon}>
      <Text style={styles.comingSoonEmoji}>🚧</Text>
      <Text style={styles.comingSoonTitle}>{feature}</Text>
      <Text style={styles.comingSoonText}>This feature is coming soon and will be fully integrated with the backend.</Text>
      <View style={styles.comingSoonBadge}>
        <Text style={styles.comingSoonBadgeText}>IN DEVELOPMENT</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },

  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  statIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statIcon: { fontSize: 22 },
  statValue: { ...Typography.h2, fontWeight: '800' as const },
  statLabel: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
  statSubLabel: { ...Typography.micro, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionIcon: { fontSize: 17 },
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary },
  sectionAction: {
    backgroundColor: Colors.lavenderBg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.lavenderLight,
  },
  sectionActionText: {
    ...Typography.caption,
    color: Colors.lavender,
    fontWeight: '600' as const,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: { ...Typography.micro, fontWeight: '600' as const },

  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: { ...Typography.caption, color: Colors.textSecondary },
  progressPct: { ...Typography.caption, fontWeight: '700' as const },
  progressBg: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    overflow: 'hidden' as any,
  },
  progressFill: {
    borderRadius: Radius.full,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyEmoji: { fontSize: 52, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.xs, textAlign: 'center' },
  emptySubtitle: { ...Typography.body, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  emptyAction: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  emptyActionText: { ...Typography.bodyBold, color: '#fff', fontSize: 14 },

  comingSoon: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  comingSoonEmoji: { fontSize: 52, marginBottom: Spacing.md },
  comingSoonTitle: { ...Typography.h2, color: Colors.textPrimary, marginBottom: Spacing.xs, textAlign: 'center' },
  comingSoonText: { ...Typography.body, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.md },
  comingSoonBadge: {
    backgroundColor: Colors.goldBg,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.gold + '60',
  },
  comingSoonBadgeText: {
    ...Typography.label,
    color: Colors.gold,
    fontSize: 10,
  },
});

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, TOPBAR_HEIGHT, Shadows } from '../constants/theme';

interface TopBarProps {
  onMenuPress: () => void;
  title?: string;
}

export default function TopBar({ onMenuPress, title }: TopBarProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const topPadding = isDesktop ? 0 : Math.max(insets.top, 0);

  return (
    <View style={[styles.container, { paddingTop: topPadding, height: TOPBAR_HEIGHT + topPadding }]}>
      {/* Left: Hamburger (mobile) + Title */}
      <View style={styles.leftSection}>
        {!isDesktop && (
          <TouchableOpacity style={styles.menuBtn} onPress={onMenuPress} activeOpacity={0.7}>
            <View style={styles.hamburgerLine} />
            <View style={[styles.hamburgerLine, { width: 18 }]} />
            <View style={styles.hamburgerLine} />
          </TouchableOpacity>
        )}
        {title ? (
          <Text style={styles.pageTitle} numberOfLines={1}>{title}</Text>
        ) : (
          <View style={styles.brandRow}>
            <Text style={styles.brandLogo}>🌸</Text>
            <Text style={styles.brandName}>MaternalCare</Text>
          </View>
        )}
      </View>

      {/* Right: Actions */}
      <View style={styles.rightSection}>
        {/* Notification bell */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/(tabs)/notifications' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.iconBtnText}>🔔</Text>
          <View style={styles.notifBadge}>
            <Text style={styles.notifBadgeText}>3</Text>
          </View>
        </TouchableOpacity>

        {/* Profile avatar */}
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => router.push('/(tabs)/profile' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.avatarText}>👤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: TOPBAR_HEIGHT,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadows.xs,
    zIndex: 100,
  },

  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },

  menuBtn: {
    padding: 6,
    gap: 4,
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: Colors.textSecondary,
    borderRadius: 1,
  },

  pageTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontSize: 16,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandLogo: { fontSize: 22 },
  brandName: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800' as const,
  },

  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative' as any,
  },
  iconBtnText: { fontSize: 18 },
  notifBadge: {
    position: 'absolute' as any,
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700' as const,
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.lavenderBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.lavenderLight,
  },
  avatarText: { fontSize: 18 },
});

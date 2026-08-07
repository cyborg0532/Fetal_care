import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, useWindowDimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Typography, SIDEBAR_WIDTH, Shadows } from '../constants/theme';

export interface NavItem {
  icon: string;
  label: string;
  route: string;
}

export const NAV_ITEMS: NavItem[] = [
  { icon: '🏠', label: 'Dashboard',           route: '/(tabs)/' },
  { icon: '🗓', label: 'Journey Timeline',    route: '/(tabs)/pregnancy-timeline' },
  { icon: '📄', label: 'Report Analyzer',     route: '/(tabs)/report-analyzer' },
  { icon: '🤖', label: 'AI Pregnancy Buddy',  route: '/(tabs)/ai-buddy' },
  { icon: '💊', label: 'Medicine Reminders',  route: '/(tabs)/medicine-reminders' },
  { icon: '❤️', label: 'Mood Detection AI',   route: '/(tabs)/meds_mood' },
  { icon: '🌸', label: 'PCOS Assessment',      route: '/(tabs)/pcos' },
  { icon: '🏥', label: 'Hospitals & Doctors',  route: '/(tabs)/hospitals' },
  { icon: '🚨', label: 'Emergency SOS',        route: '/(tabs)/sos' },
  { icon: '👨', label: 'Father Portal',        route: '/(tabs)/father-portal' },
  { icon: '📈', label: 'Health Reports',       route: '/(tabs)/health-reports' },
  { icon: '🔔', label: 'Notifications',        route: '/(tabs)/notifications' },
  { icon: '👤', label: 'My Profile',           route: '/(tabs)/profile' },
  { icon: '⚙️', label: 'Settings',            route: '/(tabs)/settings' },
];

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  slideAnim: Animated.Value;
}

export default function Sidebar({ visible, onClose, slideAnim }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const insets = useSafeAreaInsets();

  const topPadding = isDesktop ? Spacing.lg : Math.max(insets.top, Spacing.lg);
  const bottomPadding = isDesktop ? Spacing.md : Math.max(insets.bottom, Spacing.md);

  const navigate = useCallback((route: string) => {
    router.push(route as any);
    if (!isDesktop) onClose();
  }, [router, isDesktop, onClose]);

  const isActive = (route: string) => {
    if (route === '/(tabs)/') return pathname === '/' || pathname === '/index';
    return pathname.includes(route.replace('/(tabs)/', ''));
  };

  const sidebarContent = (
    <View style={[styles.container, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>
      {/* Logo Area */}
      <View style={styles.logoArea}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🌸</Text>
        </View>
        <View style={styles.logoText}>
          <Text style={styles.appName}>MaternalCare</Text>
          <Text style={styles.appTagline}>Your Pregnancy Companion</Text>
        </View>
        {!isDesktop && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider} />

      {/* Navigation Items */}
      <ScrollView
        style={styles.navList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.navListContent}
      >
        {NAV_ITEMS.map((item, index) => {
          const active = isActive(item.route);
          return (
            <TouchableOpacity
              key={index}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => navigate(item.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
                <Text style={styles.navIcon}>{item.icon}</Text>
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
                {item.label}
              </Text>
              {active && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Bottom Badge */}
      <View style={styles.bottomBadge}>
        <Text style={styles.bottomBadgeText}>✨ Premium Plan Active</Text>
      </View>

      {/* Logout Button */}
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={async () => {
          try {
            await import('expo-router/build/global-state/routing').then((m) => {
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              AsyncStorage.multiRemove(['auth_token', 'user_data']).then(() => {
                router.replace('/(auth)/login' as any);
              });
            });
          } catch (error) {
            console.error('Logout error:', error);
          }
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );

  if (isDesktop) {
    return (
      <View style={styles.desktopSidebar}>
        {sidebarContent}
      </View>
    );
  }

  // Mobile drawer — overlay
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.overlayBackdrop} onPress={onClose} activeOpacity={1} />
      <Animated.View
        style={[
          styles.mobileSidebar,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {sidebarContent}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Desktop sidebar
  desktopSidebar: {
    width: SIDEBAR_WIDTH,
    height: '100%' as any,
    backgroundColor: Colors.sidebarBg,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    ...Shadows.sm,
  },

  // Mobile overlay
  overlay: {
    position: 'absolute' as any,
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
    flexDirection: 'row',
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 10, 46, 0.4)',
  },
  mobileSidebar: {
    position: 'absolute' as any,
    top: 0, left: 0, bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: Colors.sidebarBg,
    ...Shadows.lg,
    zIndex: 1001,
  },

  // Content
  container: {
    flex: 1,
    paddingTop: Spacing.lg,
  },

  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.lavenderBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.lavenderLight,
  },
  logoEmoji: { fontSize: 22 },
  logoText: { flex: 1 },
  appName: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800' as const,
  },
  appTagline: {
    ...Typography.micro,
    color: Colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: Spacing.xs,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.sm,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600' as const,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },

  navList: { flex: 1 },
  navListContent: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
  },

  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: 2,
    gap: Spacing.sm,
    position: 'relative' as any,
  },
  navItemActive: {
    backgroundColor: Colors.sidebarActive,
  },
  navIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },
  navIconWrapActive: {
    backgroundColor: Colors.primaryLight + '40',
  },
  navIcon: { fontSize: 17 },
  navLabel: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    fontWeight: '500' as const,
  },
  navLabelActive: {
    color: Colors.primary,
    fontWeight: '700' as const,
  },
  activeIndicator: {
    position: 'absolute' as any,
    right: 0,
    top: '50%' as any,
    marginTop: -10,
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },

  bottomBadge: {
    margin: Spacing.md,
    backgroundColor: Colors.lavenderBg,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.lavenderLight,
  },
  bottomBadgeText: {
    ...Typography.caption,
    color: Colors.lavender,
    fontWeight: '600' as const,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  logoutIcon: {
    fontSize: 18,
  },
  logoutText: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
});

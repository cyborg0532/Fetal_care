import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, StyleSheet, Animated, useWindowDimensions, TouchableOpacity, Text, PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { Colors, SIDEBAR_WIDTH, TOPBAR_HEIGHT, Shadows } from '../constants/theme';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const bottomPadding = isDesktop ? 0 : Math.max(insets.bottom, 0);

  // Draggable Floating SOS Button logic
  const pan = useRef(new Animated.ValueXY()).current;
  const isDraggingRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = false;
        pan.extractOffset();
      },
      onPanResponderMove: (evt, gestureState) => {
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          isDraggingRef.current = true;
        }
        Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(evt, gestureState);
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        if (!isDraggingRef.current && Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          router.push('/(tabs)/sos' as any);
        }
      },
    })
  ).current;

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 14,
    }).start();
  }, [slideAnim]);

  const closeDrawer = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -SIDEBAR_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  }, [slideAnim]);

  // Auto-close drawer when switching to desktop
  useEffect(() => {
    if (isDesktop && drawerOpen) {
      setDrawerOpen(false);
      slideAnim.setValue(-SIDEBAR_WIDTH);
    }
  }, [isDesktop]);

  return (
    <View style={styles.root}>
      {/* Top Bar */}
      <TopBar onMenuPress={openDrawer} title={title} />

      <View style={styles.body}>
        {/* Sidebar — always visible on desktop */}
        {isDesktop && (
          <Sidebar
            visible={true}
            onClose={closeDrawer}
            slideAnim={slideAnim}
          />
        )}

        {/* Main content */}
        <View style={[styles.main, { paddingBottom: bottomPadding }]}>
          {children}
        </View>

        {/* Mobile drawer overlay */}
        {!isDesktop && (
          <Sidebar
            visible={drawerOpen}
            onClose={closeDrawer}
            slideAnim={slideAnim}
          />
        )}
      </View>

      {/* Draggable Floating Quick SOS Button */}
      <Animated.View
        style={[
          styles.fab,
          {
            bottom: 24 + bottomPadding,
            transform: pan.getTranslateTransform(),
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={() => {
            if (!isDraggingRef.current) {
              router.push('/(tabs)/sos' as any);
            }
          }}
          activeOpacity={0.85}
          style={styles.fabTouchable}
        >
          <Text style={styles.fabText}>🚨</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  main: {
    flex: 1,
    backgroundColor: Colors.background,
    overflow: 'hidden' as any,
  },
  fab: {
    position: 'absolute' as any,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FF1744',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 500,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Shadows.sos,
  },
  fabTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: { 
    fontSize: 26,
  },
});


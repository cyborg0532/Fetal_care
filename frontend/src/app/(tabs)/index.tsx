import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, useWindowDimensions, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch, AuthService } from '../../services/api';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { GlassCard, StatCard, SectionHeader, ProgressBar, Badge } from '../../components/PremiumUI';
import MedicineDashboardWidget from '../../components/MedicineDashboardWidget';
import { useMedicineReminders } from '../../hooks/useMedicineReminders';

interface DashboardData {
  week: number;
  trimester: number;
  days_until_due_date: number | null;
  due_date: string | null;
  baby_size: string;
  baby_emoji: string;
  weekly_tip: string;
  medicines_today: Array<{ name: string; dosage: string; schedule_time: string }>;
  last_mood_score: number | null;
}

const MOOD_EMOJI = ['', '😢', '😔', '😐', '😊', '🌟'];
const MOOD_LABEL = ['', 'Very Low', 'Low', 'Okay', 'Good', 'Excellent!'];
const MOOD_COLOR = ['', Colors.moodVeryLow, Colors.moodLow, Colors.moodOkay, Colors.moodGood, Colors.moodExcellent];

const TRIMESTER_LABELS = ['', 'First Trimester', 'Second Trimester', 'Third Trimester'];
const TRIMESTER_COLORS = ['', Colors.teal, Colors.lavender, Colors.primary];

// Daily checklist items (static)
const DAILY_CHECKLIST = [
  { icon: '💧', label: 'Drink 8 glasses of water', done: false },
  { icon: '💊', label: 'Take prenatal vitamins', done: false },
  { icon: '🚶', label: '30 min gentle walk', done: false },
  { icon: '😴', label: 'Rest 8 hours', done: false },
];

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checklist, setChecklist] = useState(DAILY_CHECKLIST);
  const [waterCount, setWaterCount] = useState(0);

  // Medicine reminders hook
  const { getDashboardStats } = useMedicineReminders();
  const medicineStats = getDashboardStats();

  const fetchDashboard = useCallback(async () => {
    try {
      const result = await apiFetch('/tracker/dashboard');
      setData(result);
    } catch (e: any) {
      console.error('Dashboard error:', e);
      if (e.message?.includes('401') || e.message?.includes('validate credentials') || e.message?.includes('token')) {
        await AuthService.logout();
        router.replace('/(auth)/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboard();
    if (Platform.OS === 'android') {
      (async () => {
        try {
          const { PermissionsAndroid } = require('react-native');
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CALL_PHONE,
            PermissionsAndroid.PERMISSIONS.SEND_SMS,
          ]);
        } catch (e) {
          console.error('Error requesting SOS permissions on startup:', e);
        }
      })();
    }
  }, []);

  const onRefresh = () => { setRefreshing(true); fetchDashboard(); };

  const handleLogout = async () => {
    await AuthService.logout();
    router.replace('/(auth)/login');
  };

  const toggleCheckItem = (index: number) => {
    setChecklist(prev => prev.map((item, i) => i === index ? { ...item, done: !item.done } : item));
  };

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <View style={styles.center}>
          <View style={styles.loadingCard}>
            <Text style={styles.loadingEmoji}>🌸</Text>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading your journey...</Text>
          </View>
        </View>
      </DashboardLayout>
    );
  }

  const progressPct = data ? Math.round((data.week / 40) * 100) : 0;
  const trimColor = TRIMESTER_COLORS[data?.trimester ?? 1];

  return (
    <DashboardLayout title="Dashboard">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.inner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting Row ──────────────────────────────────────────────────── */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greeting}>Good morning, Mama! 🌸</Text>
            <Text style={styles.greetingSub}>
              {data
                ? `Week ${data.week} · ${TRIMESTER_LABELS[data.trimester]}`
                : 'Your pregnancy companion'}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero Pregnancy Card ───────────────────────────────────────────── */}
        <View style={[styles.heroCard, { borderTopColor: trimColor }]}>
          {/* Top row */}
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <View style={[styles.weekBadge, { backgroundColor: trimColor + '18' }]}>
                <Text style={[styles.weekBadgeText, { color: trimColor }]}>
                  {TRIMESTER_LABELS[data?.trimester ?? 1]}
                </Text>
              </View>
              <View style={styles.weekRow}>
                <Text style={[styles.weekNum, { color: trimColor }]}>{data?.week ?? '–'}</Text>
                <Text style={styles.weekUnit}>weeks</Text>
              </View>
              {data?.days_until_due_date !== null && data?.days_until_due_date !== undefined && (
                <Text style={styles.daysLeft}>
                  <Text style={styles.daysNum}>{data.days_until_due_date}</Text>
                  <Text style={styles.daysLabel}> days to go 🎀</Text>
                </Text>
              )}
            </View>

            {/* Baby info */}
            <View style={styles.babyCard}>
              <View style={styles.babyCircle}>
                <Text style={styles.babyEmoji}>{data?.baby_emoji ?? '👶'}</Text>
              </View>
              <Text style={styles.babySizeLbl}>Size of a</Text>
              <Text style={styles.babySize}>{data?.baby_size ?? '–'}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLbl}>Pregnancy Progress</Text>
              <Text style={[styles.progressPct, { color: trimColor }]}>{progressPct}%</Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progressPct}%` as any, backgroundColor: trimColor }]} />
              <View style={[styles.progressMarker, { left: '33%' as any }]} />
              <View style={[styles.progressMarker, { left: '66%' as any }]} />
            </View>
            <View style={styles.progressTicks}>
              <Text style={styles.tickLabel}>Wk 1</Text>
              <Text style={[styles.tickLabel, { color: trimColor, fontWeight: '700' as const }]}>T1→T2</Text>
              <Text style={[styles.tickLabel, { color: trimColor, fontWeight: '700' as const }]}>T2→T3</Text>
              <Text style={styles.tickLabel}>Wk 40</Text>
            </View>
          </View>

          {/* Weekly tip strip */}
          {data?.weekly_tip && (
            <View style={styles.tipStrip}>
              <Text style={styles.tipIcon}>💡</Text>
              <Text style={styles.tipText} numberOfLines={2}>{data.weekly_tip}</Text>
            </View>
          )}
        </View>

        {/* ── Stats Row ─────────────────────────────────────────────────────── */}
        <View style={[styles.statsRow, isWide && styles.statsRowWide]}>
          <StatCard
            icon="💊"
            label="Medicines"
            value={data?.medicines_today?.length ?? 0}
            accent={Colors.lavender}
            onPress={() => router.push('/(tabs)/meds_mood' as any)}
            subLabel="today"
          />
          <StatCard
            icon={MOOD_EMOJI[data?.last_mood_score ?? 0] || '🌀'}
            label="Mood"
            value={data?.last_mood_score ? MOOD_LABEL[data.last_mood_score] : '–'}
            accent={MOOD_COLOR[data?.last_mood_score ?? 0] || Colors.primary}
            onPress={() => router.push('/(tabs)/meds_mood' as any)}
            subLabel="last logged"
          />
        </View>

        {/* ── Medicine Reminders Dashboard Widget ───────────────────────────── */}
        <MedicineDashboardWidget stats={medicineStats} />

        {/* ── Water Intake Tracker ──────────────────────────────────────────── */}
        <GlassCard>
          <SectionHeader title="Water Intake" icon="💧" />
          <Text style={styles.waterGoal}>
            <Text style={[styles.waterCount, { color: Colors.skyBlue }]}>{waterCount}</Text>
            <Text style={styles.waterOf}> / 8 glasses today</Text>
          </Text>
          <View style={styles.waterBubbles}>
            {Array.from({ length: 8 }).map((_, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.waterBubble,
                  i < waterCount && { backgroundColor: Colors.skyBlue, borderColor: Colors.skyBlue },
                ]}
                onPress={() => setWaterCount(prev => i < prev ? i : i + 1)}
              >
                <Text style={styles.waterBubbleIcon}>{i < waterCount ? '💧' : '○'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ProgressBar progress={waterCount * 12.5} color={Colors.skyBlue} showLabel label="Daily goal" />
        </GlassCard>

        {/* ── Daily Checklist ───────────────────────────────────────────────── */}
        <GlassCard>
          <SectionHeader title="Daily Checklist" icon="✅" />
          {checklist.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.checkItem}
              onPress={() => toggleCheckItem(i)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkCircle, item.done && styles.checkCircleDone]}>
                {item.done && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkIcon}>{item.icon}</Text>
              <Text style={[styles.checkLabel, item.done && styles.checkLabelDone]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </GlassCard>

        {/* ── Today's Medicines ─────────────────────────────────────────────── */}
        {(data?.medicines_today?.length ?? 0) > 0 && (
          <View>
            <SectionHeader
              title="Medicine Reminder"
              icon="💊"
              action="Manage"
              onAction={() => router.push('/(tabs)/meds_mood' as any)}
            />
            {data!.medicines_today.map((m, i) => (
              <View key={i} style={styles.medCard}>
                <View style={styles.medIconWrap}>
                  <Text style={styles.medIcon}>💊</Text>
                </View>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{m.name}</Text>
                  <Text style={styles.medMeta}>{m.dosage} · {m.schedule_time}</Text>
                </View>
                <Badge label="Pending" color={Colors.warning} />
              </View>
            ))}
          </View>
        )}

        {/* ── AI Recommendations ───────────────────────────────────────────── */}
        <GlassCard accent={Colors.lavender}>
          <SectionHeader title="AI Pregnancy Buddy" icon="🤖" />
          <Text style={styles.aiTip}>
            Based on your Week {data?.week ?? '?'}, here are your personalized recommendations:
          </Text>
          {['Stay hydrated — aim for 10 cups of water daily.',
            'Light prenatal yoga improves circulation and reduces back pain.',
            'Iron-rich foods like spinach support your baby\'s development this week.'].map((tip, i) => (
            <View key={i} style={styles.aiTipItem}>
              <View style={styles.aiTipDot} />
              <Text style={styles.aiTipText}>{tip}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={styles.aiChatBtn}
            onPress={() => router.push('/(tabs)/ai-buddy' as any)}
          >
            <Text style={styles.aiChatBtnText}>💬 Ask AI Buddy</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* ── Medical Report Analyzer Shortcut ─────────────────────────────── */}
        <TouchableOpacity
          style={[styles.sosShortcut, { backgroundColor: Colors.lavenderBg, borderColor: Colors.lavender }]}
          onPress={() => router.push('/(tabs)/report-analyzer' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.sosIcon}>📄</Text>
          <View style={styles.sosInfo}>
            <Text style={[styles.sosTitle, { color: Colors.lavender }]}>Medical Report Analyzer</Text>
            <Text style={styles.sosSub}>Upload blood tests or ultrasounds for instant AI translation</Text>
          </View>
          <Text style={[styles.sosArrow, { color: Colors.lavender }]}>›</Text>
        </TouchableOpacity>

        {/* ── Emergency SOS ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.sosShortcut}
          onPress={() => router.push('/(tabs)/sos' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.sosIcon}>🚨</Text>
          <View style={styles.sosInfo}>
            <Text style={styles.sosTitle}>Emergency SOS</Text>
            <Text style={styles.sosSub}>Tap to access emergency features & red flags</Text>
          </View>
          <Text style={styles.sosArrow}>›</Text>
        </TouchableOpacity>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: Spacing.md },
  center: {
    flex: 1, backgroundColor: Colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  loadingCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.md,
  },
  loadingEmoji: { fontSize: 52 },
  loadingText: { ...Typography.body, color: Colors.textSecondary },

  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  greeting: { ...Typography.h2, color: Colors.textPrimary },
  greetingSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  logoutBtn: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutText: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600' as const },

  // Hero Card
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 4,
    ...Shadows.md,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  heroLeft: { flex: 1 },
  weekBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.xs,
  },
  weekBadgeText: { ...Typography.label, fontSize: 10 },
  weekRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 6 },
  weekNum: { fontSize: 64, fontWeight: '900' as const, lineHeight: 72 },
  weekUnit: { ...Typography.h3, color: Colors.textMuted, marginBottom: 10 },
  daysLeft: { flexDirection: 'row' as const },
  daysNum: { ...Typography.h2, color: Colors.textPrimary, fontWeight: '800' as const },
  daysLabel: { ...Typography.body, color: Colors.textSecondary },

  babyCard: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    width: 110,
  },
  babyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.lavenderBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    borderWidth: 2,
    borderColor: Colors.lavenderLight,
  },
  babyEmoji: { fontSize: 32 },
  babySizeLbl: { ...Typography.micro, color: Colors.textMuted },
  babySize: { ...Typography.h4, color: Colors.textPrimary, textAlign: 'center' },

  // Progress
  progressSection: { marginBottom: Spacing.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLbl: { ...Typography.label, color: Colors.textMuted },
  progressPct: { ...Typography.label, fontWeight: '700' as const },
  progressBg: {
    height: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    overflow: 'hidden' as any,
    position: 'relative' as any,
  },
  progressFill: { height: '100%' as any, borderRadius: Radius.full },
  progressMarker: {
    position: 'absolute' as any,
    top: 0, bottom: 0,
    width: 2,
    backgroundColor: Colors.backgroundAlt,
    opacity: 0.6,
  },
  progressTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  tickLabel: { ...Typography.micro, color: Colors.textMuted },

  tipStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.goldBg,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gold + '40',
  },
  tipIcon: { fontSize: 16 },
  tipText: { ...Typography.caption, color: Colors.textSecondary, flex: 1, lineHeight: 18 },

  // Stats Row
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statsRowWide: { gap: Spacing.md },

  // Water
  waterGoal: { marginBottom: Spacing.sm },
  waterCount: { fontSize: 32, fontWeight: '800' as const },
  waterOf: { ...Typography.body, color: Colors.textMuted },
  waterBubbles: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: Spacing.sm,
  },
  waterBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterBubbleIcon: { fontSize: 16 },

  // Checklist
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleDone: {
    backgroundColor: Colors.mint,
    borderColor: Colors.mint,
  },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '700' as const },
  checkIcon: { fontSize: 16 },
  checkLabel: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  checkLabelDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },

  // Medicines
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadows.xs,
  },
  medIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.lavenderBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medIcon: { fontSize: 20 },
  medInfo: { flex: 1 },
  medName: { ...Typography.bodyBold, color: Colors.textPrimary, fontSize: 14 },
  medMeta: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },

  // AI Card
  aiTip: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.sm },
  aiTipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  aiTipDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.lavender,
    marginTop: 8,
  },
  aiTipText: { ...Typography.body, color: Colors.textSecondary, flex: 1, lineHeight: 22 },
  aiChatBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.lavenderBg,
    borderRadius: Radius.full,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.lavenderLight,
  },
  aiChatBtnText: { ...Typography.bodyBold, color: Colors.lavender },

  // SOS Shortcut
  sosShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.coralBg,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.coral + '40',
    gap: Spacing.md,
    ...Shadows.sm,
  },
  sosIcon: { fontSize: 32 },
  sosInfo: { flex: 1 },
  sosTitle: { ...Typography.h4, color: Colors.danger, fontWeight: '700' as const },
  sosSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  sosArrow: { fontSize: 26, color: Colors.danger, fontWeight: '300' as const },
});

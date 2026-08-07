import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, TextInput, Modal, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { GlassCard, SectionHeader, Badge, ProgressBar } from '../../components/PremiumUI';

const TRIMESTER_WEEKS = [
  { t: 1, weeks: [1,2,3,4,5,6,7,8,9,10,11,12,13], color: Colors.teal, label: 'First Trimester' },
  { t: 2, weeks: [14,15,16,17,18,19,20,21,22,23,24,25,26,27], color: Colors.lavender, label: 'Second Trimester' },
  { t: 3, weeks: [28,29,30,31,32,33,34,35,36,37,38,39,40], color: Colors.primary, label: 'Third Trimester' },
];

const WEEK_DATA: Record<number, { baby: string; size: string; emoji: string; milestone: string; tip: string }> = {
  4:  { baby: 'Poppy seed', size: '0.1 cm', emoji: '🌱', milestone: 'Implantation complete', tip: 'Start prenatal vitamins with folic acid.' },
  8:  { baby: 'Raspberry', size: '1.6 cm', emoji: '🍇', milestone: 'Heartbeat detectable', tip: 'First prenatal appointment.' },
  12: { baby: 'Lime', size: '5.4 cm', emoji: '🍋', milestone: 'End of first trimester', tip: 'First trimester screening scan.' },
  16: { baby: 'Avocado', size: '11.6 cm', emoji: '🥑', milestone: 'Baby can hear sounds', tip: 'You may feel first movements soon.' },
  20: { baby: 'Banana', size: '25.6 cm', emoji: '🍌', milestone: 'Anatomy scan week', tip: 'Anomaly scan — important milestone!' },
  24: { baby: 'Ear of corn', size: '30 cm', emoji: '🌽', milestone: 'Viability milestone', tip: 'Iron and glucose checks recommended.' },
  28: { baby: 'Eggplant', size: '37.6 cm', emoji: '🍆', milestone: 'Third trimester begins', tip: 'Tdap vaccine and growth scan.' },
  32: { baby: 'Squash', size: '42.4 cm', emoji: '🥦', milestone: 'Baby gains weight rapidly', tip: 'Birth plan discussion with doctor.' },
  36: { baby: 'Papaya', size: '47.4 cm', emoji: '🥭', milestone: 'Baby is nearly full term', tip: 'Hospital bag should be packed.' },
  40: { baby: 'Watermelon', size: '51 cm', emoji: '🍉', milestone: 'Due date!', tip: 'Meet your baby! 🎀' },
};

const MILESTONES = [
  { week: 6,  icon: '❤️', title: 'Heartbeat Detected' },
  { week: 12, icon: '🔬', title: 'First Trimester Scan' },
  { week: 16, icon: '💉', title: 'Quad Screen Test' },
  { week: 20, icon: '🩺', title: 'Anatomy Ultrasound' },
  { week: 24, icon: '🩸', title: 'Glucose Screening' },
  { week: 28, icon: '💊', title: 'Tdap Vaccine' },
  { week: 32, icon: '📋', title: 'Growth Scan' },
  { week: 36, icon: '🏥', title: 'Pre-delivery Check' },
  { week: 39, icon: '🎀', title: 'Full Term' },
];

export default function PregnancyTimelineScreen() {
  const [selectedWeek, setSelectedWeek] = useState(24);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dueDateInput, setDueDateInput] = useState('');
  const [calculatedWeek, setCalculatedWeek] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  // Load saved due date on mount
  useEffect(() => {
    loadDueDate();
  }, []);

  // Calculate current week when due date changes
  useEffect(() => {
    if (dueDate) {
      const week = calculateCurrentWeek(dueDate);
      setCalculatedWeek(week);
      setSelectedWeek(week);
    }
  }, [dueDate]);

  const loadDueDate = async () => {
    try {
      const saved = await AsyncStorage.getItem('pregnancy_due_date');
      if (saved) {
        const date = new Date(saved);
        setDueDate(date);
        setDueDateInput(formatDate(date));
      }
    } catch (error) {
      console.error('Error loading due date:', error);
    }
  };

  const saveDueDate = async (date: Date) => {
    try {
      await AsyncStorage.setItem('pregnancy_due_date', date.toISOString());
      setDueDate(date);
      setDueDateInput(formatDate(date));
      setShowDatePicker(false);
    } catch (error) {
      console.error('Error saving due date:', error);
    }
  };

  const calculateCurrentWeek = (dueDate: Date): number => {
    const today = new Date();
    const totalPregnancyDays = 280; // 40 weeks
    const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceConception = totalPregnancyDays - daysUntilDue;
    const week = Math.floor(daysSinceConception / 7);
    return Math.max(1, Math.min(40, week)); // Clamp between 1 and 40
  };

  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseDateInput = (input: string): Date | null => {
    const parts = input.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    const date = new Date(year, month, day);
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
      return null;
    }
    return date;
  };

  const handleSaveDueDate = () => {
    const date = parseDateInput(dueDateInput);
    if (date && date > new Date()) {
      saveDueDate(date);
    } else {
      alert('Please enter a valid future date in DD/MM/YYYY format');
    }
  };

  const clearDueDate = async () => {
    try {
      await AsyncStorage.removeItem('pregnancy_due_date');
      setDueDate(null);
      setDueDateInput('');
      setCalculatedWeek(null);
      setSelectedWeek(24);
    } catch (error) {
      console.error('Error clearing due date:', error);
    }
  };

  const weekInfo = WEEK_DATA[selectedWeek] || WEEK_DATA[Math.max(...Object.keys(WEEK_DATA).map(Number).filter(w => w <= selectedWeek)) || 4];
  const progressPct = Math.round((selectedWeek / 40) * 100);
  const trimester = selectedWeek <= 13 ? 1 : selectedWeek <= 27 ? 2 : 3;
  const trimColor = [Colors.teal, Colors.lavender, Colors.primary][trimester - 1];

  return (
    <DashboardLayout title="Pregnancy Journey">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.inner}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>🗓 Pregnancy Journey</Text>
          <Text style={styles.pageSub}>Week-by-week companion guide</Text>
        </View>

        {/* Due Date Input Section */}
        <GlassCard accent={Colors.primary}>
          <SectionHeader title="Your Due Date" icon="📅" />
          <Text style={styles.dueDateHelp}>
            Enter your expected due date to automatically calculate your current pregnancy week
          </Text>
          
          {dueDate ? (
            <View style={styles.dueDateDisplay}>
              <View style={styles.dueDateInfo}>
                <Text style={styles.dueDateLabel}>Due Date</Text>
                <Text style={styles.dueDateValue}>{formatDate(dueDate)}</Text>
              </View>
              {calculatedWeek && (
                <View style={styles.dueDateInfo}>
                  <Text style={styles.dueDateLabel}>Current Week</Text>
                  <Text style={[styles.dueDateValue, { color: Colors.primary }]}>Week {calculatedWeek}</Text>
                </View>
              )}
              <TouchableOpacity 
                style={[styles.dueDateBtn, styles.dueDateBtnSecondary]} 
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dueDateBtnTextSecondary}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.dueDateBtn, styles.dueDateBtnDanger]} 
                onPress={clearDueDate}
              >
                <Text style={styles.dueDateBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.dueDateAddBtn} 
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dueDateAddBtnText}>+ Add Due Date</Text>
            </TouchableOpacity>
          )}
        </GlassCard>

        {/* Due Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              activeOpacity={1}
              onPress={() => setShowDatePicker(false)}
            />
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Enter Your Due Date</Text>
              <Text style={styles.modalSubtitle}>Format: DD/MM/YYYY</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={Colors.textMuted}
                value={dueDateInput}
                onChangeText={setDueDateInput}
                keyboardType="numeric"
                maxLength={10}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.modalBtnCancel]} 
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.modalBtnSave]} 
                  onPress={handleSaveDueDate}
                >
                  <Text style={styles.modalBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Hero progress card */}
        <View style={[styles.heroCard, { borderTopColor: trimColor }]}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroWeekLabel}>Currently Viewing</Text>
              <Text style={[styles.heroWeek, { color: trimColor }]}>Week {selectedWeek}</Text>
              <Badge label={`Trimester ${trimester}`} color={trimColor} />
            </View>
            {weekInfo && (
              <View style={styles.heroBaby}>
                <View style={[styles.babyCircle, { borderColor: trimColor }]}>
                  <Text style={styles.babyEmoji}>{weekInfo.emoji}</Text>
                </View>
                <Text style={styles.babyName}>{weekInfo.baby}</Text>
                <Text style={styles.babySize}>{weekInfo.size}</Text>
              </View>
            )}
          </View>
          <ProgressBar progress={progressPct} color={trimColor} height={10} showLabel label="Pregnancy progress" />
          {weekInfo && (
            <View style={[styles.milestoneStrip, { backgroundColor: trimColor + '15' }]}>
              <Text style={styles.milestoneStripIcon}>🏆</Text>
              <Text style={styles.milestoneStripText}>{weekInfo.milestone}</Text>
            </View>
          )}
        </View>

        {/* Week selector */}
        <Text style={styles.sectionTitle}>Select Your Week</Text>
        {TRIMESTER_WEEKS.map(({ t, weeks, color, label }) => (
          <View key={t} style={styles.trimesterSection}>
            <View style={[styles.trimesterLabel, { backgroundColor: color + '15' }]}>
              <Text style={[styles.trimesterLabelText, { color }]}>{label}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weeksRow}>
              {weeks.map(w => (
                <TouchableOpacity
                  key={w}
                  style={[
                    styles.weekBtn,
                    selectedWeek === w && { backgroundColor: color, borderColor: color },
                    w < selectedWeek && { backgroundColor: color + '25', borderColor: color + '60' },
                  ]}
                  onPress={() => setSelectedWeek(w)}
                >
                  <Text style={[styles.weekBtnText, selectedWeek === w && { color: '#fff' }, w < selectedWeek && { color }]}>{w}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ))}

        {/* Week details */}
        {weekInfo && (
          <GlassCard accent={trimColor}>
            <SectionHeader title={`Week ${selectedWeek} Details`} icon="📋" />
            <View style={styles.weekDetail}>
              <Text style={styles.weekDetailLabel}>THIS WEEK'S TIP</Text>
              <Text style={styles.weekDetailText}>{weekInfo.tip}</Text>
            </View>
            <View style={styles.weekDetail}>
              <Text style={styles.weekDetailLabel}>BABY'S MILESTONE</Text>
              <Text style={styles.weekDetailText}>{weekInfo.milestone}</Text>
            </View>
          </GlassCard>
        )}

        {/* Milestones timeline */}
        <SectionHeader title="Key Milestones" icon="🏆" />
        <View style={styles.milestoneList}>
          {MILESTONES.map((m, i) => {
            const isPast = selectedWeek > m.week;
            const isCurrent = Math.abs(selectedWeek - m.week) <= 2;
            return (
              <View key={i} style={styles.milestoneItem}>
                <View style={styles.milestoneLeft}>
                  <View style={[
                    styles.milestoneDot,
                    isPast && styles.milestoneDotPast,
                    isCurrent && styles.milestoneDotCurrent,
                  ]}>
                    <Text style={styles.milestoneDotIcon}>{isPast ? '✓' : isCurrent ? '●' : ''}</Text>
                  </View>
                  {i < MILESTONES.length - 1 && <View style={[styles.milestoneLine, isPast && styles.milestoneLinePast]} />}
                </View>
                <View style={[styles.milestoneCard, isCurrent && styles.milestoneCardCurrent]}>
                  <Text style={styles.milestoneIcon}>{m.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.milestoneTitle, isCurrent && { color: Colors.primary }]}>{m.title}</Text>
                    <Text style={styles.milestoneWeek}>Week {m.week}</Text>
                  </View>
                  {isPast && <Text style={styles.milestoneCheck}>✓</Text>}
                </View>
              </View>
            );
          })}
        </View>

        {/* Vaccination schedule */}
        <SectionHeader title="Vaccination Schedule" icon="💉" />
        <GlassCard>
          {[
            { week: '11-14', vaccine: 'First Trimester Screening', status: 'completed' },
            { week: '16-20', vaccine: 'Anomaly Scan', status: 'completed' },
            { week: '24-28', vaccine: 'Glucose Tolerance Test', status: 'upcoming' },
            { week: '28', vaccine: 'Rhogam (if Rh-)', status: 'upcoming' },
            { week: '28-32', vaccine: 'Tdap Vaccine', status: 'upcoming' },
            { week: '36-40', vaccine: 'Group B Strep Test', status: 'future' },
          ].map((v, i) => (
            <View key={i} style={styles.vaccineRow}>
              <View style={[styles.vaccineWeekBadge, { backgroundColor: v.status === 'completed' ? Colors.mintBg : v.status === 'upcoming' ? Colors.lavenderBg : Colors.surfaceSecondary }]}>
                <Text style={[styles.vaccineWeekText, { color: v.status === 'completed' ? Colors.mint : v.status === 'upcoming' ? Colors.lavender : Colors.textMuted }]}>Wk {v.week}</Text>
              </View>
              <Text style={styles.vaccineName}>{v.vaccine}</Text>
              <View style={[styles.vaccineStatusBadge, { backgroundColor: v.status === 'completed' ? Colors.mint : v.status === 'upcoming' ? Colors.primary : Colors.textMuted }]}>
                <Text style={styles.vaccineStatusText}>{v.status === 'completed' ? '✓' : v.status === 'upcoming' ? '!' : '○'}</Text>
              </View>
            </View>
          ))}
        </GlassCard>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: Spacing.md },
  pageHeader: { marginBottom: Spacing.md, marginTop: Spacing.sm },
  pageTitle: { ...Typography.h2, color: Colors.textPrimary, fontWeight: '800' as const },
  pageSub: { ...Typography.caption, color: Colors.textMuted, marginTop: 4 },
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.md },

  heroCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, borderTopWidth: 4,
    ...Shadows.md,
  },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  heroWeekLabel: { ...Typography.label, color: Colors.textMuted, marginBottom: 4 },
  heroWeek: { fontSize: 52, fontWeight: '900' as const, lineHeight: 58 },
  heroBaby: { alignItems: 'center' },
  babyCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.lavenderBg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, marginBottom: 6,
  },
  babyEmoji: { fontSize: 38 },
  babyName: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '700' as const },
  babySize: { ...Typography.micro, color: Colors.textMuted },
  milestoneStrip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.md, padding: Spacing.sm, marginTop: Spacing.sm,
  },
  milestoneStripIcon: { fontSize: 16 },
  milestoneStripText: { ...Typography.bodyBold, color: Colors.textPrimary, flex: 1 },

  trimesterSection: { marginBottom: Spacing.md },
  trimesterLabel: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.full, marginBottom: Spacing.xs,
  },
  trimesterLabelText: { ...Typography.label },
  weeksRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  weekBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  weekBtnText: { ...Typography.caption, color: Colors.textMuted, fontWeight: '700' as const },

  weekDetail: { marginBottom: Spacing.sm },
  weekDetailLabel: { ...Typography.label, color: Colors.textMuted, marginBottom: 4 },
  weekDetailText: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22 },

  milestoneList: { paddingLeft: 4 },
  milestoneItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  milestoneLeft: { alignItems: 'center', width: 24, marginRight: Spacing.sm },
  milestoneDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.surface, borderWidth: 2, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center', zIndex: 1,
  },
  milestoneDotPast: { backgroundColor: Colors.mint, borderColor: Colors.mint },
  milestoneDotCurrent: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  milestoneDotIcon: { color: '#fff', fontSize: 10, fontWeight: '900' as const },
  milestoneLine: { width: 2, flex: 1, backgroundColor: Colors.border, marginVertical: 2 },
  milestoneLinePast: { backgroundColor: Colors.mint },
  milestoneCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.sm, marginBottom: 6,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.xs,
  },
  milestoneCardCurrent: { borderColor: Colors.primary, borderWidth: 2, backgroundColor: Colors.lavenderBg },
  milestoneIcon: { fontSize: 20 },
  milestoneTitle: { ...Typography.bodyBold, color: Colors.textPrimary, fontSize: 13 },
  milestoneWeek: { ...Typography.micro, color: Colors.textMuted },
  milestoneCheck: { color: Colors.mint, fontWeight: '800' as const, fontSize: 16 },

  vaccineRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  vaccineWeekBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm, minWidth: 60, alignItems: 'center' },
  vaccineWeekText: { ...Typography.micro, fontWeight: '700' as const },
  vaccineName: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  vaccineStatusBadge: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  vaccineStatusText: { color: '#fff', fontSize: 11, fontWeight: '900' as const },

  // Due Date Styles
  dueDateHelp: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  dueDateDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  dueDateInfo: {
    backgroundColor: Colors.lavenderBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.lavenderLight,
  },
  dueDateLabel: {
    ...Typography.micro,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  dueDateValue: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  dueDateBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  dueDateBtnSecondary: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dueDateBtnDanger: {
    backgroundColor: '#ff6b6b20',
    borderWidth: 1,
    borderColor: '#ff6b6b60',
  },
  dueDateBtnText: {
    ...Typography.caption,
    color: '#ff6b6b',
    fontWeight: '700' as const,
  },
  dueDateBtnTextSecondary: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700' as const,
  },
  dueDateAddBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  dueDateAddBtnText: {
    ...Typography.bodyBold,
    color: '#fff',
    fontSize: 15,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalBackdrop: {
    position: 'absolute' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...Shadows.lg,
    zIndex: 1,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  dateInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalBtnSave: {
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  modalBtnText: {
    ...Typography.bodyBold,
    color: '#fff',
  },
  modalBtnTextCancel: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
});

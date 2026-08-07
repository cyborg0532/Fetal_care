import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View, Platform, KeyboardAvoidingView,
} from 'react-native';
import { apiFetch } from '../../services/api';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { GlassCard, SectionHeader } from '../../components/PremiumUI';

interface MoodLog {
  id: number;
  mood_score: number;
  notes?: string;
  created_at: string;
}

interface MoodSummary {
  average_score: number;
  emoji: string;
  label: string;
  suggestion: string;
  disclaimer: string;
  alert?: string;
  trend?: number[];
}

const MOOD_OPTIONS = [
  { score: 1, emoji: '😢', label: 'Very Low', color: Colors.moodVeryLow },
  { score: 2, emoji: '😔', label: 'Low', color: Colors.moodLow },
  { score: 3, emoji: '😐', label: 'Okay', color: Colors.moodOkay },
  { score: 4, emoji: '😊', label: 'Good', color: Colors.moodGood },
  { score: 5, emoji: '🌟', label: 'Excellent', color: Colors.moodExcellent },
];

export default function MoodDetectionScreen() {
  const [moodSummary, setMoodSummary] = useState<MoodSummary | null>(null);
  const [moodHistory, setMoodHistory] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [moodModal, setMoodModal] = useState(false);
  const [selectedScore, setSelectedScore] = useState(3);
  const [moodNote, setMoodNote] = useState('');
  const [loggingMood, setLoggingMood] = useState(false);

  const fetchMood = useCallback(async () => {
    try {
      const [summary, history] = await Promise.all([
        apiFetch('/mood/summary'),
        apiFetch('/mood/'),
      ]);
      setMoodSummary(summary);
      setMoodHistory(history);
    } catch (error) {
      console.error('Mood data error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMood(); }, [fetchMood]);

  const submitMood = async () => {
    setLoggingMood(true);
    try {
      await apiFetch('/mood/', {
        method: 'POST',
        body: JSON.stringify({ mood_score: selectedScore, notes: moodNote }),
      });
      setMoodModal(false);
      setMoodNote('');
      await fetchMood();
    } catch (error) {
      Alert.alert('Unable to log mood', 'Please try again.');
    } finally {
      setLoggingMood(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Mood Detection AI">
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mood Detection AI">
      <ScrollView style={styles.container} contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>❤️ Mood & Mental Health</Text>
          <Text style={styles.pageSub}>Track how you feel and receive supportive, pregnancy-aware guidance.</Text>
        </View>

        {moodSummary?.alert ? (
          <GlassCard accent={Colors.moodVeryLow} style={styles.alertCard}>
            <Text style={styles.alertText}>{moodSummary.alert}</Text>
          </GlassCard>
        ) : null}

        <GlassCard>
          <Text style={styles.quickTitle}>How are you feeling today?</Text>
          <View style={styles.moodPicker}>
            {MOOD_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.score}
                style={[styles.moodOption, selectedScore === option.score && { borderColor: option.color, backgroundColor: option.color + '18' }]}
                onPress={() => setSelectedScore(option.score)}
              >
                <Text style={styles.moodEmoji}>{option.emoji}</Text>
                <Text style={[styles.moodLabel, selectedScore === option.score && { color: option.color }]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.logButton} onPress={() => setMoodModal(true)}>
            <Text style={styles.logButtonText}>📝 Log Mood with Notes</Text>
          </TouchableOpacity>
        </GlassCard>

        {moodSummary && moodSummary.average_score > 0 ? (
          <GlassCard style={styles.sectionCard}>
            <SectionHeader title="7-Day Mood Trend" icon="📊" />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryEmoji}>{moodSummary.emoji}</Text>
              <View>
                <Text style={styles.summaryLabel}>{moodSummary.label}</Text>
                <Text style={styles.summaryAverage}>Average: {moodSummary.average_score}/5</Text>
              </View>
            </View>
            <Text style={styles.suggestion}>{moodSummary.suggestion}</Text>
            {moodSummary.trend?.length ? (
              <View style={styles.trendRow}>
                {moodSummary.trend.map((score, index) => {
                  const option = MOOD_OPTIONS.find((item) => item.score === Math.round(score));
                  return <Text key={index} style={styles.trendEmoji}>{option?.emoji ?? '•'}</Text>;
                })}
              </View>
            ) : null}
            <Text style={styles.disclaimer}>{moodSummary.disclaimer}</Text>
          </GlassCard>
        ) : null}

        <GlassCard style={styles.sectionCard}>
          <SectionHeader title="Gentle Self-Care" icon="🌿" />
          {[
            'Take a few slow breaths and rest when you need to.',
            'Share how you feel with someone you trust.',
            'Consider speaking with a counselor if low mood continues.',
          ].map((tip) => <Text key={tip} style={styles.tip}>• {tip}</Text>)}
        </GlassCard>

        {moodHistory.length > 0 ? (
          <View style={styles.history}>
            <SectionHeader title="Recent Mood Entries" icon="📋" />
            {moodHistory.slice(0, 7).map((entry) => {
              const option = MOOD_OPTIONS.find((item) => item.score === entry.mood_score);
              return (
                <GlassCard key={entry.id} accent={option?.color} style={styles.historyCard}>
                  <View style={styles.historyRow}>
                    <Text style={styles.historyEmoji}>{option?.emoji}</Text>
                    <View style={styles.historyText}>
                      <Text style={styles.historyLabel}>{option?.label ?? `Score ${entry.mood_score}`}</Text>
                      {entry.notes ? <Text style={styles.historyNote}>{entry.notes}</Text> : null}
                    </View>
                    <Text style={styles.historyDate}>{new Date(entry.created_at).toLocaleDateString()}</Text>
                  </View>
                </GlassCard>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={moodModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Log your mood</Text>
                <TouchableOpacity onPress={() => setMoodModal(false)}><Text style={styles.close}>✕</Text></TouchableOpacity>
              </View>
              <View style={styles.moodPicker}>
                {MOOD_OPTIONS.map((option) => (
                  <TouchableOpacity key={option.score} style={[styles.moodOption, selectedScore === option.score && { borderColor: option.color, backgroundColor: option.color + '18' }]} onPress={() => setSelectedScore(option.score)}>
                    <Text style={styles.moodEmoji}>{option.emoji}</Text>
                    <Text style={styles.moodLabel}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput value={moodNote} onChangeText={setMoodNote} placeholder="Add a note (optional)" placeholderTextColor={Colors.textMuted} multiline style={styles.noteInput} />
              <TouchableOpacity style={styles.saveButton} onPress={submitMood} disabled={loggingMood}>
                {loggingMood ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Log My Mood</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: Spacing.md, gap: Spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageHeader: { marginTop: Spacing.sm },
  pageTitle: { ...Typography.h2, color: Colors.textPrimary, fontWeight: '800' as const },
  pageSub: { ...Typography.body, color: Colors.textMuted, marginTop: 4 },
  alertCard: { backgroundColor: Colors.moodVeryLow + '12' },
  alertText: { ...Typography.body, color: Colors.moodVeryLow, fontWeight: '600' as const },
  quickTitle: { ...Typography.h4, color: Colors.textPrimary, marginBottom: Spacing.sm },
  moodPicker: { flexDirection: 'row', gap: 6, marginBottom: Spacing.sm },
  moodOption: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: Spacing.sm },
  moodEmoji: { fontSize: 22, marginBottom: 4 },
  moodLabel: { ...Typography.micro, color: Colors.textMuted, textAlign: 'center' },
  logButton: { alignItems: 'center', borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.sm },
  logButtonText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' as const },
  sectionCard: { marginTop: Spacing.xs },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  summaryEmoji: { fontSize: 48 },
  summaryLabel: { ...Typography.h3, color: Colors.textPrimary },
  summaryAverage: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  suggestion: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.md },
  trendRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  trendEmoji: { fontSize: 22 },
  disclaimer: { ...Typography.caption, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 18 },
  tip: { ...Typography.body, color: Colors.textSecondary, lineHeight: 24 },
  history: { marginTop: Spacing.xs },
  historyCard: { marginBottom: Spacing.sm },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  historyEmoji: { fontSize: 26 },
  historyText: { flex: 1 },
  historyLabel: { ...Typography.bodyBold, color: Colors.textPrimary },
  historyNote: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  historyDate: { ...Typography.caption, color: Colors.textMuted },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { ...Typography.h3, color: Colors.textPrimary },
  close: { fontSize: 22, color: Colors.textMuted },
  noteInput: { minHeight: 92, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, color: Colors.textPrimary, padding: Spacing.sm, textAlignVertical: 'top' },
  saveButton: { backgroundColor: Colors.primary, borderRadius: Radius.md, alignItems: 'center', padding: Spacing.md },
  saveButtonText: { ...Typography.bodyBold, color: '#fff' },
});

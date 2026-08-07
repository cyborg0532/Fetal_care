import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { GlassCard, SectionHeader, ProgressBar } from '../../components/PremiumUI';
import { sendFatherPortalMessage } from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  time: string;
}

// ── Static data ───────────────────────────────────────────────────────────────

const QUICK_SUGGESTIONS = [
  '🤢 How can I help with morning sickness?',
  '🏥 What should I pack in the hospital bag?',
  '😴 How to handle third-trimester fatigue?',
  '💬 How do I support her emotionally?',
  '🚨 What are signs of labor starting?',
  '🍎 What foods should we avoid?',
  '🏃 Is exercise safe during pregnancy?',
  '💤 How can she sleep more comfortably?',
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: '0',
    role: 'ai',
    text: "Hi Dad! 👋 I'm your Father Support AI, here to help you be the best partner through this pregnancy journey.\n\nAsk me anything — from supporting her through symptoms, to preparing for birth, to understanding what she's going through. I'm grounded in verified medical guidelines. 💪",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

const NUTRITION_TIPS = [
  'Help stock iron-rich snacks: Spinach, pumpkin seeds, and lean proteins are vital.',
  'Avoid bringing home unpasteurized soft cheeses or sushi to reduce contamination risks.',
  'Make sure calcium-rich supplements are taken at different times than iron pills.',
];

const PREPARATION_TASKS = [
  { text: 'Set up the nursery crib and infant bassinet', done: false },
  { text: 'Pack the father / partner hospital bag', done: false },
  { text: 'Install the newborn car seat safely in the vehicle', done: false },
  { text: 'Organize emergency ambulance contacts on speed dial', done: false },
];

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function FatherPortalScreen() {
  const [tasks, setTasks] = useState(PREPARATION_TASKS);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'guide'>('chat');
  const scrollRef = useRef<ScrollView>(null);

  const toggleTask = (idx: number) => {
    setTasks(prev => prev.map((t, i) => i === idx ? { ...t, done: !t.done } : t));
  };

  const doneCount = tasks.filter(t => t.done).length;
  const progressPct = Math.round((doneCount / tasks.length) * 100);

  const sendMessage = async (text?: string) => {
    const msgText = (text ?? input).trim();
    // Strip suggestion emojis prefix for cleaner display
    const cleanText = msgText.replace(/^[^\w\s]*\s*/, '').trim() || msgText;
    if (!cleanText) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: cleanText,
      time: now,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    try {
      const responseText = await sendFatherPortalMessage(cleanText);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unable to reach the AI.';
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: `⚠️ ${detail}\n\nMake sure the backend is running and Ollama is active.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <DashboardLayout title="Father Support Portal">
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header banner ────────────────────────────────────────────────── */}
        <View style={styles.headerBanner}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerEmoji}>👨</Text>
            <View>
              <Text style={styles.headerTitle}>Father Support Portal</Text>
              <Text style={styles.headerSub}>Guided by verified medical guidelines</Text>
            </View>
          </View>
          <View style={styles.ragPill}>
            <Text style={styles.ragPillDot}>●</Text>
            <Text style={styles.ragPillText}>Ollama · RAG</Text>
          </View>
        </View>

        {/* ── Tab switcher ─────────────────────────────────────────────────── */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
            onPress={() => setActiveTab('chat')}
          >
            <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
              💬 AI Chat
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'guide' && styles.tabActive]}
            onPress={() => setActiveTab('guide')}
          >
            <Text style={[styles.tabText, activeTab === 'guide' && styles.tabTextActive]}>
              📋 Guide & Tasks
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Chat Tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <>
            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={styles.chatArea}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}
                >
                  {msg.role === 'ai' && (
                    <View style={styles.aiAvatar}>
                      <Text style={styles.aiAvatarText}>👨‍⚕️</Text>
                    </View>
                  )}
                  <View style={[
                    styles.bubble,
                    msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI,
                  ]}>
                    {msg.role === 'ai' && (
                      <View style={styles.aiLabel}>
                        <Text style={styles.aiLabelText}>Father AI</Text>
                        <Text style={styles.aiLabelBadge}>RAG · GUIDELINES</Text>
                      </View>
                    )}
                    <Text style={[
                      styles.bubbleText,
                      msg.role === 'user' && styles.bubbleTextUser,
                    ]}>
                      {msg.text}
                    </Text>
                    <Text style={[
                      styles.bubbleTime,
                      msg.role === 'user' && { color: 'rgba(255,255,255,0.6)' },
                    ]}>
                      {msg.time}
                    </Text>
                  </View>
                </View>
              ))}

              {typing && (
                <View style={styles.msgRow}>
                  <View style={styles.aiAvatar}>
                    <Text style={styles.aiAvatarText}>👨‍⚕️</Text>
                  </View>
                  <View style={[styles.bubbleAI, styles.typingBubble]}>
                    <View style={styles.typingDots}>
                      <View style={[styles.typingDot, { opacity: 0.4 }]} />
                      <View style={[styles.typingDot, { opacity: 0.7 }]} />
                      <View style={styles.typingDot} />
                    </View>
                  </View>
                </View>
              )}

              <View style={{ height: Spacing.lg }} />
            </ScrollView>

            {/* Quick suggestion chips */}
            <View style={styles.suggestionsWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestions}
              >
                {QUICK_SUGGESTIONS.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionChip}
                    onPress={() => sendMessage(s)}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                ⚠️ AI-generated guidance only. Not a substitute for medical advice.
              </Text>
            </View>

            {/* Input row */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Ask how to support her..."
                placeholderTextColor={Colors.textMuted}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => sendMessage()}
                returnKeyType="send"
                multiline={false}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || typing) && styles.sendBtnDisabled]}
                onPress={() => sendMessage()}
                disabled={!input.trim() || typing}
              >
                <Text style={styles.sendBtnText}>→</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Guide & Tasks Tab ─────────────────────────────────────────────── */}
        {activeTab === 'guide' && (
          <ScrollView
            style={styles.guideScroll}
            contentContainerStyle={styles.guideContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Trimester Guidance */}
            <GlassCard accent={Colors.skyBlue}>
              <SectionHeader title="Partner Trimester Guidance" icon="🤰" />
              <Text style={styles.guideTitle}>How to Support Her Right Now:</Text>
              <Text style={styles.guideText}>
                • Assist with the daily checklist tracking to ease her mental load.{'\n'}
                • Attend scheduled OB-GYN consultations to stay informed.{'\n'}
                • Help manage external stressors and invite family support selectively.
              </Text>
            </GlassCard>

            {/* Nutrition Tips */}
            <GlassCard accent={Colors.teal}>
              <SectionHeader title="Nutrition Tips for Dads to Keep Stocked" icon="🍎" />
              {NUTRITION_TIPS.map((tip, idx) => (
                <View key={idx} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </GlassCard>

            {/* Delivery Readiness */}
            <GlassCard accent={Colors.primary}>
              <SectionHeader title="Delivery Readiness Checklist" icon="📦" />
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>Task Completion</Text>
                <Text style={styles.progressPctText}>{progressPct}%</Text>
              </View>
              <ProgressBar progress={progressPct} color={Colors.primary} height={6} />

              <View style={styles.taskList}>
                {tasks.map((task, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.taskItem}
                    onPress={() => toggleTask(idx)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
                      {task.done && <Text style={styles.checkboxTick}>✓</Text>}
                    </View>
                    <Text style={[styles.taskText, task.done && styles.taskTextDone]}>
                      {task.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </GlassCard>

            {/* Warning Signs */}
            <GlassCard accent={Colors.coral}>
              <SectionHeader title="Red-Flag Warning Signs to Watch For" icon="🚨" />
              <Text style={styles.warningAlertText}>
                If she reports any of these symptoms, do not wait. Assist her to the nearest hospital immediately:
              </Text>
              <Text style={styles.warningListText}>
                🔴 Severe, persistent abdominal pain.{'\n'}
                🔴 Sudden swelling of face, hands, or ankles (Preeclampsia risk).{'\n'}
                🔴 Any amount of vaginal bleeding.{'\n'}
                🔴 High fever or severe chills.{'\n'}
                🔴 Persistent, severe headache that doesn't go away.
              </Text>
            </GlassCard>

            {/* Chat shortcut CTA */}
            <TouchableOpacity style={styles.chatCta} onPress={() => setActiveTab('chat')}>
              <Text style={styles.chatCtaText}>💬 Still have questions? Ask the AI →</Text>
            </TouchableOpacity>

            <View style={{ height: Spacing.xl }} />
          </ScrollView>
        )}

      </KeyboardAvoidingView>
    </DashboardLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Header
  headerBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.skyBlueBg,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.skyBlue + '30',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerEmoji: { fontSize: 28 },
  headerTitle: { ...Typography.h4, color: Colors.textPrimary, fontWeight: '700' as const },
  headerSub: { ...Typography.micro, color: Colors.textMuted },
  ragPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.tealBg, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.tealLight + '60',
  },
  ragPillDot: { color: Colors.teal, fontSize: 8 },
  ragPillText: { ...Typography.micro, color: Colors.teal, fontWeight: '600' as const },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.skyBlue },
  tabText: { ...Typography.caption, color: Colors.textMuted, fontWeight: '500' as const },
  tabTextActive: { color: Colors.skyBlue, fontWeight: '700' as const },

  // Chat
  chatArea: { flex: 1 },
  chatContent: { padding: Spacing.md, gap: Spacing.sm },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, marginBottom: Spacing.sm },
  msgRowUser: { justifyContent: 'flex-end' },

  aiAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.skyBlueBg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.skyBlue + '40',
  },
  aiAvatarText: { fontSize: 18 },

  bubble: {
    maxWidth: '80%' as any, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadows.xs,
  },
  bubbleAI: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderBottomLeftRadius: Radius.xs,
  },
  bubbleUser: {
    backgroundColor: Colors.skyBlue,
    borderBottomRightRadius: Radius.xs,
  },
  aiLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  aiLabelText: { ...Typography.caption, color: Colors.skyBlue, fontWeight: '700' as const },
  aiLabelBadge: {
    ...Typography.micro, color: Colors.teal, fontWeight: '700' as const,
    backgroundColor: Colors.tealBg, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.tealLight + '80',
  },
  bubbleText: { ...Typography.body, color: Colors.textPrimary, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  bubbleTime: { ...Typography.micro, color: Colors.textMuted, marginTop: 6, alignSelf: 'flex-end' },

  typingBubble: { padding: Spacing.sm },
  typingDots: { flexDirection: 'row', gap: 4, padding: 6, alignItems: 'center' },
  typingDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.skyBlue,
  },

  suggestionsWrap: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface, paddingVertical: Spacing.xs,
  },
  suggestions: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  suggestionChip: {
    backgroundColor: Colors.skyBlueBg, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.skyBlue + '40',
  },
  suggestionText: { ...Typography.caption, color: Colors.skyBlue, fontWeight: '600' as const },

  disclaimer: {
    backgroundColor: Colors.goldBg, paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: Colors.gold + '30',
  },
  disclaimerText: { ...Typography.micro, color: Colors.textMuted, textAlign: 'center' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    color: Colors.textPrimary, ...Typography.body,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.skyBlue, justifyContent: 'center', alignItems: 'center',
    ...Shadows.sm,
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendBtnText: { fontSize: 20, color: '#fff', fontWeight: '700' as const },

  // Guide tab
  guideScroll: { flex: 1 },
  guideContent: { padding: Spacing.md, gap: Spacing.md },

  guideTitle: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: Spacing.xs },
  guideText: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22 },

  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.teal, marginTop: 8 },
  tipText: { ...Typography.body, color: Colors.textSecondary, flex: 1, lineHeight: 20 },

  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { ...Typography.caption, color: Colors.textMuted },
  progressPctText: { ...Typography.caption, fontWeight: '700' as const, color: Colors.primary },

  taskList: { marginTop: Spacing.md },
  taskItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8 },
  checkbox: {
    width: 20, height: 20, borderRadius: Radius.xs,
    borderWidth: 1.5, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxTick: { color: '#fff', fontSize: 11, fontWeight: '700' as const },
  taskText: { ...Typography.body, color: Colors.textSecondary, flex: 1 },
  taskTextDone: { textDecorationLine: 'line-through', color: Colors.textMuted },

  warningAlertText: {
    ...Typography.bodyBold, color: Colors.danger,
    lineHeight: 22, marginBottom: Spacing.sm,
  },
  warningListText: { ...Typography.body, color: Colors.textSecondary, lineHeight: 24 },

  chatCta: {
    backgroundColor: Colors.skyBlueBg, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.skyBlue + '40',
    marginTop: Spacing.xs,
  },
  chatCtaText: { ...Typography.bodyBold, color: Colors.skyBlue },
});

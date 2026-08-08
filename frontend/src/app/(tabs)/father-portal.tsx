import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { sendFatherPortalMessage } from '../../services/api';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  time: string;
}

interface TaskItem {
  id: string;
  title: string;
  category: 'Trimester 1' | 'Trimester 2' | 'Trimester 3' | 'Postpartum';
  completed: boolean;
  priority: 'high' | 'medium' | 'normal';
}

interface RedFlag {
  title: string;
  symptoms: string[];
  action: string;
  severity: 'critical' | 'high';
  emoji: string;
}

const INITIAL_TASKS: TaskItem[] = [
  { id: '1', title: 'Schedule & attend 1st trimester ultrasound with mom', category: 'Trimester 1', completed: true, priority: 'high' },
  { id: '2', title: 'Start emergency phone contact list (OB/GYN, Hospital, Ambulance)', category: 'Trimester 1', completed: true, priority: 'high' },
  { id: '3', title: 'Help manage morning sickness (stock crackers, ginger tea, stay calm)', category: 'Trimester 1', completed: false, priority: 'medium' },
  { id: '4', title: 'Research & register for childbirth / parenting classes', category: 'Trimester 2', completed: false, priority: 'medium' },
  { id: '5', title: 'Set up infant car seat and verify safety installation', category: 'Trimester 2', completed: false, priority: 'high' },
  { id: '6', title: 'Assemble crib & prepare nursery sleeping area', category: 'Trimester 2', completed: false, priority: 'normal' },
  { id: '7', title: 'Pack partner hospital bag (snacks, extra clothes, chargers, toiletries)', category: 'Trimester 3', completed: false, priority: 'high' },
  { id: '8', title: 'Plan hospital route and test drive during peak traffic hours', category: 'Trimester 3', completed: false, priority: 'high' },
  { id: '9', title: 'Prepare home meal plan & freeze pre-made meals for week 1', category: 'Trimester 3', completed: false, priority: 'medium' },
  { id: '10', title: 'Take over household chores & protect mom\'s sleep schedule', category: 'Postpartum', completed: false, priority: 'high' },
  { id: '11', title: 'Monitor mom for postpartum baby blues & depression signs', category: 'Postpartum', completed: false, priority: 'high' },
];

const RED_FLAGS: RedFlag[] = [
  {
    title: 'Severe Vaginal Bleeding',
    symptoms: ['Heavy bright red bleeding', 'Soaking >1 pad per hour', 'Severe abdominal cramps'],
    action: 'Drive to Emergency Department immediately or call ambulance (108 / local SOS). Keep mom calm and lying down.',
    severity: 'critical',
    emoji: '🩸',
  },
  {
    title: 'Preeclampsia / High BP Warning',
    symptoms: ['Severe unyielding headache', 'Visual spots/flashes', 'Sudden face/hand swelling', 'Upper right belly pain'],
    action: 'Urgent hospital triage needed. Measure BP if monitor available. Do not let mom drive.',
    severity: 'critical',
    emoji: '⚠️',
  },
  {
    title: 'Premature Rupture of Membranes',
    symptoms: ['Gush or steady trickle of fluid before 37 weeks', 'Foul-smelling or greenish fluid'],
    action: 'Note time of fluid release, color, and odor. Contact OB/GYN and go to labor & delivery unit immediately.',
    severity: 'high',
    emoji: '🌊',
  },
  {
    title: 'Decreased Fetal Movement',
    symptoms: ['Noticeable drop in baby kicks in 3rd trimester (<10 kicks in 2 hours when focused)'],
    action: 'Have mom drink cold water/juice, lie on left side, and count kicks for 1 hour. If still low, go to triage.',
    severity: 'high',
    emoji: '👶',
  },
  {
    title: 'High Fever or Infection',
    symptoms: ['Fever >38°C (100.4°F)', 'Chills', 'Burning during urination'],
    action: 'Call OB/GYN doctor on call immediately. High fever requires prompt medical evaluation.',
    severity: 'high',
    emoji: '🌡️',
  },
];

const QUICK_SUGGESTIONS = [
  'How can I support my partner during labor?',
  'What items should I put in my hospital bag?',
  'What are warning signs of preeclampsia?',
  'How do I handle postpartum emotional changes?',
  'What foods help with 1st trimester morning sickness?',
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: '0',
    role: 'ai',
    text: "Welcome to the Father & Partner Portal! 👨‍🍼\n\nI'm your dedicated AI Partner Guide. Whether you need advice on supporting mom, hospital prep, labor assistance, or navigating emotional changes, I'm here for you 24/7.",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
];

export default function FatherPortalScreen() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'ai' | 'redflags' | 'guide'>('tasks');
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    return () => showSub.remove();
  }, []);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const sendMessage = async (text?: string) => {
    const msgText = text ?? input.trim();
    if (!msgText) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: msgText, time: now };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    try {
      const responseText = await sendFatherPortalMessage(msgText);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unable to reach Father AI Guide.';
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: `⚠️ ${detail}\n\nPlease ensure the backend AI service is active.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const filteredTasks = selectedCategory === 'All'
    ? tasks
    : tasks.filter(t => t.category === selectedCategory);

  return (
    <DashboardLayout title="Father Portal">
      <View style={styles.container}>
        
        {/* Top Hero Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroEmoji}>👨‍🍼</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Father & Partner Portal</Text>
                <Text style={styles.heroSubtitle}>Your essential companion guide, task sheets & emergency index</Text>
              </View>
            </View>
            <View style={styles.progressRow}>
              <View style={styles.progressTextRow}>
                <Text style={styles.progressLabel}>Partner Tasks Ready</Text>
                <Text style={styles.progressPercentText}>{completedCount}/{totalCount} ({progressPercent}%)</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'tasks' && styles.tabButtonActive]}
            onPress={() => setActiveTab('tasks')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'tasks' && styles.tabButtonTextActive]}>
              📋 Task Sheet
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'ai' && styles.tabButtonActive]}
            onPress={() => setActiveTab('ai')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'ai' && styles.tabButtonTextActive]}>
              🤖 Father AI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'redflags' && styles.tabButtonActive]}
            onPress={() => setActiveTab('redflags')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'redflags' && styles.tabButtonTextActive]}>
              🚨 Red Flags
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'guide' && styles.tabButtonActive]}
            onPress={() => setActiveTab('guide')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'guide' && styles.tabButtonTextActive]}>
              💡 Partner Tips
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: TASK SHEETS */}
        {activeTab === 'tasks' && (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            {/* Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipContainer}>
              {['All', 'Trimester 1', 'Trimester 2', 'Trimester 3', 'Postpartum'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Task List */}
            <View style={styles.taskListContainer}>
              {filteredTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskCard, task.completed && styles.taskCardCompleted]}
                  onPress={() => toggleTask(task.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
                    {task.completed && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.taskTextWrap}>
                    <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
                      {task.title}
                    </Text>
                    <View style={styles.taskMetaRow}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{task.category}</Text>
                      </View>
                      {task.priority === 'high' && (
                        <View style={styles.priorityBadgeHigh}>
                          <Text style={styles.priorityBadgeTextHigh}>High Priority</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* TAB 2: FATHER AI CHAT */}
        {activeTab === 'ai' && (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
          >
            {/* RAG indicator */}
            <View style={styles.ragBadgeRow}>
              <View style={styles.ragBadge}>
                <Text style={styles.ragBadgeDot}>●</Text>
                <Text style={styles.ragBadgeText}>Father AI RAG · Practical Partner Guidelines</Text>
              </View>
            </View>

            {/* Chat list */}
            <ScrollView
              ref={scrollRef}
              style={styles.chatArea}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg) => (
                <View key={msg.id} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
                  {msg.role === 'ai' && (
                    <View style={styles.aiAvatar}>
                      <Text style={styles.aiAvatarText}>👨‍🍼</Text>
                    </View>
                  )}
                  <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
                    {msg.role === 'ai' && (
                      <View style={styles.aiLabel}>
                        <Text style={styles.aiLabelText}>Father AI Guide</Text>
                      </View>
                    )}
                    <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
                      {msg.text}
                    </Text>
                    <Text style={[styles.bubbleTime, msg.role === 'user' && { color: 'rgba(255,255,255,0.6)' }]}>
                      {msg.time}
                    </Text>
                  </View>
                </View>
              ))}

              {typing && (
                <View style={styles.msgRow}>
                  <View style={styles.aiAvatar}><Text style={styles.aiAvatarText}>👨‍🍼</Text></View>
                  <View style={styles.typingBubble}>
                    <Text style={styles.typingText}>Father AI is thinking...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Quick suggestion chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.suggestionsScroll}
              contentContainerStyle={styles.suggestionsContainer}
            >
              {QUICK_SUGGESTIONS.map((sug, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestionChip}
                  onPress={() => sendMessage(sug)}
                >
                  <Text style={styles.suggestionText}>💬 {sug}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Input bar */}
            <View style={styles.inputBar}>
              <TextInput
                style={styles.textInput}
                placeholder="Ask Father AI anything..."
                placeholderTextColor={Colors.textMuted}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => sendMessage()}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.sendButton, (!input.trim() || typing) && styles.sendButtonDisabled]}
                onPress={() => sendMessage()}
                disabled={!input.trim() || typing}
              >
                <Text style={styles.sendButtonText}>Send ➔</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* TAB 3: RED FLAGS INDEX */}
        {activeTab === 'redflags' && (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.redFlagHeaderBox}>
              <Text style={styles.redFlagHeaderTitle}>🚨 Emergency Red Flag Warnings</Text>
              <Text style={styles.redFlagHeaderSub}>
                As a partner, know these symptoms. If mom experiences any of these, act swiftly and calm.
              </Text>
            </View>

            {RED_FLAGS.map((rf, index) => (
              <View key={index} style={[styles.redFlagCard, rf.severity === 'critical' && styles.redFlagCardCritical]}>
                <View style={styles.redFlagTopRow}>
                  <Text style={styles.redFlagEmoji}>{rf.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.redFlagTitle}>{rf.title}</Text>
                    <View style={rf.severity === 'critical' ? styles.criticalBadge : styles.highBadge}>
                      <Text style={styles.badgeText}>{rf.severity.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Key Symptoms to Watch:</Text>
                {rf.symptoms.map((sym, i) => (
                  <Text key={i} style={styles.symptomBullet}>• {sym}</Text>
                ))}

                <View style={styles.actionBox}>
                  <Text style={styles.actionBoxTitle}>⚡ What Partner Should Do:</Text>
                  <Text style={styles.actionBoxText}>{rf.action}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* TAB 4: PARTNER TIPS & GUIDES */}
        {activeTab === 'guide' && (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.guideCard}>
              <Text style={styles.guideCardTitle}>🌱 Trimester 1: Early Support</Text>
              <Text style={styles.guideCardText}>
                • Morning sickness is real. Keep saltines & ginger tea by the bed.
                {'\n'}• Mood shifts are hormonal — listen patiently without offering quick fixes.
                {'\n'}• Attend early prenatal checkups & ultrasounds together.
              </Text>
            </View>

            <View style={styles.guideCard}>
              <Text style={styles.guideCardTitle}>✨ Trimester 2: Active Preparation</Text>
              <Text style={styles.guideCardText}>
                • Take on physical household labor (lifting, bending, heavy cleaning).
                {'\n'}• Plan nursery layout and infant safety equipment.
                {'\n'}• Offer foot & lower back massages to alleviate joint pressure.
              </Text>
            </View>

            <View style={styles.guideCard}>
              <Text style={styles.guideCardTitle}>🏥 Trimester 3: Labor Preparedness</Text>
              <Text style={styles.guideCardText}>
                • Memorize the route to the hospital & hospital L&D entrance.
                {'\n'}• Keep your phone charged, on loud ring, and ready 24/7.
                {'\n'}• Practice deep breathing & counter-pressure massage techniques.
              </Text>
            </View>

            <View style={styles.guideCard}>
              <Text style={styles.guideCardTitle}>👶 Postpartum: The Fourth Trimester</Text>
              <Text style={styles.guideCardText}>
                • Protect mom's sleep by handling nighttime diaper changes & burping.
                {'\n'}• Manage visitors and boundaries so mom can rest and recover.
                {'\n'}• Stay attentive for signs of postpartum mood changes or depression.
              </Text>
            </View>
          </ScrollView>
        )}

      </View>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.lavenderLight,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  heroContent: {
    gap: Spacing.sm,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroEmoji: {
    fontSize: 34,
  },
  heroTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
  },
  heroSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressRow: {
    marginTop: Spacing.xs,
    gap: 4,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
  },
  progressPercentText: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: 4,
    marginBottom: Spacing.md,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabButtonActive: {
    backgroundColor: Colors.surface,
    ...Shadows.xs,
  },
  tabButtonText: {
    ...Typography.captionBold,
    color: Colors.textMuted,
  },
  tabButtonTextActive: {
    color: Colors.primary,
  },

  tabContent: {
    flex: 1,
  },

  chipScroll: {
    maxHeight: 40,
    marginBottom: Spacing.sm,
  },
  chipContainer: {
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.lavenderBg,
    borderColor: Colors.lavender,
  },
  chipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    ...Typography.captionBold,
    color: Colors.lavender,
  },

  taskListContainer: {
    gap: Spacing.xs,
    paddingBottom: Spacing.xl,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadows.xs,
  },
  taskCardCompleted: {
    backgroundColor: Colors.surfaceSecondary,
    borderColor: Colors.borderLight,
    opacity: 0.75,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  taskTextWrap: {
    flex: 1,
    gap: 4,
  },
  taskTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  categoryBadge: {
    backgroundColor: Colors.skyBlueBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  categoryBadgeText: {
    ...Typography.micro,
    color: Colors.skyBlue,
    fontWeight: '600',
  },
  priorityBadgeHigh: {
    backgroundColor: Colors.coralBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  priorityBadgeTextHigh: {
    ...Typography.micro,
    color: Colors.coral,
    fontWeight: '700',
  },

  ragBadgeRow: {
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  ragBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.tealBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 6,
  },
  ragBadgeDot: {
    color: Colors.teal,
    fontSize: 10,
  },
  ragBadgeText: {
    ...Typography.micro,
    color: Colors.teal,
    fontWeight: '600',
  },

  chatArea: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.lavenderBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiAvatarText: {
    fontSize: 18,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  bubbleAI: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.xs,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
  },
  aiLabel: {
    marginBottom: 4,
  },
  aiLabelText: {
    ...Typography.micro,
    color: Colors.primary,
    fontWeight: '700',
  },
  bubbleText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  bubbleTextUser: {
    color: '#FFF',
  },
  bubbleTime: {
    ...Typography.micro,
    color: Colors.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingBubble: {
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  typingText: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  suggestionsScroll: {
    maxHeight: 38,
    marginVertical: Spacing.xs,
  },
  suggestionsContainer: {
    gap: Spacing.xs,
  },
  suggestionChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.lavenderLight,
  },
  suggestionText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },

  inputBar: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    backgroundColor: Colors.background,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceSecondary,
    opacity: 0.5,
  },
  sendButtonText: {
    ...Typography.bodyBold,
    color: '#FFF',
  },

  redFlagHeaderBox: {
    backgroundColor: Colors.coralBg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.coral + '40',
    marginBottom: Spacing.md,
  },
  redFlagHeaderTitle: {
    ...Typography.h3,
    color: Colors.danger,
    marginBottom: 4,
  },
  redFlagHeaderSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  redFlagCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadows.xs,
  },
  redFlagCardCritical: {
    borderColor: Colors.coral,
    borderWidth: 1.5,
  },
  redFlagTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  redFlagEmoji: {
    fontSize: 28,
  },
  redFlagTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  criticalBadge: {
    backgroundColor: Colors.danger,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    marginTop: 2,
  },
  highBadge: {
    backgroundColor: Colors.gold,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    marginTop: 2,
  },
  badgeText: {
    ...Typography.micro,
    color: '#FFF',
    fontWeight: '800',
  },
  sectionLabel: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: 2,
  },
  symptomBullet: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginLeft: Spacing.xs,
  },
  actionBox: {
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  actionBoxTitle: {
    ...Typography.captionBold,
    color: Colors.primary,
    marginBottom: 2,
  },
  actionBoxText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textPrimary,
  },

  guideCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadows.xs,
  },
  guideCardTitle: {
    ...Typography.h3,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  guideCardText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});

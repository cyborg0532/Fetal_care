import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows, TOPBAR_HEIGHT } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { sendAiBuddyMessage } from '../../services/api';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  time: string;
}

const QUICK_SUGGESTIONS = [
  'What should I eat in week 20?',
  'Is it safe to exercise now?',
  'What are signs of preeclampsia?',
  'How much water should I drink?',
  'Normal baby movements per day?',
  'When should I pack my hospital bag?',
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: '0',
    role: 'ai',
    text: "Hi Mama! 👋 I'm your AI Pregnancy Buddy powered by verified medical guidelines. I can answer questions about pregnancy, nutrition, symptoms, and more.\n\nRemember: I provide general guidance only — always consult your doctor for medical decisions. 🌸",
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
];

export default function AIBuddyScreen() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
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

  const sendMessage = async (text?: string) => {
    const msgText = text ?? input.trim();
    if (!msgText) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: msgText, time: now };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    try {
      const responseText = await sendAiBuddyMessage(msgText);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unable to reach the AI Buddy.';
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
    <DashboardLayout title="AI Pregnancy Buddy">
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
      >

        {/* Daily check-in card */}
        <View style={styles.checkInCard}>
          <View style={styles.checkInLeft}>
            <Text style={styles.checkInTitle}>🤖 Daily Check-in</Text>
            <View style={styles.checkInItems}>
              <Text style={styles.checkInItem}>💧 Water: 4/8 glasses</Text>
              <Text style={styles.checkInItem}>💊 Iron tablet: Pending</Text>
              <Text style={styles.checkInItem}>📅 Next checkup: 12 days</Text>
            </View>
          </View>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>

        {/* RAG indicator */}
        <View style={styles.ragBadgeRow}>
          <View style={styles.ragBadge}>
            <Text style={styles.ragBadgeDot}>●</Text>
            <Text style={styles.ragBadgeText}>Powered by local medical guidelines · Ollama</Text>
          </View>
        </View>

        {/* Chat messages */}
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
                  <Text style={styles.aiAvatarText}>🤖</Text>
                </View>
              )}
              <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}>
                {msg.role === 'ai' && (
                  <View style={styles.aiLabel}>
                    <Text style={styles.aiLabelText}>AI Buddy</Text>
                    <Text style={styles.aiLabelBadge}>RAG · MEDICAL GUIDELINES</Text>
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
              <View style={styles.aiAvatar}><Text style={styles.aiAvatarText}>🤖</Text></View>
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

        {/* Quick suggestions */}
        <View style={styles.suggestionsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions} keyboardShouldPersistTaps="handled">
            {QUICK_SUGGESTIONS.map((s, i) => (
              <TouchableOpacity key={i} style={styles.suggestionChip} onPress={() => sendMessage(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>⚠️ AI-generated guidance only. Not a substitute for medical advice.</Text>
        </View>

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask your AI Buddy..."
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            onFocus={() => {
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
            }}
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

      </KeyboardAvoidingView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  checkInCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.lavenderBg, padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.lavenderLight,
    gap: Spacing.md,
  },
  checkInLeft: { flex: 1 },
  checkInTitle: { ...Typography.h4, color: Colors.lavender, fontWeight: '700' as const, marginBottom: 4 },
  checkInItems: { gap: 2 },
  checkInItem: { ...Typography.caption, color: Colors.textSecondary },
  aiBadge: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.lavender, justifyContent: 'center', alignItems: 'center',
    ...Shadows.sm,
  },
  aiBadgeText: { color: '#fff', fontWeight: '900' as const, fontSize: 14 },

  ragBadgeRow: {
    backgroundColor: Colors.tealBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tealLight + '40',
    alignItems: 'center',
  },
  ragBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ragBadgeDot: { color: Colors.teal, fontSize: 10 },
  ragBadgeText: { ...Typography.micro, color: Colors.teal, fontWeight: '600' as const },

  chatArea: { flex: 1 },
  chatContent: { padding: Spacing.md, gap: Spacing.sm },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, marginBottom: Spacing.sm },
  msgRowUser: { justifyContent: 'flex-end' },

  aiAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.lavenderBg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.lavenderLight,
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
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.xs,
  },
  aiLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  aiLabelText: { ...Typography.caption, color: Colors.lavender, fontWeight: '700' as const },
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
    backgroundColor: Colors.lavender,
  },

  suggestionsWrap: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface, paddingVertical: Spacing.xs,
  },
  suggestions: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  suggestionChip: {
    backgroundColor: Colors.lavenderBg, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.lavenderLight,
  },
  suggestionText: { ...Typography.caption, color: Colors.lavender, fontWeight: '600' as const },

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
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    ...Shadows.sm,
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendBtnText: { fontSize: 20, color: '#fff', fontWeight: '700' as const },
});

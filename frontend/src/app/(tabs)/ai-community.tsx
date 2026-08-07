import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { GlassCard, SectionHeader, Badge } from '../../components/PremiumUI';

const AI_RECOMMENDATIONS = [
  {
    topic: 'Morning Sickness & Hydration',
    recommendation: 'Morning sickness can significantly impact hydration. Try consuming small, frequent sips of electrolyte-rich liquids, ginger tea, or coconut water. Avoid large volumes of plain water on an empty stomach.',
    source: 'AI Buddy Insight · Medically Reviewed',
  },
  {
    topic: 'Back Pain Relief in Trimester 2',
    recommendation: 'As your center of gravity shifts, pelvic tilts, prenatal yoga, and wearing supportive flat footwear can relieve lumbar strain. Sleeping with a pregnancy pillow between your knees is highly recommended.',
    source: 'AI Buddy Insight · physical Therapy Guide',
  },
  {
    topic: 'Iron Supplement Absorption',
    recommendation: 'Take iron supplements with Vitamin C (like orange juice) to enhance absorption. Avoid taking them alongside calcium supplements, milk, or coffee/tea, as they inhibit iron absorption.',
    source: 'AI Buddy Insight · Nutrition Engine',
  }
];

const COMMUNITY_EXPERIENCES = [
  {
    topic: 'Morning Sickness & Hydration',
    experience: '“Ginger candies were a lifesaver for me! Also, ice-cold lemon water was much easier to keep down than warm water. Took about 3 weeks to settle.”',
    author: 'Neha S., Week 16',
    agreeCount: 142,
  },
  {
    topic: 'Back Pain Relief in Trimester 2',
    experience: '“I started doing gentle swimming twice a week, and it completely relieved my lower back pressure. It felt so good to feel weightless for a bit!”',
    author: 'Priya K., Week 22',
    agreeCount: 98,
  },
  {
    topic: 'Iron Supplement Absorption',
    experience: '“My doctor had me switch to taking my iron pill right before bed with a small glass of orange juice. No more morning nausea from it!”',
    author: 'Anjali R., Week 29',
    agreeCount: 215,
  }
];

export default function AICommunityScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);

  return (
    <DashboardLayout title="AI + Community">
      <ScrollView style={styles.container} contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>💬 AI + Community Experience</Text>
          <Text style={styles.pageSub}>Compare clinical AI guidance beside real-world shared maternal experiences</Text>
        </View>

        {/* Topic Selector */}
        <View style={styles.topicsRow}>
          {AI_RECOMMENDATIONS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.topicTab, selectedTopicIndex === idx && styles.topicTabActive]}
              onPress={() => setSelectedTopicIndex(idx)}
            >
              <Text style={[styles.topicTabText, selectedTopicIndex === idx && styles.topicTabTextActive]}>
                {item.topic}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.splitLayout, isWide && styles.splitLayoutWide]}>
          {/* Left Panel: AI Guidance */}
          <View style={[styles.panel, isWide && styles.panelHalf]}>
            <SectionHeader title="AI Recommended Guidance" icon="🤖" />
            <GlassCard accent={Colors.lavender} style={styles.cardHeight}>
              <Text style={styles.cardTopicTitle}>{AI_RECOMMENDATIONS[selectedTopicIndex].topic}</Text>
              <Text style={styles.aiText}>{AI_RECOMMENDATIONS[selectedTopicIndex].recommendation}</Text>
              <View style={styles.aiFooter}>
                <Badge label="VERIFIED SOURCE" color={Colors.teal} />
                <Text style={styles.sourceText}>{AI_RECOMMENDATIONS[selectedTopicIndex].source}</Text>
              </View>
            </GlassCard>
          </View>

          {/* Right Panel: Community Wisdom */}
          <View style={[styles.panel, isWide && styles.panelHalf]}>
            <SectionHeader title="Community Real Experiences" icon="👭" />
            <GlassCard accent={Colors.primary} style={styles.cardHeight}>
              <Text style={styles.cardTopicTitle}>Moms Sharing on this Topic</Text>
              <Text style={styles.communityQuote}>{COMMUNITY_EXPERIENCES[selectedTopicIndex].experience}</Text>
              <View style={styles.communityFooter}>
                <View>
                  <Text style={styles.authorText}>{COMMUNITY_EXPERIENCES[selectedTopicIndex].author}</Text>
                  <Text style={styles.agreeText}>👍 {COMMUNITY_EXPERIENCES[selectedTopicIndex].agreeCount} mothers agreed</Text>
                </View>
                <TouchableOpacity style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>Join Chat</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        </View>

        {/* Insight summary */}
        <GlassCard style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 Companion Note</Text>
          <Text style={styles.tipText}>
            Medical guidelines supply the safest foundations, but other mothers' tips supply the daily comfort. Always run community tips past your OB-GYN before implementation.
          </Text>
        </GlassCard>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: Spacing.md },
  pageHeader: { marginBottom: Spacing.md, marginTop: Spacing.sm },
  pageTitle: { ...Typography.h2, color: Colors.textPrimary, fontWeight: '800' as const },
  pageSub: { ...Typography.body, color: Colors.textMuted, marginTop: 4 },

  topicsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    flexWrap: 'wrap' as const,
  },
  topicTab: {
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topicTabActive: {
    backgroundColor: Colors.lavenderBg,
    borderColor: Colors.lavender,
  },
  topicTabText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  topicTabTextActive: {
    color: Colors.lavender,
  },

  splitLayout: {
    flexDirection: 'column',
    gap: Spacing.md,
  },
  splitLayoutWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  panel: {
    width: '100%' as any,
  },
  panelHalf: {
    width: '48.5%' as any,
  },
  cardHeight: {
    minHeight: 240,
    justifyContent: 'space-between',
  },
  cardTopicTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: '700' as const,
    marginBottom: Spacing.sm,
  },
  aiText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  aiFooter: {
    marginTop: Spacing.md,
    gap: 8,
  },
  sourceText: {
    ...Typography.micro,
    color: Colors.textMuted,
  },
  communityQuote: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  communityFooter: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorText: {
    ...Typography.caption,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  agreeText: {
    ...Typography.micro,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  actionBtnText: {
    ...Typography.micro,
    color: '#fff',
    fontWeight: '700' as const,
  },
  tipCard: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.tealBg,
    borderColor: Colors.tealLight + '40',
  },
  tipTitle: {
    ...Typography.bodyBold,
    color: Colors.teal,
    marginBottom: 4,
  },
  tipText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

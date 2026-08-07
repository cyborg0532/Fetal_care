import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { GlassCard, SectionHeader, Badge } from '../../components/PremiumUI';

const MENTORS = [
  {
    name: 'Sarah Jenkins',
    experience: 'Mother of 2 children · 5 years mentoring',
    rating: 4.9,
    reviews: 112,
    badge: 'C-Section & Twins Guide',
    availability: 'Available this weekend',
  },
  {
    name: 'Meenakshi Iyer',
    experience: 'Mother of 3 children · 8 years mentoring',
    rating: 4.8,
    reviews: 240,
    badge: 'Postpartum Wellness Expert',
    availability: 'Sessions open tomorrow',
  }
];

export default function MotherMentorScreen() {
  return (
    <DashboardLayout title="Mother Mentor Program">
      <ScrollView style={styles.container} contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>⭐ Mother Mentor Program</Text>
          <Text style={styles.pageSub}>Connect with experienced verified mothers who have navigated the path ahead of you</Text>
        </View>

        {/* Premium Badge Explainer */}
        <GlassCard accent={Colors.gold} style={styles.introCard}>
          <View style={styles.badgeWrap}>
            <Text style={styles.crownEmoji}>👑</Text>
            <Badge label="PREMIUM BENEFIT" color={Colors.gold} />
          </View>
          <Text style={styles.introTitle}>1-on-1 Personalized Mentoring</Text>
          <Text style={styles.introText}>
            Get matched with maternal mentors based on your specific pregnancy profile, situation (e.g. working mother, twins), or delivery goals. Ask questions in private chats and book 1-on-1 audio guidance sessions.
          </Text>
        </GlassCard>

        <SectionHeader title="Verified Mother Mentors" icon="👭" />

        {MENTORS.map((mentor, idx) => (
          <GlassCard key={idx} accent={Colors.lavender}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.mentorName}>{mentor.name}</Text>
                  <Badge label="VERIFIED MAMA" color={Colors.teal} />
                </View>
                <Text style={styles.mentorExp}>{mentor.experience}</Text>
              </View>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>⭐ {mentor.rating}</Text>
              </View>
            </View>

            <View style={styles.tagRow}>
              <Badge label={mentor.badge} color={Colors.lavender} />
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardFooter}>
              <Text style={styles.availText}>📅 {mentor.availability}</Text>
              <TouchableOpacity style={styles.bookBtn}>
                <Text style={styles.bookBtnText}>Book Session</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        ))}

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

  introCard: {
    backgroundColor: Colors.goldBg,
    borderColor: Colors.gold + '40',
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  crownEmoji: { fontSize: 20 },
  introTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '800' as const,
    marginBottom: Spacing.xs,
  },
  introText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap' as const,
  },
  mentorName: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: '700' as const,
  },
  mentorExp: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 4,
  },
  ratingBadge: {
    backgroundColor: Colors.goldBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  ratingText: {
    ...Typography.caption,
    fontWeight: '700' as const,
    color: Colors.gold,
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  bookBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  bookBtnText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '700' as const,
  },
});

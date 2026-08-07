import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, RefreshControl, ActivityIndicator,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { apiFetch } from '../../services/api';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../constants/theme';
import DashboardLayout from '../../components/DashboardLayout';
import { GlassCard, SectionHeader, Badge, EmptyState } from '../../components/PremiumUI';

interface Group {
  id: number;
  name: string;
  description: string;
  category: string;
  member_count: number;
}

interface Post {
  id: number;
  group_id: number;
  user_id: number;
  title: string;
  content: string;
  created_at: string;
}

interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
}

const CAT_META: Record<string, { color: string; bg: string; emoji: string; label: string }> = {
  'due-date':     { color: Colors.primary,  bg: Colors.lavenderBg, emoji: '📅', label: 'Due Date' },
  'city':         { color: Colors.teal,     bg: Colors.tealBg,     emoji: '🏙️', label: 'City' },
  'risk-category':{ color: Colors.warning,  bg: Colors.goldBg,     emoji: '⚕️', label: 'High Risk' },
  'general':      { color: Colors.lavender, bg: Colors.lavenderBg, emoji: '💜', label: 'General' },
};

const DEFAULT_CAT = { color: Colors.primary, bg: Colors.lavenderBg, emoji: '💜', label: 'Group' };

const TRENDING = ['Morning sickness tips', 'Hospital bag checklist', 'Baby name ideas', 'Iron supplements', 'C-section recovery'];

export default function CommunityScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [postModal, setPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [commentText, setCommentText] = useState('');
  const [view, setView] = useState<'groups' | 'posts' | 'comments'>('groups');
  const [search, setSearch] = useState('');

  const fetchGroups = useCallback(async () => {
    try {
      const data = await apiFetch('/community/groups');
      setGroups(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchGroups(); }, []);

  const openGroup = async (group: Group) => {
    setSelectedGroup(group);
    try {
      const data = await apiFetch(`/community/groups/${group.id}/posts`);
      setPosts(data);
    } catch (e) { console.error(e); }
    setView('posts');
  };

  const openPost = async (post: Post) => {
    setSelectedPost(post);
    try {
      const data = await apiFetch(`/community/posts/${post.id}/comments`);
      setComments(data);
    } catch (e) { console.error(e); }
    setView('comments');
  };

  const submitPost = async () => {
    if (!postTitle || !postContent) return Alert.alert('Missing', 'Please enter a title and content');
    try {
      await apiFetch(`/community/groups/${selectedGroup!.id}/posts`, { method: 'POST', body: JSON.stringify({ title: postTitle, content: postContent }) });
      setPostModal(false); setPostTitle(''); setPostContent('');
      openGroup(selectedGroup!);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    try {
      await apiFetch(`/community/posts/${selectedPost!.id}/comments`, { method: 'POST', body: JSON.stringify({ content: commentText }) });
      setCommentText('');
      openPost(selectedPost!);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  if (loading) {
    return (
      <DashboardLayout title="Mother Circle">
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </DashboardLayout>
    );
  }

  // ── Comments View ──────────────────────────────────────────────────────────
  if (view === 'comments' && selectedPost) {
    return (
      <DashboardLayout title={selectedPost.title}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.breadcrumb}>
            <TouchableOpacity onPress={() => { setView('groups'); }} style={styles.breadcrumbItem}>
              <Text style={styles.breadcrumbText}>Mother Circle</Text>
            </TouchableOpacity>
            <Text style={styles.breadcrumbSep}>›</Text>
            <TouchableOpacity onPress={() => { setView('posts'); setSelectedPost(null); }} style={styles.breadcrumbItem}>
              <Text style={styles.breadcrumbText}>{selectedGroup?.name}</Text>
            </TouchableOpacity>
            <Text style={styles.breadcrumbSep}>›</Text>
            <Text style={styles.breadcrumbActive} numberOfLines={1}>{selectedPost.title}</Text>
          </View>
          <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
            {/* Post */}
            <View style={styles.postDetailCard}>
              <Text style={styles.postDetailTitle}>{selectedPost.title}</Text>
              <Text style={styles.postDetailContent}>{selectedPost.content}</Text>
              <View style={styles.postDetailFooter}>
                <Text style={styles.postDetailDate}>{new Date(selectedPost.created_at).toLocaleDateString()}</Text>
                <View style={styles.postReactions}>
                  <TouchableOpacity style={styles.reactionBtn}><Text style={styles.reactionText}>❤️ Like</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.reactionBtn}><Text style={styles.reactionText}>🔖 Save</Text></TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={styles.commentsHeader}>💬 {comments.length} {comments.length === 1 ? 'Reply' : 'Replies'}</Text>

            {comments.length === 0 && (
              <EmptyState emoji="💬" title="No replies yet" subtitle="Be the first to reply with support or advice." />
            )}

            {comments.map((c) => (
              <View key={c.id} style={styles.commentCard}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>👤</Text>
                </View>
                <View style={styles.commentBody}>
                  <Text style={styles.commentContent}>{c.content}</Text>
                  <Text style={styles.commentDate}>{new Date(c.created_at).toLocaleDateString()}</Text>
                </View>
              </View>
            ))}
            <View style={{ height: 100 }} />
          </ScrollView>
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a supportive reply..."
              placeholderTextColor={Colors.textMuted}
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={submitComment}>
              <Text style={styles.sendBtnText}>→</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </DashboardLayout>
    );
  }

  // ── Posts View ─────────────────────────────────────────────────────────────
  if (view === 'posts' && selectedGroup) {
    const meta = CAT_META[selectedGroup.category] || DEFAULT_CAT;
    return (
      <DashboardLayout title={selectedGroup.name}>
        <View style={styles.container}>
          <View style={styles.groupHeader}>
            <View style={[styles.groupHeaderIcon, { backgroundColor: meta.bg }]}>
              <Text style={styles.groupHeaderEmoji}>{meta.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.groupHeaderName}>{selectedGroup.name}</Text>
              <Text style={styles.groupHeaderMeta}>{selectedGroup.member_count} members · {posts.length} posts</Text>
            </View>
            <TouchableOpacity
              style={styles.backGroupBtn}
              onPress={() => { setView('groups'); setSelectedGroup(null); }}
            >
              <Text style={styles.backGroupBtnText}>‹ Back</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.newPostPrompt} onPress={() => setPostModal(true)}>
              <Text style={styles.newPostPromptIcon}>✍️</Text>
              <Text style={styles.newPostPromptText}>Share your experience or ask a question...</Text>
            </TouchableOpacity>

            {posts.length === 0 && (
              <EmptyState emoji="🌸" title="No posts yet" subtitle={`Be the first to post in ${selectedGroup.name}!`} />
            )}

            {posts.map((p) => (
              <TouchableOpacity key={p.id} style={styles.postCard} onPress={() => openPost(p)} activeOpacity={0.8}>
                <View style={styles.postCardHeader}>
                  <View style={styles.postAvatar}><Text>👤</Text></View>
                  <Text style={styles.postDate}>{new Date(p.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.postTitle}>{p.title}</Text>
                <Text style={styles.postPreview} numberOfLines={3}>{p.content}</Text>
                <View style={styles.postFooter}>
                  <TouchableOpacity style={styles.reactionBtn}><Text style={styles.reactionText}>❤️ Like</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.reactionBtn}><Text style={styles.reactionText}>💬 Reply</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.reactionBtn}><Text style={styles.reactionText}>🔖 Save</Text></TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
            <View style={{ height: Spacing.xxl }} />
          </ScrollView>

          <Modal visible={postModal} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>✍️ New Post</Text>
                  <TouchableOpacity onPress={() => setPostModal(false)} style={styles.modalClose}>
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Title</Text>
                  <TextInput style={styles.input} placeholder="What's your post about?" placeholderTextColor={Colors.textMuted} value={postTitle} onChangeText={setPostTitle} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Content</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 130, textAlignVertical: 'top' }]}
                    placeholder="Share your thoughts, questions, or experience... Remember: be kind and supportive 💜"
                    placeholderTextColor={Colors.textMuted}
                    value={postContent}
                    onChangeText={setPostContent}
                    multiline
                  />
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={submitPost}>
                  <Text style={styles.saveBtnText}>Post to Group</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </DashboardLayout>
    );
  }

  // ── Groups View ───────────────────────────────────────────────────────────
  const filtered = search
    ? groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()) || g.description.toLowerCase().includes(search.toLowerCase()))
    : groups;

  return (
    <DashboardLayout title="Mother Circle">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.inner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchGroups(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>👩‍👩‍👧 Mother Circle</Text>
          <Text style={styles.pageSub}>Connect with mothers in your stage of pregnancy</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Trending Topics */}
        <GlassCard accent={Colors.primary}>
          <SectionHeader title="Trending Topics" icon="🔥" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingRow}>
            {TRENDING.map((t, i) => (
              <TouchableOpacity key={i} style={styles.trendingChip}>
                <Text style={styles.trendingChipText}># {t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </GlassCard>

        {/* Group Categories */}
        <SectionHeader title={`All Groups (${filtered.length})`} icon="👥" />

        {filtered.length === 0 && (
          <EmptyState emoji="🔍" title="No groups found" subtitle="Try a different search term." />
        )}

        {filtered.map((g) => {
          const meta = CAT_META[g.category] || DEFAULT_CAT;
          return (
            <TouchableOpacity key={g.id} style={styles.groupCard} onPress={() => openGroup(g)} activeOpacity={0.8}>
              <View style={[styles.groupIcon, { backgroundColor: meta.bg }]}>
                <Text style={styles.groupEmoji}>{meta.emoji}</Text>
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{g.name}</Text>
                <Text style={styles.groupDesc} numberOfLines={2}>{g.description}</Text>
                <View style={styles.groupMeta}>
                  <View style={[styles.catBadge, { backgroundColor: meta.bg, borderColor: meta.color + '40' }]}>
                    <Text style={[styles.catBadgeText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <Text style={styles.memberCount}>👥 {g.member_count?.toLocaleString() ?? 0} members</Text>
                </View>
              </View>
              <Text style={styles.groupArrow}>›</Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { padding: Spacing.md },
  center: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },

  pageHeader: { marginBottom: Spacing.md, marginTop: Spacing.sm },
  pageTitle: { ...Typography.h2, color: Colors.textPrimary, fontWeight: '800' as const },
  pageSub: { ...Typography.body, color: Colors.textMuted, marginTop: 4 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.md, ...Shadows.xs,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, ...Typography.body, color: Colors.textPrimary },

  trendingRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: 4 },
  trendingChip: {
    backgroundColor: Colors.lavenderBg, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.lavenderLight,
  },
  trendingChipText: { ...Typography.caption, color: Colors.lavender, fontWeight: '600' as const },

  groupCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
    gap: Spacing.md, ...Shadows.xs,
  },
  groupIcon: {
    width: 56, height: 56, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  groupEmoji: { fontSize: 26 },
  groupInfo: { flex: 1 },
  groupName: { ...Typography.bodyBold, color: Colors.textPrimary, fontSize: 15 },
  groupDesc: { ...Typography.caption, color: Colors.textMuted, marginTop: 3, lineHeight: 18 },
  groupMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 6 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  catBadgeText: { ...Typography.micro, fontWeight: '700' as const },
  memberCount: { ...Typography.caption, color: Colors.textMuted },
  groupArrow: { fontSize: 24, color: Colors.textMuted, fontWeight: '300' as const },

  // Group header
  groupHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  groupHeaderIcon: {
    width: 46, height: 46, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  groupHeaderEmoji: { fontSize: 22 },
  groupHeaderName: { ...Typography.h4, color: Colors.textPrimary, fontWeight: '700' as const },
  groupHeaderMeta: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  backGroupBtn: {
    backgroundColor: Colors.lavenderBg, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.lavenderLight,
  },
  backGroupBtnText: { ...Typography.caption, color: Colors.lavender, fontWeight: '600' as const },

  // New post prompt
  newPostPrompt: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.md, ...Shadows.xs,
  },
  newPostPromptIcon: { fontSize: 20 },
  newPostPromptText: { ...Typography.body, color: Colors.textMuted, flex: 1 },

  // Post card
  postCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.xs,
  },
  postCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  postAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.lavenderBg, justifyContent: 'center', alignItems: 'center',
  },
  postDate: { ...Typography.caption, color: Colors.textMuted, flex: 1 },
  postTitle: { ...Typography.bodyBold, color: Colors.textPrimary, fontSize: 15, marginBottom: 6 },
  postPreview: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.sm },
  postFooter: { flexDirection: 'row', gap: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reactionText: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600' as const },

  // Post detail
  postDetailCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.sm,
  },
  postDetailTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.sm },
  postDetailContent: { ...Typography.body, color: Colors.textSecondary, lineHeight: 24, marginBottom: Spacing.md },
  postDetailFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  postDetailDate: { ...Typography.caption, color: Colors.textMuted },
  postReactions: { flexDirection: 'row', gap: Spacing.md },

  breadcrumb: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' as const,
    backgroundColor: Colors.surface, padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 4,
  },
  breadcrumbItem: {},
  breadcrumbText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' as const },
  breadcrumbSep: { ...Typography.caption, color: Colors.textMuted },
  breadcrumbActive: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },

  commentsHeader: { ...Typography.h4, color: Colors.textPrimary, marginBottom: Spacing.sm },

  commentCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  commentAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.lavenderBg, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.lavenderLight,
  },
  commentAvatarText: { fontSize: 18 },
  commentBody: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadows.xs,
  },
  commentContent: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22 },
  commentDate: { ...Typography.micro, color: Colors.textMuted, marginTop: 6 },

  commentInputRow: {
    flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  commentInput: {
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
  sendBtnText: { fontSize: 18, color: '#fff', fontWeight: '700' as const },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26,10,46,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.backgroundAlt, borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl, padding: Spacing.lg, maxHeight: '88%' as any,
    borderTopWidth: 1, borderColor: Colors.border,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { ...Typography.h3, color: Colors.textPrimary },
  modalClose: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { color: Colors.textMuted, fontSize: 14, fontWeight: '700' as const },
  inputGroup: { marginBottom: Spacing.md },
  inputLabel: { ...Typography.label, color: Colors.textMuted, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
    padding: Spacing.md, color: Colors.textPrimary,
    ...Typography.body, borderWidth: 1, borderColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    padding: Spacing.md, alignItems: 'center',
    marginTop: Spacing.xs, marginBottom: Spacing.xl, ...Shadows.sm,
  },
  saveBtnText: { ...Typography.bodyBold, color: '#fff', fontSize: 15 },
});

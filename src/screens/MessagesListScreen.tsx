import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, FlatList, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, MessageSquare, User } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';
import { fetchMessagingProjects } from '../services/projectService';
import { fetchLatestMessage, countUnreadMessages } from '../services/messageService';


const LOCAL_IMAGES: Record<string, any> = {
  'dcreators/photographer': { uri: RemoteAssets.photographer },
  'dcreators/designer': { uri: RemoteAssets.designer },
  'dcreators/sculptor': { uri: RemoteAssets.sculptor },
  'dcreators/artisan': { uri: RemoteAssets.artisan },
};

export default function MessagesListScreen({ navigation }: any) {
  const profile = useAuthStore((s) => s.profile);
  const currentRole = useAuthStore((s) => s.currentRole);
  const consultantProfile = useAuthStore((s) => s.consultantProfile);

  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchChats(); }, [profile?.id, currentRole]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChats().finally(() => setRefreshing(false));
  }, [profile?.id, currentRole]);

  async function fetchChats() {
    if (!profile?.id) { setLoading(false); return; }
    try {
      // Fetch projects the user is involved in (either as client or consultant)
      const projects = await fetchMessagingProjects({
        role: currentRole === 'consultant' ? 'consultant' : 'client',
        clientId: profile.id,
        consultantUserId: consultantProfile?.user_id ?? profile.id,
      });
      if (projects.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      // For each project, get the latest message
      const chatList = await Promise.all(
        projects.map(async (proj: any) => {
          const latestMsg = await fetchLatestMessage(proj.id);
          const consultant = proj.consultant_profiles;
          const otherName = currentRole === 'consultant'
            ? 'Client' // We don't join client profile here for simplicity
            : (consultant?.display_name || 'Consultant');
          const otherCode = consultant?.code || '';
          const category = consultant?.category || 'designer';

          // Count unread (messages not from me)
          const count = await countUnreadMessages(proj.id, profile.id);

          return {
            id: proj.id,
            name: otherName,
            code: otherCode,
            category,
            avatarUrl: consultant?.avatar_url || null,
            lastMessage: latestMsg?.text || 'No messages yet',
            time: latestMsg ? formatTime(latestMsg.created_at) : '',
            unread: 0, // Real unread tracking would need a read_at field
            projectId: proj.id,
            project: proj,
          };
        })
      );

      setChats(chatList);
    } catch (err) {
      console.log('Fetch chats error:', err);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(dateStr: string) {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return d.toLocaleDateString('en-IN', { weekday: 'short' });
    }
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.chatRow} 
      onPress={() => navigation.navigate('Chat', { project: { id: item.projectId, assignment_type: item.project?.assignment_type }, otherName: item.name })}
    >
      {item.avatarUrl && item.avatarUrl.startsWith('http') ? (
        <Image
          source={{ uri: item.avatarUrl }}
          style={styles.avatar}
        />
      ) : LOCAL_IMAGES[`dcreators/${item.category}`] ? (
        <Image
          source={LOCAL_IMAGES[`dcreators/${item.category}`]}
          style={styles.avatar}
        />
      ) : (
        <View style={[styles.avatar, styles.fallbackAvatar]}>
          <User size={24} color={colors.textTertiary} />
        </View>
      )}

      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatName, item.unread > 0 && styles.textBold]}>{item.name}</Text>
          <Text style={[styles.chatTime, item.unread > 0 && styles.textBold]}>{item.time}</Text>
        </View>
        
        <View style={styles.chatFooter}>
          <Text 
            style={[styles.lastMessage, item.unread > 0 && styles.textBold]} 
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.cardBg }]} edges={['top']}>
      <View style={styles.backgroundImage}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={{ width: 28 }} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : chats.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageSquare size={56} color={colors.borderInput} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>Messages from your projects will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          />
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, backgroundColor: colors.screenBg },
  safeArea: { flex: 1 },
  
  header: {
    backgroundColor: colors.cardBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderCard,
  },
  headerTitle: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, gap: spacing.sm },
  emptyTitle: { fontSize: fontSizes.xl, fontFamily: fonts.heavy, color: colors.textSecondary },
  emptySubtitle: { fontSize: fontSizes.base - 1, fontFamily: fonts.body, color: colors.textTertiary, textAlign: 'center', paddingHorizontal: 40 },

  listContainer: { paddingVertical: spacing.sm },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 80, marginRight: spacing.lg },

  chatRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  fallbackAvatar: { backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  
  chatInfo: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  chatName: { fontSize: fontSizes.md, fontWeight: '600', color: colors.textPrimary, fontFamily: fonts.medium },
  chatTime: { fontSize: fontSizes.sm, color: colors.textTertiary, fontFamily: fonts.medium },
  
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { flex: 1, fontSize: fontSizes.sm + 1, color: colors.textSecondary, fontFamily: fonts.body, paddingRight: spacing.lg },
  textBold: { fontWeight: '700', color: colors.textPrimary },
  
  unreadBadge: {
    backgroundColor: colors.primary,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadText: { color: colors.textOnPrimary, fontSize: fontSizes.xs, fontWeight: 'bold' },
});

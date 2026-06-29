import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CheckCircle, FileText, ChevronLeft, Trash2, CreditCard, AlertCircle, Inbox } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';


const ICON_MAP: Record<string, { icon: any; color: string }> = {
  assignment: { icon: FileText, color: colors.primary },
  payment: { icon: CreditCard, color: colors.success },
  review: { icon: AlertCircle, color: '#8B5CF6' },
  system: { icon: Bell, color: colors.info },
};

export default function NotificationsScreen({ navigation }: any) {
  const profile = useAuthStore((s) => s.profile);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchNotifications(); }, []);

  async function fetchNotifications() {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (!error && data) setNotifications(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, []);

  async function markAllRead() {
    if (!profile?.id || notifications.length === 0) return;
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  }

  async function markRead(id: string) {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  }

  async function clearAll() {
    if (!profile?.id) return;
    try {
      await supabase.from('notifications').delete().eq('user_id', profile.id);
      setNotifications([]);
    } catch {}
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.cardBg }]} edges={['top']}>
      <View style={styles.bg}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.unreadLabel}>{unreadCount} unread</Text>
            )}
          </View>
          <TouchableOpacity onPress={clearAll}>
            <Trash2 size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Mark all read */}
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <CheckCircle size={14} color={colors.primary} />
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Inbox size={56} color={colors.borderInput} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>You're all caught up!</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={styles.listContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
            {notifications.map((notif) => {
              const cfg = ICON_MAP[notif.type] || ICON_MAP.system;
              const Icon = cfg.icon;
              return (
                <TouchableOpacity
                  key={notif.id}
                  style={[styles.notifCard, !notif.is_read && styles.notifCardUnread]}
                  onPress={() => markRead(notif.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${cfg.color}18` }]}>
                    <Icon size={22} color={cfg.color} />
                  </View>
                  <View style={styles.textContainer}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.title, !notif.is_read && styles.titleUnread]} numberOfLines={1}>
                        {notif.title}
                      </Text>
                      {!notif.is_read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.desc} numberOfLines={2}>{notif.message}</Text>
                    <Text style={styles.time}>{timeAgo(notif.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.screenBg },
  safeArea: { flex: 1 },
  header: {
    backgroundColor: colors.cardBg, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderCard,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSizes.lg + 1, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },
  unreadLabel: { fontSize: fontSizes.xs, color: colors.primary, fontFamily: fonts.medium, marginTop: 1 },

  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  markAllText: { fontSize: fontSizes.sm, color: colors.primary, fontFamily: fonts.medium, fontWeight: '600' },

  emptyState: { alignItems: 'center', marginTop: 80, gap: spacing.sm },
  emptyTitle: { fontSize: fontSizes.xl, fontFamily: fonts.heavy, color: colors.textSecondary },
  emptySubtitle: { fontSize: fontSizes.base - 1, fontFamily: fonts.body, color: colors.textTertiary },

  mainScroll: { flex: 1 },
  listContainer: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },

  notifCard: {
    flexDirection: 'row', backgroundColor: colors.cardBg, padding: spacing.md + 2,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight,
    ...shadows.sm,
  },
  notifCardUnread: {
    backgroundColor: '#EEF2FF', borderColor: colors.primary, borderLeftWidth: 3,
  },
  iconContainer: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  textContainer: { flex: 1 },
  titleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3,
  },
  title: { fontSize: fontSizes.base - 1, color: colors.textSecondary, fontFamily: fonts.medium, flex: 1 },
  titleUnread: { fontWeight: '700', color: colors.textPrimary },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: spacing.sm,
  },
  desc: { fontSize: fontSizes.sm, color: colors.textSecondary, fontFamily: fonts.body, marginBottom: 6, lineHeight: 17 },
  time: { fontSize: fontSizes.xs, color: colors.textTertiary, fontFamily: fonts.medium },
});

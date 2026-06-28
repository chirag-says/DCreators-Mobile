import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ImageBackground, TouchableOpacity, Platform, ActivityIndicator, RefreshControl, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Star, Bookmark, Trash2, User, Heart } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';


const LOCAL_IMAGES: Record<string, any> = {
  'dcreators/photographer': { uri: RemoteAssets.photographer },
  'dcreators/designer': { uri: RemoteAssets.designer },
  'dcreators/sculptor': { uri: RemoteAssets.sculptor },
  'dcreators/artisan': { uri: RemoteAssets.artisan },
};

const STORAGE_KEY = '@dcreators_saved_creators';

export default function SavedCreatorsScreen({ navigation }: any) {
  const [savedCreators, setSavedCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadSaved(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSaved().finally(() => setRefreshing(false));
  }, []);

  async function loadSaved() {
    setLoading(true);
    try {
      // Get saved IDs from local storage
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const savedIds: string[] = raw ? JSON.parse(raw) : [];

      if (savedIds.length === 0) {
        setSavedCreators([]);
        setLoading(false);
        return;
      }

      // Fetch profiles from Supabase
      const { data, error } = await supabase
        .from('consultant_profiles')
        .select('*')
        .in('id', savedIds)
        .eq('is_active', true);

      if (!error && data) {
        setSavedCreators(data);
      } else {
        setSavedCreators([]);
      }
    } catch {
      setSavedCreators([]);
    } finally {
      setLoading(false);
    }
  }

  async function removeSaved(consultantId: string) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const savedIds: string[] = raw ? JSON.parse(raw) : [];
      const updated = savedIds.filter((id) => id !== consultantId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSavedCreators((prev) => prev.filter((c) => c.id !== consultantId));
    } catch {}
  }

  function handleRemove(creator: any) {
    Alert.alert(
      'Remove',
      `Remove ${creator.display_name} from saved?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeSaved(creator.id) },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.cardBg }]} edges={['top']}>
      <ImageBackground 
        source={{ uri: RemoteAssets.bgTexture }} 
        style={styles.backgroundImage}
        imageStyle={{ opacity: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Creators</Text>
          <View style={{ width: 28 }} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : savedCreators.length === 0 ? (
          <View style={styles.emptyState}>
            <Heart size={56} color={colors.borderInput} />
            <Text style={styles.emptyTitle}>No saved creators</Text>
            <Text style={styles.emptySubtitle}>Bookmark creators from their profile to save them here</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
            <View style={styles.container}>
              {savedCreators.map((creator) => {
                const hasRealAvatar = creator.avatar_url && creator.avatar_url.startsWith('http');
                const avatarSource = hasRealAvatar
                  ? { uri: creator.avatar_url }
                  : LOCAL_IMAGES[`dcreators/${creator.category}`];

                return (
                <TouchableOpacity 
                  key={creator.id} 
                  style={styles.creatorCard}
                  onPress={() => navigation.navigate('CreatorProfile', {
                    creator: {
                      id: creator.id,
                      name: creator.display_name,
                      code: creator.code,
                      subtitle: creator.subtitle,
                      experience: creator.experience,
                      expertise: creator.expertise,
                      category: creator.category,
                      base_price: creator.base_price,
                      avatar_url: creator.avatar_url,
                      portfolio_images: creator.portfolio_images,
                    }
                  })}
                >
                  {avatarSource ? (
                    <Image
                      source={avatarSource}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={[styles.avatarImage, { backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }]}>
                      <User size={28} color={colors.textTertiary} />
                    </View>
                  )}
                  
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.creatorName}>{creator.display_name}</Text>
                      <Bookmark size={20} color={colors.primary} fill={colors.primary} />
                    </View>
                    
                    <Text style={styles.creatorCode}>{creator.code} · {creator.category?.charAt(0).toUpperCase()}{creator.category?.slice(1)}</Text>
                    
                    <View style={styles.statsRow}>
                      {creator.experience && (
                        <Text style={styles.projectsText}>{creator.experience}</Text>
                      )}
                      {creator.base_price && (
                        <Text style={styles.projectsText}>From ₹{Number(creator.base_price).toLocaleString()}</Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(creator)}>
                    <Trash2 size={16} color={colors.error} />
                  </TouchableOpacity>
                </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, backgroundColor: colors.screenBg },
  safeArea: { flex: 1 },
  mainScroll: { flex: 1 },
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },
  
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
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80, gap: spacing.sm },
  emptyTitle: { fontSize: fontSizes.xl, fontFamily: fonts.heavy, color: colors.textSecondary },
  emptySubtitle: { fontSize: fontSizes.base - 1, fontFamily: fonts.body, color: colors.textTertiary, textAlign: 'center', paddingHorizontal: 40 },

  creatorCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    ...shadows.card,
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    marginLeft: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  creatorName: { fontSize: fontSizes.md, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },
  creatorCode: { fontSize: fontSizes.sm, color: colors.textSecondary, fontFamily: fonts.medium, marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  projectsText: { fontSize: fontSizes.sm, color: colors.textTertiary, fontFamily: fonts.medium },
  
  removeBtn: {
    width: 32, height: 32, borderRadius: radii.xl,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: spacing.sm,
  },
});

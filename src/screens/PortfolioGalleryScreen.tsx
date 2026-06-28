import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Share2, Heart, Download } from 'lucide-react-native';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';


const { width, height } = Dimensions.get('window');

export default function PortfolioGalleryScreen({ navigation, route }: any) {
  // In a real app, the image source would be passed via route.params
  // const { imageSource, title } = route.params;
  
  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Overlay Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <X size={28} color={colors.textOnPrimary} />
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Share2 size={24} color={colors.textOnPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Heart size={24} color={colors.textOnPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Image View */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        maximumZoomScale={3}
        minimumZoomScale={1}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <Image 
          source={{ uri: RemoteAssets.photoArchive1 }} 
          style={styles.fullImage}
          resizeMode="contain"
        />
      </ScrollView>

      {/* Info Footer */}
      <View style={styles.footer}>
        <View style={styles.footerTextCol}>
          <Text style={styles.imageTitle}>Abstract Composition #4</Text>
          <Text style={styles.imageSubtitle}>By Shoumik Sen / D101</Text>
        </View>
        <TouchableOpacity style={styles.downloadBtn}>
          <Download size={24} color={colors.textOnPrimary} />
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000', // True black for gallery view
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    zIndex: 10,
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii['2xl'],
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width,
    height: height * 0.7,
  },

  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,20,0.85)',
    padding: spacing.lg,
    borderRadius: radii.lg,
  },
  footerTextCol: {
    flex: 1,
  },
  imageTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textOnPrimary,
    fontFamily: fonts.heavy,
    marginBottom: spacing.xs,
  },
  imageSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textTertiary,
    fontFamily: fonts.medium,
  },
  downloadBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.lg,
  },
});

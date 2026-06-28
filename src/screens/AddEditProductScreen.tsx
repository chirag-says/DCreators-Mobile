import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Camera, X, Check, Package } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';

const PRODUCT_CATEGORIES = [
  'Templates', 'Digital Prints', 'UI Kits', 'Branding',
  'Photography', 'Illustration', 'Typography', 'Other',
];

const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';

export default function AddEditProductScreen({ navigation, route }: any) {
  const consultantProfile = useAuthStore((s) => s.consultantProfile);
  const existingProduct = route.params?.product;
  const isEditing = !!existingProduct;

  const [title, setTitle] = useState(existingProduct?.title || '');
  const [description, setDescription] = useState(existingProduct?.description || '');
  const [price, setPrice] = useState(existingProduct?.price ? String(existingProduct.price) : '');
  const [category, setCategory] = useState(existingProduct?.category || '');
  const [images, setImages] = useState<string[]>(existingProduct?.images || []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function pickImage() {
    if (images.length >= 5) {
      Alert.alert('Limit reached', 'You can upload up to 5 images per product.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadToCloudinary(result.assets[0].uri);
    }
  }

  async function uploadToCloudinary(localUri: string) {
    if (!cloudName) {
      // Fallback: store local URI directly (for development)
      setImages((prev) => [...prev, localUri]);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      const filename = localUri.split('/').pop() || 'product.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', { uri: localUri, name: filename, type } as any);
      formData.append('upload_preset', 'dcreators_unsigned'); // You need to create this preset in Cloudinary
      formData.append('folder', 'dcreators/products');

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.secure_url) {
        setImages((prev) => [...prev, data.secure_url]);
      } else {
        // If Cloudinary upload fails, store local URI as fallback
        setImages((prev) => [...prev, localUri]);
      }
    } catch {
      // Fallback to local URI
      setImages((prev) => [...prev, localUri]);
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a product title.'); return false; }
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert('Required', 'Please enter a valid price.'); return false;
    }
    if (!category) { Alert.alert('Required', 'Please select a category.'); return false; }
    if (images.length === 0) { Alert.alert('Required', 'Please add at least one product image.'); return false; }
    return true;
  }

  async function handleSave() {
    if (!validate()) return;
    if (!consultantProfile?.id) {
      Alert.alert('Error', 'Consultant profile not found.');
      return;
    }

    setSaving(true);
    try {
      const productData = {
        title: title.trim(),
        description: description.trim() || null,
        price: Number(price),
        category,
        images,
        consultant_id: consultantProfile.id,
        is_active: true,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('shop_products')
          .update(productData)
          .eq('id', existingProduct.id);

        if (error) { Alert.alert('Error', error.message); return; }
        Alert.alert('Updated', 'Product updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        const { error } = await supabase
          .from('shop_products')
          .insert(productData);

        if (error) { Alert.alert('Error', error.message); return; }
        Alert.alert('Published', 'Your product is now live in the shop!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Product' : 'Add Product'}</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Check size={18} color="#FFF" />
              <Text style={styles.saveBtnText}>{isEditing ? 'Update' : 'Publish'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>

          {/* ── Images Section ── */}
          <Text style={styles.sectionTitle}>Product Images</Text>
          <Text style={styles.sectionHint}>Add up to 5 images. First image will be the cover.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow} contentContainerStyle={{ gap: 12 }}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.thumbImg} />
                <TouchableOpacity style={styles.removeImgBtn} onPress={() => removeImage(index)}>
                  <X size={14} color="#FFF" />
                </TouchableOpacity>
                {index === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Camera size={24} color={colors.primary} />
                    <Text style={styles.addImageText}>Add</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* ── Title ── */}
          <Text style={styles.label}>Product Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Minimalist Brand Kit"
            placeholderTextColor={colors.textTertiary}
            maxLength={100}
          />

          {/* ── Description ── */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your product, what's included, and any details buyers should know..."
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>

          {/* ── Price ── */}
          <Text style={styles.label}>Price (₹) *</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="e.g. 1499"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
          />

          {/* ── Category ── */}
          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryGrid}>
            {PRODUCT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Preview Card */}
          {title && price && images.length > 0 && (
            <View style={styles.previewSection}>
              <Text style={styles.sectionTitle}>Preview</Text>
              <View style={styles.previewCard}>
                <Image source={{ uri: images[0] }} style={styles.previewImage} />
                <View style={styles.previewInfo}>
                  <Text style={styles.previewCategory}>{category || 'Category'}</Text>
                  <Text style={styles.previewTitle} numberOfLines={2}>{title}</Text>
                  <Text style={styles.previewPrice}>₹{Number(price || 0).toLocaleString()}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cardBg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderCard,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSizes.lg + 1, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radii.md,
  },
  saveBtnText: { color: '#FFF', fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy },

  form: { padding: spacing.xl, paddingBottom: 60 },

  sectionTitle: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy, marginBottom: 4 },
  sectionHint: { fontSize: fontSizes.xs + 1, color: colors.textTertiary, fontFamily: fonts.body, marginBottom: spacing.md },

  // Images
  imageRow: { marginBottom: spacing.xl },
  imageThumb: { width: 90, height: 90, borderRadius: radii.md, position: 'relative', overflow: 'hidden' },
  thumbImg: { width: 90, height: 90, borderRadius: radii.md },
  removeImgBtn: {
    position: 'absolute', top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.primary, paddingVertical: 2, alignItems: 'center',
  },
  coverBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  addImageBtn: {
    width: 90, height: 90, borderRadius: radii.md,
    borderWidth: 2, borderColor: colors.borderInput, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  addImageText: { fontSize: fontSizes.xs, color: colors.primary, fontWeight: '600', fontFamily: fonts.medium },

  // Form fields
  label: {
    fontSize: fontSizes.sm, fontWeight: '700', color: colors.textPrimary,
    fontFamily: fonts.heavy, marginBottom: spacing.sm, marginTop: spacing.md,
  },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.borderInput,
    borderRadius: radii.md, paddingHorizontal: spacing.lg, paddingVertical: 14,
    fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top', paddingTop: 14 },
  charCount: {
    textAlign: 'right', fontSize: fontSizes.xs, color: colors.textTertiary,
    fontFamily: fonts.medium, marginTop: 4,
  },

  // Categories
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radii.full, borderWidth: 1.5,
    borderColor: colors.borderInput, backgroundColor: '#F9FAFB',
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChipText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.textSecondary, fontFamily: fonts.medium },
  categoryChipTextActive: { color: '#FFF' },

  // Preview
  previewSection: { marginTop: spacing['2xl'] },
  previewCard: {
    flexDirection: 'row', backgroundColor: colors.cardBg,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight,
    overflow: 'hidden', ...shadows.sm,
  },
  previewImage: { width: 100, height: 100 },
  previewInfo: { flex: 1, padding: spacing.md, justifyContent: 'center', gap: 4 },
  previewCategory: { fontSize: fontSizes.xs, color: colors.textTertiary, textTransform: 'uppercase', fontWeight: '600' },
  previewTitle: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },
  previewPrice: { fontSize: fontSizes.base, fontWeight: '800', color: colors.success, fontFamily: fonts.heavy },
});

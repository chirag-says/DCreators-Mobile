/**
 * ImageCropModal
 * The same artwork photo shows up across the app at different aspect ratios:
 *   - Square  (~1:1)   — CreatorProfileScreen carousel, the Shop, and this
 *                        screen's own "Current Portfolio" grid
 *   - Card    (~0.85)  — FeaturedCreatorCard, the horizontal "Creators in
 *                        Demand" / category-hub cards on the client dashboard
 *   - Banner  (~1.6)   — the big featured banner on ExploreConsultantsScreen
 *
 * Rather than pick one crop and let "cover" mangle the other two, this walks
 * the consultant through all three shapes on the *same* source photo so they
 * control the framing everywhere it appears. "Skip Remaining" auto-centers
 * whichever shapes they don't want to fuss over.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Image,
  PanResponder, Dimensions, ActivityIndicator,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { Minus, Plus, Check, X, ChevronLeft } from 'lucide-react-native';
import { colors, fonts, fontSizes } from '../styles/theme';

const NAVY = '#1B3A5C';
const TEAL = '#3D9B8F';

export type CropVariants = { square: string; card: string; banner: string };

interface Shape { key: keyof CropVariants; label: string; ratio: number; usedIn: string }
const SHAPES: Shape[] = [
  { key: 'square', label: 'Square', ratio: 1, usedIn: 'Your profile page, the shop, and your portfolio grid' },
  { key: 'card', label: 'Featured Card', ratio: 220 / 260, usedIn: 'The "Creators in Demand" cards clients browse' },
  { key: 'banner', label: 'Explore Banner', ratio: 1.6, usedIn: 'The big banner on the Explore Consultants page' },
];

const { width: SCREEN_W } = Dimensions.get('window');
const FRAME_W = Math.min(280, SCREEN_W - 80);

interface Props {
  visible: boolean;
  imageUri: string | null;
  onCancel: () => void;
  onConfirm: (crops: CropVariants) => void;
}

export default function ImageCropModal({ visible, imageUri, onCancel, onConfirm }: Props) {
  const [step, setStep] = useState(0);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [, bump] = useState(0);
  const pan = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const crops = useRef<Partial<CropVariants>>({});

  const shape = SHAPES[step];
  const frameH = FRAME_W / shape.ratio;
  const baseScale = imgSize ? Math.max(FRAME_W / imgSize.w, frameH / imgSize.h) : 1;
  const scale = baseScale * zoom;
  const dispW = imgSize ? imgSize.w * scale : FRAME_W;
  const dispH = imgSize ? imgSize.h * scale : frameH;

  // PanResponder's handlers are created once below and must never read these
  // values directly from render scope (that closure would go stale the
  // moment imgSize/zoom/step change). Keep a ref it reads fresh values from
  // on every touch event instead.
  const dimsRef = useRef({ frameH, dispW, dispH });
  dimsRef.current = { frameH, dispW, dispH };

  useEffect(() => {
    if (!visible) return;
    setStep(0);
    setZoom(1);
    setImgSize(null);
    crops.current = {};
    if (imageUri) {
      Image.getSize(imageUri, (w, h) => setImgSize({ w, h }), () => setImgSize(null));
    }
  }, [visible, imageUri]);

  // Reset zoom + re-center whenever the shape (step) or image changes so it
  // always fully covers the frame with no empty edges.
  useEffect(() => {
    if (!imgSize) return;
    setZoom(1);
    pan.current = { x: (FRAME_W - dispW) / 2, y: (dimsRef.current.frameH - dispH) / 2 };
    bump(n => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSize, step]);

  // Re-center after a manual zoom change too (zoom buttons reset framing).
  useEffect(() => {
    if (!imgSize) return;
    pan.current = { x: (FRAME_W - dispW) / 2, y: (dimsRef.current.frameH - dispH) / 2 };
    bump(n => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  function clamp(pos: { x: number; y: number }) {
    const { frameH: fh, dispW: dw, dispH: dh } = dimsRef.current;
    const minX = FRAME_W - dw;
    const minY = fh - dh;
    return { x: Math.min(0, Math.max(minX, pos.x)), y: Math.min(0, Math.max(minY, pos.y)) };
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { dragStart.current = { ...pan.current }; },
      onPanResponderMove: (_, gesture) => {
        pan.current = clamp({ x: dragStart.current.x + gesture.dx, y: dragStart.current.y + gesture.dy });
        bump(n => n + 1);
      },
    })
  ).current;

  /** Crop the source photo for a given shape using whatever framing (pan/zoom) is passed in. */
  async function cropFor(targetShape: Shape, panPos: { x: number; y: number }, sc: number): Promise<string> {
    if (!imageUri || !imgSize) return imageUri ?? '';
    const fH = FRAME_W / targetShape.ratio;
    const cropX = Math.max(0, -panPos.x / sc);
    const cropY = Math.max(0, -panPos.y / sc);
    const cropW = Math.min(imgSize.w - cropX, FRAME_W / sc);
    const cropH = Math.min(imgSize.h - cropY, fH / sc);
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  }

  /** Default centered/covered crop for a shape, with no manual repositioning. */
  async function centeredCropFor(targetShape: Shape): Promise<string> {
    if (!imgSize) return imageUri ?? '';
    const fH = FRAME_W / targetShape.ratio;
    const bScale = Math.max(FRAME_W / imgSize.w, fH / imgSize.h);
    const dW = imgSize.w * bScale;
    const dH = imgSize.h * bScale;
    const centeredPan = { x: (FRAME_W - dW) / 2, y: (fH - dH) / 2 };
    return cropFor(targetShape, centeredPan, bScale);
  }

  async function handleNext() {
    if (!imageUri || !imgSize) return;
    setProcessing(true);
    try {
      const uri = await cropFor(shape, pan.current, scale);
      crops.current[shape.key] = uri;
      if (step < SHAPES.length - 1) {
        setStep(step + 1);
      } else {
        finish();
      }
    } catch {
      crops.current[shape.key] = imageUri;
      if (step < SHAPES.length - 1) setStep(step + 1); else finish();
    } finally {
      setProcessing(false);
    }
  }

  async function handleSkipRemaining() {
    if (!imageUri || !imgSize) return;
    setProcessing(true);
    try {
      // Keep whatever framing they already nailed for the current shape,
      // then auto-center the rest.
      crops.current[shape.key] = await cropFor(shape, pan.current, scale);
      for (let i = step + 1; i < SHAPES.length; i++) {
        crops.current[SHAPES[i].key] = await centeredCropFor(SHAPES[i]);
      }
      finish();
    } catch {
      finish();
    } finally {
      setProcessing(false);
    }
  }

  function finish() {
    const fallback = imageUri ?? '';
    onConfirm({
      square: crops.current.square ?? fallback,
      card: crops.current.card ?? fallback,
      banner: crops.current.banner ?? fallback,
    });
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={st.overlay}>
        <View style={st.card}>
          <View style={st.stepRow}>
            {SHAPES.map((sh, i) => (
              <View key={sh.key} style={[st.stepDot, i === step && st.stepDotActive, i < step && st.stepDotDone]} />
            ))}
          </View>

          <Text style={st.title}>{shape.label} Crop ({step + 1}/{SHAPES.length})</Text>
          <Text style={st.sub}>{shape.usedIn}</Text>

          <View style={[st.frame, { width: FRAME_W, height: frameH }]}>
            {imageUri && imgSize ? (
              <View {...panResponder.panHandlers} style={{ width: FRAME_W, height: frameH, overflow: 'hidden' }}>
                <Image
                  source={{ uri: imageUri }}
                  style={{ position: 'absolute', left: pan.current.x, top: pan.current.y, width: dispW, height: dispH }}
                />
              </View>
            ) : (
              <ActivityIndicator color={TEAL} />
            )}
          </View>

          <View style={st.zoomRow}>
            <TouchableOpacity style={st.zoomBtn} onPress={() => setZoom(z => Math.max(1, +(z - 0.25).toFixed(2)))} activeOpacity={0.85}>
              <Minus size={16} color={NAVY} />
            </TouchableOpacity>
            <Text style={st.zoomLabel}>Zoom</Text>
            <TouchableOpacity style={st.zoomBtn} onPress={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))} activeOpacity={0.85}>
              <Plus size={16} color={NAVY} />
            </TouchableOpacity>
          </View>

          <View style={st.btnRow}>
            {step > 0 ? (
              <TouchableOpacity style={st.backBtn} onPress={handleBack} activeOpacity={0.85}>
                <ChevronLeft size={16} color={NAVY} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={st.backBtn} onPress={onCancel} activeOpacity={0.85}>
                <X size={16} color={NAVY} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={st.skipBtn} onPress={handleSkipRemaining} disabled={processing} activeOpacity={0.85}>
              <Text style={st.skipText}>Skip Remaining</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.confirmBtn, processing && { opacity: 0.6 }]} onPress={handleNext} disabled={processing} activeOpacity={0.85}>
              {processing ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Check size={16} color="#fff" />
                  <Text style={st.confirmText}>{step < SHAPES.length - 1 ? 'Next' : 'Done'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, width: '100%', alignItems: 'center' },
  stepRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  stepDotActive: { backgroundColor: TEAL, width: 20 },
  stepDotDone: { backgroundColor: '#9CA3AF' },
  title: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY, marginBottom: 2, textAlign: 'center' },
  sub: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center', marginBottom: 14, paddingHorizontal: 8 },
  frame: { borderRadius: 10, overflow: 'hidden', backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14, marginBottom: 18 },
  zoomBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  zoomLabel: { fontSize: fontSizes.sm, fontFamily: fonts.medium, color: colors.textSecondary },
  btnRow: { flexDirection: 'row', gap: 8, width: '100%', alignItems: 'center' },
  backBtn: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: NAVY },
  skipBtn: { flex: 1, borderRadius: 999, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E5E7EB' },
  skipText: { color: colors.textSecondary, fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy },
  confirmBtn: { flex: 1.4, flexDirection: 'row', gap: 6, borderRadius: 999, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: TEAL },
  confirmText: { color: '#fff', fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy },
});

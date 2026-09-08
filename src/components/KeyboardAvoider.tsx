/**
 * KeyboardAvoider — one wrapper so every form lifts its fields above the
 * on-screen keyboard the same way.
 *
 * Many screens had no keyboard handling at all, so tapping a field in the lower
 * half of a form left it hidden behind the keyboard with no way to see what was
 * being typed. This mirrors the behaviour the auth and booking screens already
 * use (`padding` on iOS, `height` on Android) in a single place.
 *
 * Wrap the scrollable region *and* any pinned bottom bar so both rise together;
 * keep fixed headers outside it when a header should stay put.
 */
import React from 'react';
import {
  KeyboardAvoidingView, Platform, StyleSheet,
  type StyleProp, type ViewStyle,
} from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Height of anything above the avoider (e.g. a fixed header) so iOS padding lines up. */
  offset?: number;
}

export default function KeyboardAvoider({ children, style, offset = 0 }: Props) {
  return (
    <KeyboardAvoidingView
      style={[styles.fill, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={offset}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });

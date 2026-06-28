import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { CheckCircle, ShoppingCart } from 'lucide-react-native';

import { useNavigation } from '@react-navigation/native';

const IOS_BOTTOM_PADDING = Platform.OS === 'ios' ? 28 : 0;
const BOTTOM_NAV_HEIGHT = 60 + IOS_BOTTOM_PADDING;

export default function ActionBanner() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      
      {/* Left Action: Assign Project */}
      <TouchableOpacity 
        style={styles.leftAction}
        onPress={() => navigation.navigate('AssignProject')}
      >
        <CheckCircle size={28} color="#EF4444" strokeWidth={2.5} />
        <View style={styles.textStack}>
          <Text style={styles.mainText}>Assign Project /</Text>
          <Text style={styles.subText}>Hire Creative Consultant</Text>
        </View>
      </TouchableOpacity>

      {/* Right Action: Shop */}
      <TouchableOpacity style={styles.rightAction}>
        <ShoppingCart size={24} color="#312E81" />
        <Text style={styles.shopText}>Shop</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#EAEAEA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#D1D5DB',
    zIndex: 40,
  },
  leftAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textStack: {
    flexDirection: 'column',
  },
  mainText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  subText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: -2,
  },
  rightAction: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  shopText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  }
});

import React from 'react';
import { View, Text, ScrollView, StyleSheet, ImageBackground, TouchableOpacity, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopHeader from '../components/TopHeader';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';


export default function ClientOnboardingScreen({ navigation }: any) {
  return (
    <ImageBackground 
      source={{ uri: RemoteAssets.bgTexture }} 
      style={styles.backgroundImage}
      imageStyle={{ opacity: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <TopHeader />
        
        <ScrollView style={styles.mainScroll} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            
            <View style={styles.titleContainer}>
              <Text style={styles.mainTitle}>I am a Client</Text>
              <Text style={styles.subTitle}>Please fill in your details to complete profile setup.</Text>
            </View>

            <View style={styles.formContainer}>
              
              <View style={[styles.inputContainer, { borderColor: '#E03A5F' }]}>
                <Text style={[styles.inputLabel, { color: '#E03A5F' }]}>Company / Brand Name</Text>
                <View style={[styles.verticalSeparator, { backgroundColor: '#E03A5F' }]} />
                <TextInput style={styles.textInput} placeholder="e.g. Acme Corp" />
              </View>

              <View style={[styles.inputContainer, { borderColor: '#00AEEF' }]}>
                <Text style={[styles.inputLabel, { color: '#00AEEF' }]}>Industry / Sector</Text>
                <View style={[styles.verticalSeparator, { backgroundColor: '#00AEEF' }]} />
                <TextInput style={styles.textInput} placeholder="e.g. Technology" />
              </View>

              <View style={[styles.inputContainer, { borderColor: '#39B54A' }]}>
                <Text style={[styles.inputLabel, { color: '#39B54A' }]}>Contact Person Name</Text>
                <View style={[styles.verticalSeparator, { backgroundColor: '#39B54A' }]} />
                <TextInput style={styles.textInput} placeholder="John Doe" />
              </View>

              <View style={[styles.inputContainer, { borderColor: '#F26522' }]}>
                <Text style={[styles.inputLabel, { color: '#F26522' }]}>Email ID</Text>
                <View style={[styles.verticalSeparator, { backgroundColor: '#F26522' }]} />
                <TextInput style={styles.textInput} placeholder="john@example.com" keyboardType="email-address" />
              </View>

              <View style={[styles.inputContainer, { borderColor: '#8B5CF6' }]}>
                <Text style={[styles.inputLabel, { color: '#8B5CF6' }]}>Phone Number</Text>
                <View style={[styles.verticalSeparator, { backgroundColor: '#8B5CF6' }]} />
                <TextInput style={styles.textInput} placeholder="+91 9876543210" keyboardType="phone-pad" />
              </View>

              <View style={[styles.inputContainer, { borderColor: '#000000', height: 80, alignItems: 'flex-start' }]}>
                <Text style={[styles.inputLabel, { color: '#000000', marginTop: 12 }]}>Office Address</Text>
                <View style={[styles.verticalSeparator, { backgroundColor: '#000000' }]} />
                <TextInput 
                  style={[styles.textInput, { paddingTop: 12 }]} 
                  placeholder="Enter full address" 
                  multiline 
                  textAlignVertical="top" 
                />
              </View>

            </View>

          </View>
        </ScrollView>

        {/* Custom Black Action Bar for Onboarding */}
        <View style={styles.actionsBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.actionBtnText}>Previous</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Save</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Dashboard')}>
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Submit</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, backgroundColor: colors.screenBg },
  safeArea: { flex: 1 },
  mainScroll: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  titleContainer: { alignItems: 'center', marginBottom: spacing['2xl'] },
  mainTitle: { fontSize: 22, fontWeight: '700', color: colors.primary, fontFamily: fonts.heavy, marginBottom: spacing.xs },
  subTitle: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', fontFamily: fonts.body },
  formContainer: { gap: spacing.lg, paddingHorizontal: 10 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, backgroundColor: colors.cardBg, height: 44 },
  inputLabel: { width: 130, paddingLeft: spacing.sm, fontSize: fontSizes.xs + 1, fontWeight: '700', fontFamily: fonts.heavy },
  verticalSeparator: { width: 1.5, height: '100%' },
  textInput: { flex: 1, height: '100%', paddingHorizontal: 10, fontSize: fontSizes.sm, color: colors.textPrimary, fontFamily: fonts.body },
  actionsBar: { position: 'absolute', bottom: 0, width: '100%', flexDirection: 'row', backgroundColor: '#000', height: 60, alignItems: 'center', justifyContent: 'space-evenly', paddingBottom: Platform.OS === 'ios' ? 15 : 0 },
  actionBtn: { flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { color: colors.textOnPrimary, fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy },
  divider: { width: 1, height: 24, backgroundColor: '#333' },
});

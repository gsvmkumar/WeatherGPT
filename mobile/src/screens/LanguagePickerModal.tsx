/**
 * Visual Language Picker Modal — Designed for rural low-literacy accessibility
 * Displays 8 Indian languages with large native script cards and spoken confirmation.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Check, X, Globe } from 'lucide-react-native';
import { useMobileStore } from '../store/useMobileStore';
import { VoiceService } from '../services/voice';
import { getThemeColors } from '../theme/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const INDIAN_LANGUAGES = [
  {
    code: 'te',
    locale: 'te-IN',
    nativeName: 'తెలుగు',
    englishName: 'Telugu',
    state: 'Andhra Pradesh & Telangana',
    greeting: 'నమస్కారం! తెలుగు ఎంచుకున్నారు.',
  },
  {
    code: 'en',
    locale: 'en-IN',
    nativeName: 'English',
    englishName: 'English',
    state: 'All India',
    greeting: 'English language selected.',
  },
  {
    code: 'hi',
    locale: 'hi-IN',
    nativeName: 'हिन्दी',
    englishName: 'Hindi',
    state: 'North & Central India',
    greeting: 'नमस्ते! हिन्दी भाषा चुनी गई है।',
  },
  {
    code: 'ta',
    locale: 'ta-IN',
    nativeName: 'தமிழ்',
    englishName: 'Tamil',
    state: 'Tamil Nadu',
    greeting: 'வணக்கம்! தமிழ் தேர்ந்தெடுக்கப்பட்டது.',
  },
  {
    code: 'kn',
    locale: 'kn-IN',
    nativeName: 'ಕನ್ನಡ',
    englishName: 'Kannada',
    state: 'Karnataka',
    greeting: 'ನಮಸ್ಕಾರ! ಕನ್ನಡ ಆಯ್ಕೆ ಮಾಡಲಾಗಿದೆ.',
  },
  {
    code: 'ml',
    locale: 'ml-IN',
    nativeName: 'മലയാളം',
    englishName: 'Malayalam',
    state: 'Kerala',
    greeting: 'നമസ്കാരം! മലയാളം തിരഞ്ഞെടുത്തു.',
  },
  {
    code: 'mr',
    locale: 'mr-IN',
    nativeName: 'मराठी',
    englishName: 'Marathi',
    state: 'Maharashtra',
    greeting: 'नमस्कार! मराठी भाषा निवडली आहे.',
  },
  {
    code: 'bn',
    locale: 'bn-IN',
    nativeName: 'বাংলা',
    englishName: 'Bengali',
    state: 'West Bengal & Tripura',
    greeting: 'নমস্কার! বাংলা ভাষা নির্বাচিত হয়েছে।',
  },
];

export const LanguagePickerModal: React.FC<Props> = ({ visible, onClose }) => {
  const { language, setLanguage, theme } = useMobileStore();
  const colors = getThemeColors(theme);

  const handleSelect = (lang: typeof INDIAN_LANGUAGES[0]) => {
    setLanguage(lang.code, lang.locale, lang.nativeName);
    // Audio confirmation in selected language
    VoiceService.speak(lang.greeting, lang.locale);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerTitleRow}>
            <Globe size={24} color={colors.accent} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              మీ భాషను ఎంచుకోండి / Select Language
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Tap your language. App will speak and respond in this language.
        </Text>

        {/* 8 Indian Languages Grid */}
        <ScrollView contentContainerStyle={styles.grid}>
          {INDIAN_LANGUAGES.map((item) => {
            const isSelected = language === item.code;
            return (
              <TouchableOpacity
                key={item.code}
                activeOpacity={0.7}
                onPress={() => handleSelect(item)}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surfaceCard,
                    borderColor: colors.border,
                  },
                  isSelected && [
                    styles.selectedCard,
                    {
                      borderColor: colors.accent,
                      backgroundColor: colors.accentBg,
                    },
                  ],
                ]}
              >
                <View style={styles.cardContent}>
                  <Text
                    style={[
                      styles.nativeText,
                      { color: colors.textPrimary },
                      isSelected && [styles.selectedText, { color: colors.accent }],
                    ]}
                  >
                    {item.nativeName}
                  </Text>
                  <Text style={[styles.englishText, { color: colors.textSecondary }]}>
                    {item.englishName}
                  </Text>
                  <Text style={[styles.stateText, { color: colors.textMuted }]}>
                    {item.state}
                  </Text>
                </View>

                {isSelected && (
                  <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                    <Check size={20} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
  },
  closeBtn: {
    padding: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginVertical: 12,
    textAlign: 'center',
  },
  grid: {
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#1e293b',
  },
  selectedCard: {
    borderColor: '#0284c7',
    backgroundColor: '#0c2340',
  },
  cardContent: {
    flex: 1,
  },
  nativeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  selectedText: {
    color: '#38bdf8',
  },
  englishText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  stateText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

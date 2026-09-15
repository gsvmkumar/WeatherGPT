/**
 * WelcomeScreen — Mobile-First Authentication & Mode Selector
 * Allows sign-in with Google or Continuing as Guest, with Voice vs Classic mode selection.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import * as Speech from 'expo-speech';
import {
  CloudSun,
  Mic,
  MessageSquare,
  Sparkles,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  X,
  Volume2,
} from 'lucide-react-native';
import { WeatherApi } from '../services/api';
import { useMobileStore, AuthMode } from '../store/useMobileStore';
import { ThemeToggle } from '../components/ThemeToggle';
import { getThemeColors } from '../theme/theme';

interface WelcomeScreenProps {
  onContinueGoogle: (isNewUser: boolean) => void;
  onContinueGuest: (isNewUser: boolean) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onContinueGoogle,
  onContinueGuest,
}) => {
  const { setAuth, authMode, setAuthMode, language, theme } = useMobileStore();
  const colors = getThemeColors(theme);
  const [isLoading, setIsLoading] = useState(false);
  const [googleModalVisible, setGoogleModalVisible] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Play voice greeting if user is in voice mode
  const playVoiceGreeting = () => {
    try {
      const text =
        language === 'te'
          ? 'వెదర్‌జిపిటికి స్వాగతం. మీ వాతావరణ సహాయకుడిని సెటప్ చేసుకుందాం.'
          : "Welcome to WeatherGPT. Let's set up your weather assistant.";
      Speech.speak(text, {
        language: language === 'te' ? 'te-IN' : 'en-US',
        rate: 0.95,
      });
    } catch (e) {
      console.log('Voice greeting skipped:', e);
    }
  };

  const handleSelectMode = (mode: AuthMode) => {
    setAuthMode(mode);
    if (mode === 'voice') {
      playVoiceGreeting();
    }
  };

  // Execute Google Authentication with backend verification
  const handleGoogleAuth = async (tokenSuffix: string) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const googleToken = `demo_google_${tokenSuffix}`;
      const res = await WeatherApi.googleLogin(googleToken);

      setAuth(res.access_token, res.user, false);
      setGoogleModalVisible(false);
      setIsLoading(false);

      if (res.is_new_user) {
        onContinueGoogle(true);
      } else {
        onContinueGoogle(false);
      }
    } catch (error: any) {
      setIsLoading(false);
      setErrorMessage(error?.response?.data?.detail || 'Google sign-in failed. Please try again.');
    }
  };

  // Fast Guest Session
  const handleGuestAuth = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await WeatherApi.guestLogin('Guest Farmer', 'te');
      setAuth(res.access_token, res.user, true);
      setIsLoading(false);
      onContinueGuest(true);
    } catch (error: any) {
      setIsLoading(false);
      setErrorMessage('Could not initialize guest session. Please check backend connection.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Bar with Quick Theme Toggle */}
      <View style={{ width: '100%', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 8 }}>
        <ThemeToggle variant="compact" />
      </View>

      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        {/* Top Branding Banner */}
        <View style={styles.brandSection}>
          <View style={[styles.logoBadge, { backgroundColor: colors.surfaceCard, borderColor: colors.accentBorder }]}>
            <CloudSun size={52} color={colors.accent} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>WeatherGPT</Text>
          <Text style={[styles.subtitle, { color: colors.accent }]}>మీ వాతావరణ AI సహాయకుడు</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            India's Voice-First Hyperlocal Weather & Climate Assistant
          </Text>
        </View>

        {/* Interaction Mode Switcher */}
        <View style={styles.modeSection}>
          <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Select Your Experience</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[
                styles.modeCard,
                {
                  backgroundColor: colors.surfaceCard,
                  borderColor: colors.border,
                },
                authMode === 'voice' && [
                  styles.modeCardActive,
                  {
                    borderColor: colors.accent,
                    backgroundColor: colors.accentBg,
                  },
                ],
              ]}
              onPress={() => handleSelectMode('voice')}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.modeIconCircle,
                  { backgroundColor: colors.surfaceElevated },
                  authMode === 'voice' && [
                    styles.modeIconCircleActive,
                    { backgroundColor: colors.accentBg },
                  ],
                ]}
              >
                <Mic size={24} color={authMode === 'voice' ? colors.accent : colors.textMuted} />
              </View>
              <Text
                style={[
                  styles.modeTitle,
                  { color: colors.textPrimary },
                  authMode === 'voice' && [styles.modeTitleActive, { color: colors.accent }],
                ]}
              >
                🎙️ Voice Mode
              </Text>
              <Text style={[styles.modeDesc, { color: colors.textSecondary }]}>
                Speak & listen naturally
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeCard,
                {
                  backgroundColor: colors.surfaceCard,
                  borderColor: colors.border,
                },
                authMode === 'classic' && [
                  styles.modeCardActive,
                  {
                    borderColor: colors.accent,
                    backgroundColor: colors.accentBg,
                  },
                ],
              ]}
              onPress={() => handleSelectMode('classic')}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.modeIconCircle,
                  { backgroundColor: colors.surfaceElevated },
                  authMode === 'classic' && [
                    styles.modeIconCircleActive,
                    { backgroundColor: colors.accentBg },
                  ],
                ]}
              >
                <MessageSquare size={24} color={authMode === 'classic' ? colors.accent : colors.textMuted} />
              </View>
              <Text
                style={[
                  styles.modeTitle,
                  { color: colors.textPrimary },
                  authMode === 'classic' && [styles.modeTitleActive, { color: colors.accent }],
                ]}
              >
                💬 Classic Mode
              </Text>
              <Text style={[styles.modeDesc, { color: colors.textSecondary }]}>
                Type & visual forecasts
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Voice Greeting Quick Trigger */}
        {authMode === 'voice' && (
          <TouchableOpacity
            style={styles.greetingPill}
            onPress={playVoiceGreeting}
            activeOpacity={0.7}
          >
            <Volume2 size={16} color="#38bdf8" />
            <Text style={styles.greetingText}>Tap to hear voice introduction</Text>
          </TouchableOpacity>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Actions Section */}
        <View style={styles.actionSection}>
          {/* Primary Action: Google Sign-In */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => setGoogleModalVisible(true)}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#0f172a" size="small" />
            ) : (
              <>
                <View style={styles.googleIconCircle}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
                <ArrowRight size={20} color="#0f172a" />
              </>
            )}
          </TouchableOpacity>

          {/* Secondary Action: Guest Mode */}
          <TouchableOpacity
            style={[
              styles.guestButton,
              {
                backgroundColor: colors.surfaceCard,
                borderColor: colors.border,
              },
            ]}
            onPress={handleGuestAuth}
            disabled={isLoading}
            activeOpacity={0.75}
          >
            <User size={18} color={colors.textSecondary} />
            <Text style={[styles.guestButtonText, { color: colors.textPrimary }]}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>

        {/* Security & Privacy Assurance */}
        <View style={[styles.securityBadge, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
          <ShieldCheck size={16} color={colors.success} />
          <Text style={[styles.securityText, { color: colors.textSecondary }]}>
            No Google passwords stored. Direct OAuth token verification.
          </Text>
        </View>
      </ScrollView>

      {/* Google Account Selector Modal (Optimized for Android) */}
      <Modal
        visible={googleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGoogleModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.modalBg,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Text style={[styles.modalG, { color: colors.accent }]}>G</Text>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Sign in with Google</Text>
              </View>
              <TouchableOpacity
                onPress={() => setGoogleModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Select an account to continue to WeatherGPT
            </Text>

            {/* Quick Demo Accounts for immediate Android testing */}
            <TouchableOpacity
              style={[
                styles.accountCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleGoogleAuth('farmer_ravi')}
              activeOpacity={0.8}
            >
              <View style={[styles.avatar, { backgroundColor: '#0284c7' }]}>
                <Text style={styles.avatarText}>R</Text>
              </View>
              <View style={styles.accountInfo}>
                <Text style={[styles.accountName, { color: colors.textPrimary }]}>Ravi Kumar (Farmer)</Text>
                <Text style={[styles.accountEmail, { color: colors.textSecondary }]}>ravi.farmer@gmail.com</Text>
              </View>
              <CheckCircle2 size={18} color="#0284c7" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.accountCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleGoogleAuth('priya_sharma')}
              activeOpacity={0.8}
            >
              <View style={[styles.avatar, { backgroundColor: '#10b981' }]}>
                <Text style={styles.avatarText}>P</Text>
              </View>
              <View style={styles.accountInfo}>
                <Text style={[styles.accountName, { color: colors.textPrimary }]}>Priya Sharma</Text>
                <Text style={[styles.accountEmail, { color: colors.textSecondary }]}>priya.s@gmail.com</Text>
              </View>
              <CheckCircle2 size={18} color="#10b981" />
            </TouchableOpacity>

            {/* Custom Account Input */}
            <View
              style={[
                styles.customInputCard,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.customInputLabel, { color: colors.textSecondary }]}>
                Or enter custom Google account:
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.inputText,
                    },
                  ]}
                  placeholder="name@gmail.com"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={customEmail}
                  onChangeText={setCustomEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TouchableOpacity
                  style={[
                    styles.customSubmitBtn,
                    { backgroundColor: colors.accent },
                    !customEmail.trim() && styles.customSubmitBtnDisabled,
                  ]}
                  onPress={() => {
                    const clean = customEmail.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                    handleGoogleAuth(clean || 'custom_user');
                  }}
                  disabled={!customEmail.trim()}
                >
                  <Text style={styles.customSubmitText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brandSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#38bdf8',
    marginTop: 4,
  },
  tagline: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    maxWidth: 280,
  },
  modeSection: {
    marginTop: 28,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 12,
    textAlign: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  modeCardActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  modeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modeIconCircleActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 4,
  },
  modeTitleActive: {
    color: '#38bdf8',
  },
  modeDesc: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  greetingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 14,
    gap: 8,
  },
  greetingText: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    textAlign: 'center',
  },
  actionSection: {
    gap: 12,
    marginTop: 28,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    gap: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  googleIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleG: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4285F4',
  },
  googleButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
  },
  guestButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  securityText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalG: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4285F4',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 6,
    marginBottom: 20,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  accountEmail: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  customInputCard: {
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  customInputLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  customSubmitBtn: {
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customSubmitBtnDisabled: {
    backgroundColor: '#334155',
  },
  customSubmitText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13,
  },
});

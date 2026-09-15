/**
 * LoginScreen — Email + Password Login for WeatherGPT Mobile.
 *
 * Screen structure:
 * "Welcome Back"
 * Email [________________]
 * Password [________________] (with show/hide eye toggle)
 * [ Login ]
 * Forgot Password?
 * Don't have an account? [ Create Account ]
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  CloudSun,
  ArrowRight,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  X,
  User,
} from 'lucide-react-native';
import { WeatherApi } from '../services/api';
import { useMobileStore } from '../store/useMobileStore';
import { ThemeToggle } from '../components/ThemeToggle';
import { getThemeColors } from '../theme/theme';

interface LoginScreenProps {
  onLoggedIn: (isNewUser: boolean) => void;
  onNavigateRegister: () => void;
  onContinueGuest?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoggedIn,
  onNavigateRegister,
  onContinueGuest,
}) => {
  const { setAuth, theme } = useMobileStore();
  const colors = getThemeColors(theme);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password modal state
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);
  const [forgotErrorMessage, setForgotErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const res = await WeatherApi.login({
        email: cleanEmail.toLowerCase(),
        password,
      });

      // Save token & user in mobile state & local storage
      setAuth(res.access_token, res.user, false);
      setIsLoading(false);

      onLoggedIn(res.is_new_user);
    } catch (err: any) {
      setIsLoading(false);
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') {
        setErrorMessage(detail);
      } else {
        setErrorMessage('Invalid email or password. Please try again.');
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      setForgotErrorMessage('Please enter your registered email address.');
      return;
    }
    try {
      setForgotLoading(true);
      setForgotErrorMessage(null);
      const res = await WeatherApi.forgotPassword(forgotEmail.trim().toLowerCase());
      setForgotLoading(false);
      setForgotSuccessMessage(
        res?.message ||
          'If an account with that email exists, password reset instructions have been initiated.'
      );
    } catch (err: any) {
      setForgotLoading(false);
      setForgotErrorMessage('Could not initiate reset. Please check your network.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Header with Quick Theme Toggle */}
      <View style={styles.topHeader}>
        <View style={styles.brandingSmall}>
          <CloudSun size={28} color={colors.accent} />
          <Text style={[styles.brandTitleSmall, { color: colors.textPrimary }]}>WeatherGPT</Text>
        </View>
        <ThemeToggle variant="compact" />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Main Title Banner */}
          <View style={styles.titleSection}>
            <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>Welcome Back</Text>
            <Text style={[styles.teluguSubtitle, { color: colors.accent }]}>తిరిగి స్వాగతం</Text>
            <Text style={[styles.leadDescription, { color: colors.textSecondary }]}>
              Log in with your WeatherGPT email and password to access your personalized weather forecasts and farm alerts.
            </Text>
          </View>

          {/* Error Message Box */}
          {errorMessage && (
            <View style={[styles.errorContainer, { backgroundColor: '#ef444415', borderColor: '#ef444460' }]}>
              <AlertCircle size={20} color="#ef4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Login Form */}
          <View style={[styles.formCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Email / ఈమెయిల్</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Password / పాస్‌వర్డ్</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <View style={{ alignItems: 'flex-end', marginTop: 2 }}>
              <TouchableOpacity
                onPress={() => {
                  setForgotEmail(email);
                  setForgotSuccessMessage(null);
                  setForgotErrorMessage(null);
                  setForgotModalVisible(true);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.forgotPasswordText, { color: colors.accent }]}>
                  Forgot Password? / పాస్‌వర్డ్ మర్చిపోయారా?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.accent }]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#0f172a" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Login</Text>
                  <ArrowRight size={20} color="#0f172a" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Create Account Section */}
          <View style={styles.createAccountSection}>
            <Text style={[styles.dontHaveText, { color: colors.textSecondary }]}>
              Don't have an account?
            </Text>
            <TouchableOpacity
              style={[styles.createAccountBtn, { borderColor: colors.accent }]}
              onPress={onNavigateRegister}
              activeOpacity={0.8}
            >
              <Text style={[styles.createAccountBtnText, { color: colors.accent }]}>
                Create Account / ఖాతాను సృష్టించండి
              </Text>
            </TouchableOpacity>
          </View>

          {/* Optional Guest Exploration */}
          {onContinueGuest && (
            <TouchableOpacity
              style={[
                styles.guestBtn,
                { backgroundColor: colors.surfaceCard, borderColor: colors.border },
              ]}
              onPress={onContinueGuest}
              activeOpacity={0.75}
            >
              <User size={18} color={colors.textSecondary} />
              <Text style={[styles.guestBtnText, { color: colors.textSecondary }]}>
                Continue as Guest for Quick Exploration
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.modalBg, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <KeyRound size={22} color={colors.accent} />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Reset Password
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setForgotModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Enter your registered email address. If an account exists, password reset instructions will be initiated.
            </Text>

            {forgotErrorMessage && (
              <View style={[styles.errorContainer, { backgroundColor: '#ef444415', borderColor: '#ef444460' }]}>
                <AlertCircle size={18} color="#ef4444" />
                <Text style={styles.errorText}>{forgotErrorMessage}</Text>
              </View>
            )}

            {forgotSuccessMessage ? (
              <View style={styles.successBox}>
                <CheckCircle2 size={24} color="#10b981" />
                <Text style={[styles.successText, { color: colors.textPrimary }]}>
                  {forgotSuccessMessage}
                </Text>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.accent, width: '100%', marginTop: 12 }]}
                  onPress={() => setForgotModalVisible(false)}
                >
                  <Text style={styles.primaryButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border, marginTop: 12 },
                  ]}
                >
                  <Mail size={18} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="Enter registered email"
                    placeholderTextColor={colors.textMuted}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.accent, marginTop: 16 }]}
                  onPress={handleForgotPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator color="#0f172a" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send Reset Instructions</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  brandingSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitleSmall: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  titleSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
  },
  teluguSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  leadDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  eyeBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryButton: {
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  createAccountSection: {
    alignItems: 'center',
    marginTop: 28,
    gap: 10,
  },
  dontHaveText: {
    fontSize: 14,
    fontWeight: '600',
  },
  createAccountBtn: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createAccountBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  guestBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    gap: 8,
  },
  guestBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  successText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

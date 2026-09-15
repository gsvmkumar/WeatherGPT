/**
 * RegisterScreen — Proper Email + Password Account Creation for WeatherGPT Mobile.
 *
 * Registration Flow:
 * Create Account -> Email + Password + Name -> Input Validation -> Argon2id Hash ->
 * Secure Storage -> Email Verification Info -> Profile Setup (Location -> Language -> Notifications) -> Home
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
} from 'react-native';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CloudSun,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react-native';
import { WeatherApi } from '../services/api';
import { useMobileStore } from '../store/useMobileStore';
import { ThemeToggle } from '../components/ThemeToggle';
import { getThemeColors } from '../theme/theme';

interface RegisterScreenProps {
  onRegistered: () => void;
  onNavigateLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onRegistered,
  onNavigateLogin,
}) => {
  const { setAuth, theme, language } = useMobileStore();
  const colors = getThemeColors(theme);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validate form before submission
  const validateForm = (): string | null => {
    if (!name.trim()) {
      return 'Please enter your full name.';
    }
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return 'Please enter your email address.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return 'Please enter a valid email address (e.g. name@example.com).';
    }
    if (!password) {
      return 'Please enter an account password.';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match. Please re-enter your password.';
    }
    return null;
  };

  const handleRegister = async () => {
    const error = validateForm();
    if (error) {
      setErrorMessage(error);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const res = await WeatherApi.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirm_password: confirmPassword,
        preferred_language: language || 'te',
      });

      // Save token and user in mobile store & encrypted local storage
      setAuth(res.access_token, res.user, false);
      setIsLoading(false);

      // Transition to Onboarding steps (Location -> Language -> Notifications)
      onRegistered();
    } catch (err: any) {
      setIsLoading(false);
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') {
        setErrorMessage(detail);
      } else if (Array.isArray(detail)) {
        setErrorMessage(detail[0]?.msg || 'Registration failed. Please check your inputs.');
      } else {
        setErrorMessage('Could not connect to WeatherGPT server. Please check your network.');
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Header with Quick Theme Switcher */}
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
            <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>
              Create your WeatherGPT Account
            </Text>
            <Text style={[styles.teluguSubtitle, { color: colors.accent }]}>
              మీ వెదర్‌జిపిటి ఖాతాను సృష్టించండి
            </Text>
            <Text style={[styles.leadDescription, { color: colors.textSecondary }]}>
              Sign up with your email to receive hyperlocal forecasts, severe weather alerts, and AI farming advisories.
            </Text>
          </View>

          {/* Error Message Box */}
          {errorMessage && (
            <View style={[styles.errorContainer, { backgroundColor: '#ef444415', borderColor: '#ef444460' }]}>
              <AlertCircle size={20} color="#ef4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Registration Form */}
          <View style={[styles.formCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            {/* Field 1: Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Full Name / పేరు *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <User size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Field 2: Email Address */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Email Address / ఈమెయిల్ *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="e.g. ramesh@example.com"
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

            {/* Field 3: Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Password / పాస్‌వర్డ్ *</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="At least 6 characters"
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

            {/* Field 4: Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Confirm Password / నిర్ధారణ పాస్‌వర్డ్ *
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="Re-enter your password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color={colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.accent }]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#0f172a" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Continue to Profile Setup</Text>
                  <ArrowRight size={20} color="#0f172a" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Security & Password Clarification Note */}
          <View
            style={[
              styles.securityBanner,
              { backgroundColor: colors.accentBg, borderColor: colors.accentBorder },
            ]}
          >
            <ShieldCheck size={20} color={colors.accent} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.securityTitle, { color: colors.textPrimary }]}>
                Account & Password Security
              </Text>
              <Text style={[styles.securityBody, { color: colors.textSecondary }]}>
                Your email can be a Gmail address, but this is your independent WeatherGPT password.
                We will never ask for or store your Google account password.
              </Text>
            </View>
          </View>

          {/* Navigation to Login */}
          <View style={styles.loginRedirectSection}>
            <Text style={[styles.redirectText, { color: colors.textSecondary }]}>
              Already have an account?
            </Text>
            <TouchableOpacity onPress={onNavigateLogin} style={styles.loginLinkBtn}>
              <Text style={[styles.loginLinkText, { color: colors.accent }]}>
                Login to WeatherGPT
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginTop: 12,
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
  },
  teluguSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  leadDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
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
  primaryButton: {
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  securityBanner: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    gap: 10,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  securityBody: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  loginRedirectSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 6,
    flexWrap: 'wrap',
  },
  redirectText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginLinkBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

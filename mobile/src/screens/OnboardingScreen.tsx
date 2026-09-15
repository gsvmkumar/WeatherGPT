/**
 * OnboardingScreen — 4-Step First-Time Mobile Onboarding Wizard
 * Step 1: Name ("What should we call you?")
 * Step 2: Location ("Where are you located?" - GPS or Search)
 * Step 3: Language ("Which language do you prefer?" - 8 Indian Languages in native script)
 * Step 4: Notifications ("Would you like WeatherGPT to send weather alerts?" - Allow alerts / Later)
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
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import {
  User,
  MapPin,
  Globe,
  Bell,
  Check,
  ChevronRight,
  LocateFixed,
  Search,
  Volume2,
  Sparkles,
} from 'lucide-react-native';
import { WeatherApi } from '../services/api';
import { useMobileStore } from '../store/useMobileStore';
import { ThemeToggle } from '../components/ThemeToggle';
import { getThemeColors } from '../theme/theme';

const INDIAN_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', locale: 'en-US' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', locale: 'te-IN' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', locale: 'hi-IN' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', locale: 'ta-IN' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', locale: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', locale: 'ml-IN' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', locale: 'mr-IN' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', locale: 'bn-IN' },
];

const POPULAR_LOCATIONS = [
  { name: 'Vijayawada', lat: 16.5062, lon: 80.6480 },
  { name: 'Guntur', lat: 16.3067, lon: 80.4365 },
  { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
  { name: 'Visakhapatnam', lat: 17.6868, lon: 83.2185 },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const {
    user,
    setLanguage,
    setLocation,
    setCoordinates,
    authMode,
    setAuth,
    token,
    theme,
  } = useMobileStore();

  const colors = getThemeColors(theme);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [userName, setUserName] = useState<string>(user?.name || '');
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; lat: number; lon: number }>({
    name: 'Vijayawada',
    lat: 16.5062,
    lon: 80.6480,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingLoc, setIsSearchingLoc] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>('te');
  const [notificationsAllowed, setNotificationsAllowed] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const speakPrompt = (text: string) => {
    if (authMode === 'voice') {
      try {
        Speech.speak(text, { language: 'en-US', rate: 0.95 });
      } catch {}
    }
  };

  // Step 2: GPS Location
  const handleUseCurrentLocation = async () => {
    try {
      setIsGpsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsGpsLoading(false);
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const geo = await WeatherApi.reverseGeocode(lat, lon);
      const name = geo.name || 'My Location';
      setSelectedLocation({ name, lat, lon });
      setIsGpsLoading(false);
    } catch {
      setIsGpsLoading(false);
    }
  };

  // Step 2: Search Location
  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length >= 2) {
      setIsSearchingLoc(true);
      const results = await WeatherApi.searchLocations(text.trim());
      setSearchResults(results);
      setIsSearchingLoc(false);
    } else {
      setSearchResults([]);
    }
  };

  // Final Complete Handler
  const handleFinishOnboarding = async (allowAlerts: boolean) => {
    try {
      setIsSubmitting(true);
      setNotificationsAllowed(allowAlerts);

      const chosenLangObj = INDIAN_LANGUAGES.find((l) => l.code === selectedLanguageCode) || INDIAN_LANGUAGES[1];
      setLanguage(chosenLangObj.code, chosenLangObj.locale, chosenLangObj.native);
      setLocation(selectedLocation.name, { latitude: selectedLocation.lat, longitude: selectedLocation.lon });
      setCoordinates({ latitude: selectedLocation.lat, longitude: selectedLocation.lon });

      // Persist to backend if authenticated user exists
      if (user?.id) {
        // Save default location to PostgreSQL
        await WeatherApi.saveLocation(
          user.id,
          selectedLocation.name,
          selectedLocation.lat,
          selectedLocation.lon,
          true
        ).catch((e) => console.log('Save location error:', e));

        // Update preferred language in PostgreSQL
        await WeatherApi.updateUserLanguage(user.id, chosenLangObj.code).catch((e) =>
          console.log('Update lang error:', e)
        );

        // If notifications allowed, register dummy/sim device token
        if (allowAlerts) {
          await WeatherApi.registerDeviceToken(
            user.id,
            `expo_token_device_${Math.random().toString(36).substring(7)}`,
            'android'
          ).catch((e) => console.log('Device token error:', e));
        }

        // Update store with final user state
        setAuth(token, {
          ...user,
          name: userName || user.name,
          preferred_language: chosenLangObj.code,
        });
      }

      setIsSubmitting(false);
      onComplete();
    } catch (e) {
      console.log('Onboarding finish error:', e);
      setIsSubmitting(false);
      onComplete();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Step Indicator Header */}
        <View style={styles.progressContainer}>
          <View style={styles.stepLabelsRow}>
            <Text style={[styles.stepIndicatorText, { color: colors.textSecondary }]}>
              Step {currentStep} of 4
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {authMode === 'voice' && (
                <TouchableOpacity
                  onPress={() => {
                    if (currentStep === 1) speakPrompt('What should we call you? Please enter your name.');
                    if (currentStep === 2) speakPrompt('Where are you located? Use your GPS or choose a city.');
                    if (currentStep === 3) speakPrompt('Which language do you prefer for weather forecasts?');
                    if (currentStep === 4) speakPrompt('Would you like WeatherGPT to send you weather alerts?');
                  }}
                  style={[styles.voiceGuideBtn, { backgroundColor: colors.accentBg }]}
                >
                  <Volume2 size={16} color={colors.accent} />
                  <Text style={[styles.voiceGuideText, { color: colors.accent }]}>Voice Prompt</Text>
                </TouchableOpacity>
              )}
              {/* Quick theme switcher on onboarding */}
              <ThemeToggle variant="compact" />
            </View>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceElevated }]}>
            <View style={[styles.progressBarFill, { width: `${(currentStep / 4) * 100}%`, backgroundColor: colors.accent }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.contentContainer} bounces={false}>
          {/* ── STEP 1: NAME ────────────────────────────────────────────── */}
          {currentStep === 1 && (
            <View style={[styles.stepCard, { backgroundColor: colors.surfaceCard, borderColor: colors.borderSubtle }]}>
              <View style={[styles.iconBadge, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
                <User size={36} color={colors.accent} />
              </View>
              <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>What should we call you?</Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                Your name helps WeatherGPT personalize weather forecasts and advisories.
              </Text>

              <TextInput
                style={[
                  styles.nameInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.inputText,
                  },
                ]}
                placeholder="Enter your name"
                placeholderTextColor={colors.inputPlaceholder}
                value={userName}
                onChangeText={setUserName}
                autoFocus
                autoCapitalize="words"
              />

              <TouchableOpacity
                style={[
                  styles.continueButton,
                  { backgroundColor: colors.accent },
                  !userName.trim() && [styles.continueButtonDisabled, { backgroundColor: colors.surfaceElevated }],
                ]}
                disabled={!userName.trim()}
                onPress={() => {
                  setCurrentStep(2);
                  speakPrompt('Where are you located? Use GPS or select your city.');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
                <ChevronRight size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 2: LOCATION ────────────────────────────────────────── */}
          {currentStep === 2 && (
            <View style={[styles.stepCard, { backgroundColor: colors.surfaceCard, borderColor: colors.borderSubtle }]}>
              <View style={[styles.iconBadge, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
                <MapPin size={36} color={colors.accent} />
              </View>
              <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>Where are you located?</Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                Selected location: <Text style={[styles.highlightText, { color: colors.accent }]}>{selectedLocation.name}</Text>
              </Text>

              {/* Use My Current Location (GPS) */}
              <TouchableOpacity
                style={[
                  styles.gpsButton,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.accentBorder,
                  },
                ]}
                onPress={handleUseCurrentLocation}
                disabled={isGpsLoading}
                activeOpacity={0.8}
              >
                {isGpsLoading ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <>
                    <LocateFixed size={20} color={colors.accent} />
                    <Text style={[styles.gpsButtonText, { color: colors.textPrimary }]}>📍 Use My Current Location</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Search Location Input */}
              <View style={[styles.searchBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle }]}>
                <Search size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.inputText }]}
                  placeholder="🔍 Search city, village or mandal"
                  placeholderTextColor={colors.inputPlaceholder}
                  value={searchQuery}
                  onChangeText={handleSearch}
                />
              </View>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <View style={[styles.resultsContainer, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
                  {searchResults.map((r, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.resultItem, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setSelectedLocation({
                          name: r.name || r.display_name.split(',')[0],
                          lat: r.latitude,
                          lon: r.longitude,
                        });
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                    >
                      <MapPin size={15} color={colors.accent} />
                      <Text style={[styles.resultText, { color: colors.textPrimary }]} numberOfLines={1}>
                        {r.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Popular Regional Presets */}
              <Text style={[styles.presetHeading, { color: colors.textSecondary }]}>Popular Cities & Hubs</Text>
              <View style={styles.presetChipsRow}>
                {POPULAR_LOCATIONS.map((loc, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                      },
                      selectedLocation.name === loc.name && [
                        styles.presetChipActive,
                        {
                          borderColor: colors.accent,
                          backgroundColor: colors.accentBg,
                        },
                      ],
                    ]}
                    onPress={() => setSelectedLocation(loc)}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: colors.textPrimary },
                        selectedLocation.name === loc.name && [
                          styles.presetChipTextActive,
                          { color: colors.accent },
                        ],
                      ]}
                    >
                      {loc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.continueButton, { backgroundColor: colors.accent }]}
                onPress={() => {
                  setCurrentStep(3);
                  speakPrompt('Which language do you prefer for weather information?');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.continueButtonText}>Continue with {selectedLocation.name}</Text>
                <ChevronRight size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 3: LANGUAGE ────────────────────────────────────────── */}
          {currentStep === 3 && (
            <View style={[styles.stepCard, { backgroundColor: colors.surfaceCard, borderColor: colors.borderSubtle }]}>
              <View style={[styles.iconBadge, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
                <Globe size={36} color={colors.accent} />
              </View>
              <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>Which language do you prefer?</Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                WeatherGPT speaks and understands 8 Indian languages.
              </Text>

              {/* Language Grid in Native Scripts */}
              <View style={styles.langGrid}>
                {INDIAN_LANGUAGES.map((lang) => {
                  const isSelected = selectedLanguageCode === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.langCard,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.border,
                        },
                        isSelected && [
                          styles.langCardActive,
                          {
                            borderColor: colors.accent,
                            backgroundColor: colors.accentBg,
                          },
                        ],
                      ]}
                      onPress={() => setSelectedLanguageCode(lang.code)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.langTopRow}>
                        <Text
                          style={[
                            styles.langNative,
                            { color: colors.textPrimary },
                            isSelected && [styles.langNativeActive, { color: colors.accent }],
                          ]}
                        >
                          {lang.native}
                        </Text>
                        {isSelected && <Check size={16} color={colors.accent} />}
                      </View>
                      <Text
                        style={[
                          styles.langEnglish,
                          { color: colors.textSecondary },
                          isSelected && [styles.langEnglishActive, { color: colors.accent }],
                        ]}
                      >
                        {lang.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.continueButton, { backgroundColor: colors.accent }]}
                onPress={() => {
                  setCurrentStep(4);
                  speakPrompt('Would you like WeatherGPT to send weather alerts?');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
                <ChevronRight size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 4: NOTIFICATIONS ───────────────────────────────────── */}
          {currentStep === 4 && (
            <View style={[styles.stepCard, { backgroundColor: colors.surfaceCard, borderColor: colors.borderSubtle }]}>
              <View style={[styles.iconBadge, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
                <Bell size={36} color={colors.warning} />
              </View>
              <Text style={[styles.stepHeading, { color: colors.textPrimary }]}>Receive Weather Alerts?</Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                Get real-time warnings for heavy rain, thunderstorms, and extreme heat before they reach your area.
              </Text>

              <View style={[styles.alertExplanationBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <View style={styles.alertPoint}>
                  <Text style={[styles.alertPointDot, { color: colors.warning }]}>•</Text>
                  <Text style={[styles.alertPointText, { color: colors.textPrimary }]}>Rain & monsoon storm warnings</Text>
                </View>
                <View style={styles.alertPoint}>
                  <Text style={[styles.alertPointDot, { color: colors.warning }]}>•</Text>
                  <Text style={[styles.alertPointText, { color: colors.textPrimary }]}>Heatwave & extreme temperature advisories</Text>
                </View>
                <View style={styles.alertPoint}>
                  <Text style={[styles.alertPointDot, { color: colors.warning }]}>•</Text>
                  <Text style={[styles.alertPointText, { color: colors.textPrimary }]}>Agricultural crop protection updates</Text>
                </View>
              </View>

              {isSubmitting ? (
                <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 24 }} />
              ) : (
                <View style={styles.notifButtonColumn}>
                  {/* Primary: Allow alerts */}
                  <TouchableOpacity
                    style={[styles.allowButton, { backgroundColor: colors.accent }]}
                    onPress={() => handleFinishOnboarding(true)}
                    activeOpacity={0.8}
                  >
                    <Bell size={20} color="#0f172a" />
                    <Text style={styles.allowButtonText}>🔔 Allow Weather Alerts</Text>
                  </TouchableOpacity>

                  {/* Secondary: Later */}
                  <TouchableOpacity
                    style={[
                      styles.laterButton,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => handleFinishOnboarding(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.laterButtonText, { color: colors.textSecondary }]}>Maybe Later</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  stepLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepIndicatorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  voiceGuideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voiceGuideText: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#38bdf8',
    borderRadius: 3,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  stepCard: {
    alignItems: 'center',
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  stepHeading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    maxWidth: 320,
  },
  highlightText: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  nameInput: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 28,
    textAlign: 'center',
  },
  continueButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    elevation: 3,
    marginTop: 10,
  },
  continueButtonDisabled: {
    backgroundColor: '#1e293b',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  // Step 2 styles
  gpsButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 16,
  },
  gpsButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#38bdf8',
  },
  searchBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  resultsContainer: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  resultText: {
    color: '#f1f5f9',
    fontSize: 13,
    flex: 1,
  },
  presetHeading: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    marginBottom: 20,
  },
  presetChip: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  presetChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38bdf8',
  },
  presetChipText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  presetChipTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  // Step 3 Language Grid
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginBottom: 20,
  },
  langCard: {
    width: '48%',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  langCardActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  langTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  langNative: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  langNativeActive: {
    color: '#38bdf8',
  },
  langEnglish: {
    fontSize: 12,
    color: '#64748b',
  },
  langEnglishActive: {
    color: '#94a3b8',
  },
  // Step 4 Notifications
  alertExplanationBox: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  alertPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  alertPointDot: {
    fontSize: 18,
    color: '#38bdf8',
  },
  alertPointText: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  notifButtonColumn: {
    width: '100%',
    gap: 12,
  },
  allowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  allowButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  laterButtonText: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '600',
  },
});

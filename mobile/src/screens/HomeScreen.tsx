/**
 * Mobile-First Voice Home Screen
 * Designed for rural accessibility: minimal reading, giant voice trigger,
 * instant spoken responses, and visual cues.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Keyboard,
  Modal,
} from 'react-native';
import {
  MapPin,
  ChevronDown,
  Globe,
  Volume2,
  AlertTriangle,
  Sprout,
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudSnow,
  CloudFog,
  Wind,
  Droplets,
  RotateCcw,
  Search,
  Send,
  X,
  MessageSquare,
  Clock,
  Calendar,
  LocateFixed,
  ArrowUp,
  ArrowDown,
  User,
  LogOut,
  ShieldCheck,
  Mic,
} from 'lucide-react-native';
import { useMobileStore } from '../store/useMobileStore';
import { VoiceTriggerButton } from '../components/VoiceTriggerButton';
import { ThemeToggle } from '../components/ThemeToggle';
import { getThemeColors } from '../theme/theme';
import { LanguagePickerModal } from './LanguagePickerModal';
import { LocationPickerModal } from './LocationPickerModal';
import { WeatherApi, ForecastResponse } from '../services/api';
import { VoiceService } from '../services/voice';
import { resolveResponseCommand, detectVoiceCommand } from '../services/voiceCommands';

// Quick tap questions in each language for non-literate instant access
const QUICK_QUESTIONS: Record<string, { label: string; query: string }[]> = {
  te: [
    { label: 'ఈరోజు ఎండ / వర్షం?', query: 'ఈరోజు వాతావరణం ఎలా ఉంది?' },
    { label: 'రేపు వర్షం పడుతుందా?', query: 'రేపు వర్షం పడే అవకాశం ఉందా?' },
    { label: 'రైతు సలహా', query: 'నేటి వాతావరణానికి వ్యవసాయ సలహా ఏమిటి?' },
  ],
  en: [
    { label: "Today's Weather", query: "What is the weather today?" },
    { label: 'Rain Tomorrow?', query: 'Will it rain tomorrow?' },
    { label: 'Farming Advice', query: 'Is today good for farming?' },
  ],
  hi: [
    { label: 'आज का मौसम', query: 'आज का मौसम कैसा रहेगा?' },
    { label: 'कल बारिश होगी?', query: 'क्या कल बारिश होगी?' },
    { label: 'किसान सलाह', query: 'आज खेती के लिए क्या सलाह है?' },
  ],
  ta: [
    { label: 'இன்று வானிலை', query: 'இன்று வானிலை எப்படி இருக்கும்?' },
    { label: 'நாளை மழையா?', query: 'நாளை மழை பெய்யுமா?' },
    { label: 'விவசாய ஆலோசனை', query: 'இன்றைய விவசாய ஆலோசனை என்ன?' },
  ],
  kn: [
    { label: 'ಇಂದಿನ ಹವಾಮಾನ', query: 'ಇಂದಿನ ಹವಾಮಾನ ಹೇಗಿದೆ?' },
    { label: 'ನಾಳೆ ಮಳೆಯೇ?', query: 'ನಾಳೆ ಮಳೆ ಬರುತ್ತದೆಯೇ?' },
    { label: 'ರೈತ ಸಲಹೆ', query: 'ಇಂದಿನ ಕೃಷಿ ಸಲಹೆ ಏನು?' },
  ],
  ml: [
    { label: 'ഇന്നത്തെ കാലാവസ്ഥ', query: 'ഇന്നത്തെ കാലാവസ്ഥ എങ്ങനെ?' },
    { label: 'നാളെ മഴ?', query: 'നാളെ മഴ പെയ്യുമോ?' },
    { label: 'കർഷക ഉപദേശം', query: 'ഇന്നത്തെ കൃഷി ഉപദേശം എന്താണ്?' },
  ],
  mr: [
    { label: 'आजचे हवामान', query: 'आजचे हवामान कसे आहे?' },
    { label: 'उद्या पाऊस?', query: 'उद्या पाऊस पडेल का?' },
    { label: 'शेती सल्ला', query: 'आज शेतीसाठी काय सल्ला आहे?' },
  ],
  bn: [
    { label: 'আজকের আবহাওয়া', query: 'আজকের আবহাওয়া কেমন?' },
    { label: 'কাল কি বৃষ্টি?', query: 'কাল কি বৃষ্টি হবে?' },
    { label: 'কৃষি পরামর্শ', query: 'আজকের চাষের পরামর্শ কি?' },
  ],
};

// Multilingual placeholders for text search input tool
const TEXT_PLACEHOLDERS: Record<string, string> = {
  te: 'వాతావరణం గురించి అడగండి (e.g. రేపు వర్షం పడుతుందా?)...',
  en: 'Ask weather (e.g. Will it rain tomorrow?)...',
  hi: 'मौसम के बारे में पूछें (e.g. क्या आज बारिश होगी?)...',
  ta: 'வானிலை பற்றி கேளுங்கள் (e.g. இன்று மழையா?)...',
  kn: 'ಹವಾಮಾನದ ಬಗ್ಗೆ ಕೇಳಿ (e.g. ನಾಳೆ ಮಳೆಯೇ?)...',
  ml: 'കാലാവസ്ഥ ചോദിക്കൂ (e.g. നാളെ മഴ പെയ്യുമോ?)...',
  mr: 'हवामानाबद्दल विचारा (e.g. आज पाऊस पडेल का?)...',
  bn: 'আবহাওয়া সম্পর্কে জিজ্ঞাসা করুন (e.g. কাল কি বৃষ্টি?)...',
};

// Weather condition icon helper
export const renderWeatherIcon = (code?: number, isDay: boolean = true, size: number = 24) => {
  if (code === undefined || code === null) {
    return isDay ? <Sun size={size} color="#f59e0b" /> : <Cloud size={size} color="#94a3b8" />;
  }
  if (code === 0) {
    return isDay ? <Sun size={size} color="#f59e0b" /> : <Sun size={size} color="#facc15" />;
  }
  if (code === 1 || code === 2) {
    return isDay ? <CloudSun size={size} color="#f59e0b" /> : <Cloud size={size} color="#94a3b8" />;
  }
  if (code === 3) {
    return <Cloud size={size} color="#94a3b8" />;
  }
  if (code === 45 || code === 48) {
    return <CloudFog size={size} color="#cbd5e1" />;
  }
  if (code >= 51 && code <= 57) {
    return <CloudDrizzle size={size} color="#38bdf8" />;
  }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return <CloudRain size={size} color="#0284c7" />;
  }
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return <CloudSnow size={size} color="#e0f2fe" />;
  }
  if (code >= 95) {
    return <CloudLightning size={size} color="#fbbf24" />;
  }
  return <CloudSun size={size} color="#f59e0b" />;
};

// Hour formatter (e.g. "Now", "2 PM")
export const formatHourLabel = (isoString?: string, index: number = 0) => {
  if (index === 0) return 'Now';
  try {
    if (!isoString) return '';
    const d = new Date(isoString);
    const hours = d.getHours();
    if (isNaN(hours)) return isoString.slice ? isoString.slice(11, 16) : '';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `${h} ${ampm}`;
  } catch {
    return isoString && isoString.slice ? isoString.slice(11, 16) : '';
  }
};

// Day formatter (e.g. "Today", "Tomorrow", "Sun")
export const formatDayLabel = (dateStr?: string, index: number = 0, lang: string = 'en') => {
  if (index === 0) return lang === 'te' ? 'ఈరోజు (Today)' : 'Today';
  if (index === 1) return lang === 'te' ? 'రేపు (Tomorrow)' : 'Tomorrow';
  try {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayIdx = d.getDay();
    return isNaN(dayIdx) ? dateStr : dayNames[dayIdx];
  } catch {
    return dateStr || '';
  }
};

// Date formatter (e.g. "11 Sep")
export const formatDateLabel = (dateStr?: string) => {
  try {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const m = parseInt(parts[1], 10) - 1;
      return `${parseInt(parts[2], 10)} ${monthNames[m] || ''}`;
    }
  } catch {}
  return dateStr || '';
};

interface Props {
  onNavigateAlerts: () => void;
  onNavigateAdvisory: () => void;
  onNavigateShelters?: () => void;
  onNavigateHistory?: () => void;
  onSwitchToVoice?: () => void;
  onLogout?: () => void;
  onReplayGreeting?: () => void;
}

export const HomeScreen: React.FC<Props> = ({
  onNavigateAlerts,
  onNavigateAdvisory,
  onNavigateShelters,
  onNavigateHistory,
  onSwitchToVoice,
  onLogout,
  onReplayGreeting,
}) => {

  const {
    user,
    logout,
    isGuest,
    language,
    locale,
    nativeLanguageName,
    setLanguage,
    location,
    coordinates,
    isGpsLocation,
    hasSelectedLocation,
    setHasSelectedLocation,
    voiceStatus,
    setVoiceStatus,
    currentTranscript,
    setCurrentTranscript,
    lastResponse,
    setLastResponse,
    theme,
  } = useMobileStore();

  const colors = getThemeColors(theme);

  const [modalVisible, setModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(!hasSelectedLocation);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [textQuery, setTextQuery] = useState('');
  const [lastQueryText, setLastQueryText] = useState('');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [severeAlert, setSevereAlert] = useState<any>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextSubmit = () => {
    const trimmed = textQuery.trim();
    if (!trimmed || voiceStatus === 'processing') return;
    Keyboard.dismiss();
    handleQuery(trimmed);
    setTextQuery('');
  };

  // Clean up auto-stop timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
      }
    };
  }, []);

  // Load live weather and 7-day forecast when location, language, or coords change
  useEffect(() => {
    loadWeatherData(location, language, coordinates);
  }, [location, language, coordinates]);

  const loadWeatherData = async (
    loc: string,
    lang: string,
    coords?: { latitude: number; longitude: number } | null
  ) => {
    try {
      setIsLoadingForecast(true);
      const [currentData, forecast, alertsData] = await Promise.all([
        WeatherApi.getCurrentWeather(loc, lang, coords?.latitude, coords?.longitude),
        WeatherApi.getForecast(loc, 7, coords?.latitude, coords?.longitude).catch((err) => {
          console.log('Forecast fetch error:', err);
          return null;
        }),
        WeatherApi.getAlerts(loc, lang).catch((err) => {
          console.log('Alerts fetch error:', err);
          return null;
        }),
      ]);

      if (forecast) {
        setForecastData(forecast);
      }

      if (alertsData?.alerts && Array.isArray(alertsData.alerts)) {
        const severe = alertsData.alerts.find(
          (a: any) => a.severity === 'critical' || a.severity === 'high'
        );
        setSevereAlert(severe || null);
      } else {
        setSevereAlert(null);
      }

      if (currentData) {
        const todayForecast = forecast?.daily?.[0];
        setLastResponse({
          session_id: '',
          language: lang,
          locale: locale,
          message: `${loc}: ${currentData.condition_text}, ${currentData.temperature_c}°C. ${
            lang === 'te' ? 'వాతావరణ వివరాలు సిద్ధంగా ఉన్నాయి.' : 'Weather report updated.'
          }`,
          clean_speech_text: `${loc} లో ప్రస్తుత ఉష్ణోగ్రత ${currentData.temperature_c} డిగ్రీల సెల్సియస్, ${currentData.condition_text}.`,
          weather_data_used: true,
          location_resolved: loc,
          weather_data: {
            location: loc,
            temperature_c: currentData.temperature_c,
            feels_like_c: currentData.feels_like_c,
            humidity_pct: currentData.humidity_pct,
            wind_speed_kmh: currentData.wind_speed_kmh,
            rain_probability_pct: currentData.rain_probability_pct ?? todayForecast?.rain_probability_pct ?? 0,
            condition_text: currentData.condition_text,
            condition_code: currentData.condition_code,
            is_day: currentData.is_day,
          },
        });
      }
    } catch (e) {
      console.log('Error loading initial weather & forecast:', e);
    } finally {
      setIsLoadingForecast(false);
    }
  };

  // Execute text/quick voice query pipeline
  const handleQuery = async (questionText: string) => {
    try {
      setQueryError(null);
      setLastQueryText(questionText);
      setCurrentTranscript(questionText);
      setVoiceStatus('processing');
      VoiceService.stop();

      const res = await WeatherApi.sendVoiceQuery({
        message: questionText,
        language: language,
        location: location,
      });

      setLastResponse(res);
      setVoiceStatus('speaking');

      // Speak response loudly through phone speaker
      VoiceService.speak(
        res.clean_speech_text,
        res.locale || locale,
        () => setVoiceStatus('idle'),
        () => setVoiceStatus('idle')
      );
    } catch (error: any) {
      console.error('Voice Query Error:', error);
      setVoiceStatus('error');
      setQueryError(
        error?.message ||
        (language === 'te'
          ? 'సర్వర్ కనెక్ట్ కాలేదు. దయచేసి నెట్‌వర్క్ సరిచూసి మళ్లీ ప్రయత్నించండి.'
          : 'Could not connect to the WeatherGPT backend API.')
      );
    }
  };

  // Voice button press handler: Toggle Record -> Stop & Query -> Speak
  const handleVoiceButtonPress = async () => {
    // 1. If currently speaking response, tap stops audio playback
    if (voiceStatus === 'speaking') {
      VoiceService.stop();
      setVoiceStatus('idle');
      return;
    }

    // 2. If currently recording speech, tap stops recording and processes audio
    if (voiceStatus === 'listening') {
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      await finishRecordingAndProcess();
      return;
    }

    // 3. If idle or error, tap starts microphone recording
    if (voiceStatus === 'idle' || voiceStatus === 'error') {
      setQueryError(null);
      const started = await VoiceService.startRecording();
      if (started) {
        setVoiceStatus('listening');
        // Auto-stop after 8 seconds of speech if user doesn't tap again manually
        recordingTimerRef.current = setTimeout(async () => {
          if (VoiceService.isRecording()) {
            await finishRecordingAndProcess();
          }
        }, 8000);
      } else {
        setVoiceStatus('error');
        setQueryError(
          language === 'te'
            ? 'మైక్రోఫోన్ అనుమతి లభించలేదు.'
            : 'Microphone permission was not granted.'
        );
        setTimeout(() => setVoiceStatus('idle'), 2500);
      }
    }
  };

  // Stop recording and send audio to backend for Gemini speech-to-text
  const finishRecordingAndProcess = async () => {
    try {
      setQueryError(null);
      setVoiceStatus('processing');
      const uri = await VoiceService.stopRecording();
      if (!uri) {
        setVoiceStatus('error');
        setQueryError('Recording audio failed.');
        setTimeout(() => setVoiceStatus('idle'), 2000);
        return;
      }

      const res = await WeatherApi.sendAudioQuery(uri, language, location);
      setLastResponse(res);
      if (res.recognized_text) {
        setCurrentTranscript(res.recognized_text);
        setLastQueryText(res.recognized_text);

        // Dynamic Intent Resolution from backend Gemini
        const cmd = resolveResponseCommand(res, language);
        if (cmd.isCommand) {
          setVoiceStatus('idle');
          if (cmd.commandType === 'SWITCH_MODE_VOICE' && onSwitchToVoice) {
            if (cmd.feedbackText) VoiceService.speak(cmd.feedbackText, locale, onSwitchToVoice, onSwitchToVoice);
            else onSwitchToVoice();
            return;
          }
          if (cmd.commandType === 'SHOW_SAFE_SHELTERS' && onNavigateShelters) {
            if (cmd.feedbackText) VoiceService.speak(cmd.feedbackText, locale, onNavigateShelters, onNavigateShelters);
            else onNavigateShelters();
            return;
          }
          if (cmd.commandType === 'STOP_SPEECH') {
            VoiceService.stop();
            return;
          }
          if (cmd.commandType === 'REPLAY_SPEECH' && lastResponse?.clean_speech_text) {
            setVoiceStatus('speaking');
            VoiceService.speak(lastResponse.clean_speech_text, locale, () => setVoiceStatus('idle'));
            return;
          }
          if (cmd.commandType === 'OPEN_LOCATION_PICKER') {
            setLocationModalVisible(true);
            return;
          }
          if (cmd.commandType === 'SWITCH_LANGUAGE' && cmd.payload) {
            setLanguage(cmd.payload.code, cmd.payload.locale, cmd.payload.nativeName);
            if (cmd.feedbackText) VoiceService.speak(cmd.feedbackText, cmd.payload.locale);
            return;
          }
        }
      }

      setVoiceStatus('speaking');
      VoiceService.speak(
        res.clean_speech_text,
        res.locale || locale,
        () => setVoiceStatus('idle'),
        () => setVoiceStatus('idle')
      );
    } catch (error: any) {
      console.error('Audio Query Error:', error);
      setVoiceStatus('error');
      setQueryError(
        error?.message ||
        (language === 'te'
          ? 'ఆడియో సర్వర్‌ను సంప్రదించడంలో సమస్య ఉంది.'
          : 'Could not process audio with the backend.')
      );
    }
  };

  const currentWeather = lastResponse?.weather_data;
  const todayDaily = forecastData?.daily?.[0];

  const next24Hours = useMemo(() => {
    if (!forecastData?.hourly || !Array.isArray(forecastData.hourly) || forecastData.hourly.length === 0) return [];
    const nowIso = new Date().toISOString().slice(0, 13);
    const startIndex = forecastData.hourly.findIndex(
      (h) => h && typeof h.time === 'string' && h.time.startsWith(nowIso)
    );
    const start = startIndex >= 0 ? startIndex : 0;
    return forecastData.hourly.slice(start, start + 24);
  }, [forecastData]);

  const quickChips = QUICK_QUESTIONS[language] || QUICK_QUESTIONS.en;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        {/* Interactive Location Chip */}
        <TouchableOpacity
          style={[
            styles.locationChip,
            { backgroundColor: colors.surfaceCard, borderColor: colors.borderSubtle, borderWidth: 1 },
          ]}
          onPress={() => setLocationModalVisible(true)}
          activeOpacity={0.7}
        >
          <MapPin size={18} color={colors.accent} />
          <Text style={[styles.locationText, { color: colors.textPrimary }]}>{location}</Text>
          {isGpsLocation && (
            <View style={styles.gpsBadge}>
              <LocateFixed size={11} color="#10b981" />
              <Text style={styles.gpsBadgeText}>GPS</Text>
            </View>
          )}
          <ChevronDown size={14} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Language Pill Selector */}
        <TouchableOpacity
          style={[
            styles.langPill,
            { backgroundColor: colors.accentBg, borderColor: colors.accentBorder },
          ]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Globe size={16} color={colors.accent} />
          <Text style={[styles.langText, { color: colors.accent }]}>{nativeLanguageName}</Text>
        </TouchableOpacity>

        {/* User Profile / Settings Button */}
        <TouchableOpacity
          style={[
            styles.profilePill,
            { backgroundColor: colors.accentBg, borderColor: colors.accentBorder },
          ]}
          onPress={() => setProfileModalVisible(true)}
          activeOpacity={0.7}
        >
          <User size={15} color={colors.accent} />
          <Text style={[styles.profilePillText, { color: colors.accent }]} numberOfLines={1}>
            {isGuest ? 'Guest' : (user?.name?.split(' ')[0] || 'User')}
          </Text>
        </TouchableOpacity>

        {/* Switch to Voice Assistant Mode */}
        {onSwitchToVoice && (
          <TouchableOpacity
            style={[
              styles.voiceModeTopBtn,
              { backgroundColor: colors.accentBg, borderColor: colors.accentBorder },
            ]}
            onPress={onSwitchToVoice}
            activeOpacity={0.75}
          >
            <Mic size={15} color={colors.accent} />
            <Text style={[styles.voiceModeTopBtnText, { color: colors.accent }]}>
              {language === 'te' ? 'వాయిస్' : 'Voice'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Quick Theme Toggle Button in Header */}
        <ThemeToggle variant="compact" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollArea}>
        {/* Prominent Emergency Alert Banner (Severe weather trigger -> Safe Shelter) */}
        {severeAlert && (
          <View style={[styles.emergencyBanner, { backgroundColor: '#ef444415', borderColor: '#ef4444' }]}>
            <View style={styles.emergencyHeader}>
              <AlertTriangle size={22} color="#ef4444" />
              <Text style={styles.emergencyTitle}>
                {language === 'te' ? '⚠️ తీవ్ర వాతావరణ అత్యవసర హెచ్చరిక' : '⚠️ SEVERE WEATHER EMERGENCY ALERT'}
              </Text>
            </View>
            <Text style={[styles.emergencyDesc, { color: colors.textPrimary }]}>
              {severeAlert.title}: {severeAlert.description}
            </Text>
            {onNavigateShelters && (
              <TouchableOpacity
                style={styles.findShelterBtn}
                onPress={onNavigateShelters}
                activeOpacity={0.85}
              >
                <ShieldCheck size={18} color="#ffffff" />
                <Text style={styles.findShelterBtnText}>
                  {language === 'te' ? '🛡️ సమీప సురక్షిత ఆశ్రయాన్ని కనుగొనండి' : '🛡️ FIND SAFE SHELTER NEARBY'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Navigation Quick Shortcuts */}
        <View style={styles.shortcutsRow}>
          <TouchableOpacity
            style={[
              styles.shortcutCard,
              {
                backgroundColor: colors.warningBg,
                borderColor: colors.warningBorder,
              },
            ]}
            onPress={onNavigateAlerts}
            activeOpacity={0.8}
          >
            <AlertTriangle size={20} color={colors.warning} />
            <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>
              {language === 'te' ? 'హెచ్చరికలు / Alerts' : 'Alerts'}
            </Text>
          </TouchableOpacity>

          {onNavigateShelters && (
            <TouchableOpacity
              style={[
                styles.shortcutCard,
                {
                  backgroundColor: colors.accentBg,
                  borderColor: colors.accentBorder,
                },
              ]}
              onPress={onNavigateShelters}
              activeOpacity={0.8}
            >
              <ShieldCheck size={20} color={colors.accent} />
              <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>
                {language === 'te' ? 'ఆశ్రయాలు / Shelters' : 'Shelters'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.shortcutCard,
              {
                backgroundColor: colors.successBg,
                borderColor: colors.successBorder,
              },
            ]}
            onPress={onNavigateAdvisory}
            activeOpacity={0.8}
          >
            <Sprout size={20} color={colors.success} />
            <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>
              {language === 'te' ? 'వ్యవసాయం / Advisory' : 'Advisory'}
            </Text>
          </TouchableOpacity>

          {onNavigateHistory && (
            <TouchableOpacity
              style={[
                styles.shortcutCard,
                {
                  backgroundColor: '#a855f715',
                  borderColor: '#a855f740',
                },
              ]}
              onPress={onNavigateHistory}
              activeOpacity={0.8}
            >
              <Calendar size={20} color="#a855f7" />
              <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>
                {language === 'te' ? 'చరిత్ర / History' : 'History'}
              </Text>
            </TouchableOpacity>
          )}
        </View>


        {/* Center: Giant Voice Trigger Button */}
        <View style={styles.voiceSection}>
          <VoiceTriggerButton
            status={voiceStatus}
            onPress={handleVoiceButtonPress}
            language={language}
          />
        </View>

        {/* Text Query Tool (Type & Ask) */}
        <View
          style={[
            styles.textQueryCard,
            {
              backgroundColor: colors.surfaceCard,
              borderColor: colors.borderSubtle,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: colors.isDark ? 0.2 : 0.08,
              shadowRadius: 6,
              elevation: 2,
            },
          ]}
        >
          <View style={styles.textInputRow}>
            <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.textInputField, { color: colors.inputText }]}
              placeholder={TEXT_PLACEHOLDERS[language] || TEXT_PLACEHOLDERS.en}
              placeholderTextColor={colors.inputPlaceholder}
              value={textQuery}
              onChangeText={setTextQuery}
              onSubmitEditing={handleTextSubmit}
              returnKeyType="send"
              editable={voiceStatus !== 'processing'}
              autoCapitalize="sentences"
              autoCorrect={true}
            />
            {textQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setTextQuery('')}
                style={styles.textClearBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.askButton,
                { backgroundColor: colors.accent },
                (!textQuery.trim() || voiceStatus === 'processing') && [
                  styles.askButtonDisabled,
                  { backgroundColor: colors.surfaceElevated },
                ],
              ]}
              onPress={handleTextSubmit}
              disabled={!textQuery.trim() || voiceStatus === 'processing'}
              activeOpacity={0.8}
            >
              {voiceStatus === 'processing' ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Send size={15} color="#ffffff" />
                  <Text style={styles.askButtonText}>Ask</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 1. User Query Display */}
        {(lastQueryText || currentTranscript) && (
          <View
            style={[
              styles.userQueryContainer,
              {
                backgroundColor: colors.surfaceCard,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <View style={styles.userQueryHeader}>
              <MessageSquare size={14} color={colors.accent} />
              <Text style={[styles.userQueryLabel, { color: colors.accent }]}>
                {voiceStatus === 'listening'
                  ? (language === 'te' ? '🎤 రికార్డింగ్ / Recording:' : '🎤 Voice Recording:')
                  : (language === 'te' ? 'మీ ప్రశ్న / YOUR QUERY' : 'YOUR QUERY')}
              </Text>
            </View>
            <Text style={[styles.userQueryText, { color: colors.textPrimary }]}>
              "{lastQueryText || currentTranscript}"
            </Text>
          </View>
        )}

        {/* 2. Loading State */}
        {voiceStatus === 'processing' && (
          <View
            style={[
              styles.loadingStateCard,
              {
                backgroundColor: colors.surfaceCard,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <ActivityIndicator size="large" color={colors.accent} style={{ marginBottom: 10 }} />
            <Text style={[styles.loadingStateTitle, { color: colors.textPrimary }]}>
              {language === 'te'
                ? 'సమాధానం విశ్లేషిస్తోంది...'
                : 'Analyzing weather query...'}
            </Text>
            <Text style={[styles.loadingStateSubtitle, { color: colors.textSecondary }]}>
              {language === 'te'
                ? 'వాతావరణ వివరాలు మరియు AI సలహాలు సిద్ధమవుతున్నాయి'
                : 'Querying Open-Meteo & Gemini AI pipeline...'}
            </Text>
          </View>
        )}

        {/* 3. Error State when Backend is Unavailable */}
        {queryError && voiceStatus !== 'processing' && (
          <View
            style={[
              styles.errorStateCard,
              {
                backgroundColor: colors.dangerBg,
                borderColor: colors.dangerBorder,
              },
            ]}
          >
            <View style={styles.errorStateHeader}>
              <AlertTriangle size={20} color={colors.danger} />
              <Text style={[styles.errorStateTitle, { color: colors.danger }]}>
                {language === 'te' ? 'సర్వర్ అందుబాటులో లేదు' : 'Backend Unavailable'}
              </Text>
            </View>
            <Text style={[styles.errorStateDescription, { color: colors.textPrimary }]}>
              {queryError}
            </Text>
            <Text style={[styles.errorStateSubtext, { color: colors.textSecondary }]}>
              {language === 'te'
                ? 'దయచేసి మీ మొబైల్ వైఫై కనెక్షన్ మరియు సర్వర్ స్థితిని సరిచూసుకోండి.'
                : 'Please ensure your device is on the same network as the backend server.'}
            </Text>
            {lastQueryText.length > 0 && (
              <TouchableOpacity
                style={[styles.errorRetryBtn, { backgroundColor: colors.danger }]}
                onPress={() => handleQuery(lastQueryText)}
                activeOpacity={0.8}
              >
                <RotateCcw size={16} color="#ffffff" />
                <Text style={styles.errorRetryText}>
                  {language === 'te' ? 'మళ్లీ ప్రయత్నించండి / Retry' : 'Retry Query'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 4. Latest Response Card (Spoken + Visual) */}
        {lastResponse && !queryError && voiceStatus !== 'processing' && (
          <View
            style={[
              styles.responseCard,
              {
                backgroundColor: colors.surfaceCard,
                borderColor: colors.border,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: colors.isDark ? 0.25 : 0.08,
                shadowRadius: 8,
                elevation: 3,
              },
            ]}
          >
            <View style={styles.responseHeader}>
              <View style={[styles.weatherBadge, { backgroundColor: colors.surfaceElevated }]}>
                <Sun size={20} color={colors.sun} />
                <Text style={[styles.tempText, { color: colors.textPrimary }]}>
                  {lastResponse.weather_data?.temperature_c ?? 32.3}°C
                </Text>
              </View>

              {/* Speaker / Replay Button */}
              <TouchableOpacity
                style={[
                  styles.replayButton,
                  { backgroundColor: colors.accentBg },
                  voiceStatus === 'speaking' && [
                    styles.speakingButton,
                    { backgroundColor: colors.successBg, borderColor: colors.success },
                  ],
                ]}
                onPress={() => {
                  if (voiceStatus === 'speaking') {
                    VoiceService.stop();
                    setVoiceStatus('idle');
                  } else {
                    setVoiceStatus('speaking');
                    VoiceService.speak(
                      lastResponse.clean_speech_text,
                      lastResponse.locale || locale,
                      () => setVoiceStatus('idle'),
                      () => setVoiceStatus('idle')
                    );
                  }
                }}
                activeOpacity={0.7}
              >
                <Volume2
                  size={18}
                  color={voiceStatus === 'speaking' ? colors.success : colors.accent}
                />
                <Text
                  style={[
                    styles.replayText,
                    { color: colors.accent },
                    voiceStatus === 'speaking' && [styles.speakingText, { color: colors.success }],
                  ]}
                >
                  {voiceStatus === 'speaking'
                    ? (language === 'te' ? 'ఆపండి / Stop' : 'Stop')
                    : (language === 'te' ? 'మళ్లీ వినండి / Replay' : 'Replay')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Natural Language Response */}
            <Text style={[styles.responseText, { color: colors.textPrimary }]}>
              {lastResponse.message}
            </Text>

            {/* Key Metric Tiles */}
            {lastResponse.weather_data && (
              <View style={[styles.metricsRow, { borderTopColor: colors.border }]}>
                <View style={styles.metricItem}>
                  <Droplets size={16} color={colors.accent} />
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                    తేమ: {lastResponse.weather_data.humidity_pct}%
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Wind size={16} color="#a78bfa" />
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                    గాలి: {lastResponse.weather_data.wind_speed_kmh} km/h
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <CloudRain size={16} color={colors.accent} />
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                    వర్షం: {lastResponse.weather_data.rain_probability_pct}%
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Feature 3: Complete Current Weather Card ──────────────── */}
        <View
          style={[
            styles.currentWeatherCard,
            {
              backgroundColor: colors.surfaceCard,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: colors.isDark ? 0.3 : 0.08,
              shadowRadius: 10,
              elevation: 4,
            },
          ]}
        >
          <View style={styles.currentWeatherTopRow}>
            <View style={styles.currentWeatherMainCol}>
              <View style={styles.weatherLocationHeader}>
                <Text style={[styles.currentLocationTitle, { color: colors.textPrimary }]}>
                  {lastResponse?.location_resolved || location}
                </Text>
                {isGpsLocation && (
                  <View style={styles.gpsMiniChip}>
                    <LocateFixed size={10} color="#10b981" />
                    <Text style={styles.gpsMiniText}>GPS</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.currentConditionText, { color: colors.textSecondary }]}>
                {currentWeather?.condition_text ||
                  (language === 'te' ? 'వాతావరణ వివరాలు' : 'Live Conditions')}
              </Text>

              <Text style={[styles.currentTempLarge, { color: colors.textPrimary }]}>
                {currentWeather?.temperature_c !== undefined
                  ? `${Math.round(currentWeather.temperature_c)}°C`
                  : '--°C'}
              </Text>

              <Text style={[styles.currentFeelsLikeText, { color: colors.textMuted }]}>
                {language === 'te' ? 'అనిపించేది' : 'Feels like'}{' '}
                {currentWeather?.feels_like_c !== undefined
                  ? `${Math.round(currentWeather.feels_like_c)}°C`
                  : '--°C'}
              </Text>
            </View>

            <View style={styles.currentWeatherSideCol}>
              <View style={[styles.weatherIconBubble, { backgroundColor: colors.surfaceElevated }]}>
                {renderWeatherIcon(currentWeather?.condition_code, currentWeather?.is_day ?? true, 46)}
              </View>

              {todayDaily && (
                <View
                  style={[
                    styles.dailyHighLowBox,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.highLowItem}>
                    <ArrowUp size={12} color="#f87171" />
                    <Text style={styles.highValText}>
                      {typeof todayDaily.temp_max_c === 'number' ? `${Math.round(todayDaily.temp_max_c)}°` : '--°'}
                    </Text>
                  </View>
                  <View style={[styles.highLowDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.highLowItem}>
                    <ArrowDown size={12} color="#60a5fa" />
                    <Text style={styles.lowValText}>
                      {typeof todayDaily.temp_min_c === 'number' ? `${Math.round(todayDaily.temp_min_c)}°` : '--°'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* 3 Key Metric Grid Items */}
          <View style={[styles.currentMetricsGrid, { borderTopColor: colors.border }]}>
            <View
              style={[
                styles.metricCard,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <Droplets size={16} color={colors.accent} />
              <Text style={[styles.metricVal, { color: colors.textPrimary }]}>
                {currentWeather?.humidity_pct ?? todayDaily?.humidity_pct ?? 0}%
              </Text>
              <Text style={[styles.metricSub, { color: colors.textMuted }]}>
                {language === 'te' ? 'తేమ' : 'Humidity'}
              </Text>
            </View>

            <View
              style={[
                styles.metricCard,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <Wind size={16} color="#a78bfa" />
              <Text style={[styles.metricVal, { color: colors.textPrimary }]}>
                {currentWeather?.wind_speed_kmh ?? todayDaily?.wind_speed_max_kmh ?? 0} km/h
              </Text>
              <Text style={[styles.metricSub, { color: colors.textMuted }]}>
                {language === 'te' ? 'గాలి వేగం' : 'Wind'}
              </Text>
            </View>

            <View
              style={[
                styles.metricCard,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              <CloudRain size={16} color={colors.accent} />
              <Text style={[styles.metricVal, { color: colors.textPrimary }]}>
                {currentWeather?.rain_probability_pct ?? todayDaily?.rain_probability_pct ?? 0}%
              </Text>
              <Text style={[styles.metricSub, { color: colors.textMuted }]}>
                {language === 'te' ? 'వర్ష సూచన' : 'Rain Chance'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Feature 4: Hourly Forecast (Next 24 Hours) ──────────────── */}
        {next24Hours.length > 0 && (
          <View
            style={[
              styles.forecastSectionCard,
              {
                backgroundColor: colors.surfaceCard,
                borderColor: colors.border,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: colors.isDark ? 0.2 : 0.06,
                shadowRadius: 6,
                elevation: 2,
              },
            ]}
          >
            <View style={styles.forecastSectionHeader}>
              <View style={styles.forecastTitleRow}>
                <Clock size={16} color={colors.accent} />
                <Text style={[styles.forecastTitle, { color: colors.textPrimary }]}>
                  {language === 'te' ? 'గంటల వారీ సూచన (24h)' : 'Hourly Forecast (Next 24h)'}
                </Text>
              </View>
              <Text style={[styles.forecastScrollHint, { color: colors.textMuted }]}>
                {language === 'te' ? 'పక్కకు జరపండి →' : 'Scroll →'}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hourlyList}
            >
              {next24Hours.map((hour, idx) => (
                <View
                  key={hour.time}
                  style={[
                    styles.hourlyItem,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                    idx === 0 && [
                      styles.activeHourlyItem,
                      {
                        backgroundColor: colors.accentBg,
                        borderColor: colors.accent,
                      },
                    ],
                  ]}
                >
                  <Text
                    style={[
                      styles.hourlyTime,
                      { color: colors.textSecondary },
                      idx === 0 && [styles.activeHourlyText, { color: colors.accent }],
                    ]}
                  >
                    {formatHourLabel(hour.time, idx)}
                  </Text>
                  <View style={styles.hourlyIcon}>
                    {renderWeatherIcon(hour.condition_code, hour.is_day, 22)}
                  </View>
                  <Text style={[styles.hourlyTemp, { color: colors.textPrimary }]}>
                    {Math.round(hour.temperature_c)}°
                  </Text>
                  <View style={styles.hourlyRainRow}>
                    <Droplets size={10} color={colors.accent} />
                    <Text style={[styles.hourlyRainText, { color: colors.accent }]}>
                      {hour.rain_probability_pct}%
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Feature 4: 7-Day Multi-day Forecast ──────────────── */}
        {forecastData?.daily && forecastData.daily.length > 0 && (
          <View
            style={[
              styles.forecastSectionCard,
              {
                backgroundColor: colors.surfaceCard,
                borderColor: colors.border,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: colors.isDark ? 0.2 : 0.06,
                shadowRadius: 6,
                elevation: 2,
              },
            ]}
          >
            <View style={styles.forecastSectionHeader}>
              <View style={styles.forecastTitleRow}>
                <Calendar size={16} color={colors.accent} />
                <Text style={[styles.forecastTitle, { color: colors.textPrimary }]}>
                  {language === 'te' ? '7 రోజుల వాతావరణ సూచన' : '7-Day Outlook'}
                </Text>
              </View>
            </View>

            <View style={styles.dailyList}>
              {forecastData.daily.map((day, idx) => (
                <View
                  key={day.date}
                  style={[
                    styles.dailyRow,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.dailyDayCol}>
                    <Text style={[styles.dailyDayName, { color: colors.textPrimary }]}>
                      {formatDayLabel(day.date, idx, language)}
                    </Text>
                    <Text style={[styles.dailyDateSub, { color: colors.textMuted }]}>
                      {formatDateLabel(day.date)}
                    </Text>
                  </View>

                  <View style={styles.dailyConditionCol}>
                    <View style={styles.dailyConditionIcon}>
                      {renderWeatherIcon(day.condition_code, true, 20)}
                    </View>
                    <Text
                      style={[styles.dailyConditionName, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {day.condition_text}
                    </Text>
                  </View>

                  <View style={styles.dailyRainCol}>
                    <Droplets size={11} color={colors.accent} />
                    <Text style={[styles.dailyRainVal, { color: colors.accent }]}>
                      {day.rain_probability_pct}%
                    </Text>
                  </View>

                  <View style={styles.dailyTempsCol}>
                    <Text style={styles.dailyHighVal}>
                      {typeof day.temp_max_c === 'number' ? `${Math.round(day.temp_max_c)}°` : '--°'}
                    </Text>
                    <Text style={styles.dailyLowVal}>
                      {typeof day.temp_min_c === 'number' ? `${Math.round(day.temp_min_c)}°` : '--°'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Voice Chips (1-Tap Speaking Shortcuts) */}
        <View style={styles.quickSection}>
          <Text style={[styles.quickSectionTitle, { color: colors.textSecondary }]}>
            {language === 'te'
              ? 'సులువుగా అడగండి / Quick Questions:'
              : 'Quick Questions:'}
          </Text>
          <View style={styles.chipsRow}>
            {quickChips.map((chip, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.chip,
                  {
                    backgroundColor: colors.chipBg,
                    borderColor: colors.chipBorder,
                  },
                ]}
                activeOpacity={0.7}
                onPress={() => handleQuery(chip.query)}
              >
                <Text style={[styles.chipText, { color: colors.chipText }]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Language Picker Modal */}
      <LanguagePickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />

      {/* Location Picker Modal */}
      <LocationPickerModal
        visible={locationModalVisible}
        onClose={() => {
          setLocationModalVisible(false);
          setHasSelectedLocation(true);
        }}
        onLocationSelected={(loc) => {
          loadWeatherData(loc, language, coordinates);
        }}
      />

      {/* User Profile & Settings Modal */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <TouchableOpacity
          style={[styles.profileModalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setProfileModalVisible(false)}
        >
          <View
            style={[
              styles.profileCard,
              {
                backgroundColor: colors.modalBg,
                borderColor: colors.borderSubtle,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: colors.isDark ? 0.4 : 0.15,
                shadowRadius: 12,
                elevation: 8,
              },
            ]}
          >
            <View
              style={[
                styles.profileAvatar,
                {
                  backgroundColor: colors.accentBg,
                  borderColor: colors.accent,
                },
              ]}
            >
              <Text style={[styles.profileAvatarText, { color: colors.accent }]}>
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </Text>
            </View>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>
              {user?.name || 'WeatherGPT User'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
              {isGuest ? '👤 Guest Farmer Mode' : (user?.email || 'Authenticated Account')}
            </Text>

            {/* Profile Info Details */}
            <View
              style={[
                styles.profileMetaBox,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <View style={styles.profileMetaRow}>
                <Text style={[styles.profileMetaLabel, { color: colors.textMuted }]}>
                  {language === 'te' ? 'భాష / Language:' : 'Language:'}
                </Text>
                <Text style={[styles.profileMetaValue, { color: colors.textPrimary }]}>
                  {nativeLanguageName}
                </Text>
              </View>
              <View style={styles.profileMetaRow}>
                <Text style={[styles.profileMetaLabel, { color: colors.textMuted }]}>
                  {language === 'te' ? 'ప్రాంతం / Location:' : 'Location:'}
                </Text>
                <Text style={[styles.profileMetaValue, { color: colors.textPrimary }]}>
                  {location}
                </Text>
              </View>
            </View>

            {/* Theme Switcher Control (Requirements 1, 2, 3, 9) */}
            <ThemeToggle variant="switch" showLabel={true} />

            {/* Replay Welcome Greeting Button */}
            {onReplayGreeting && (
              <TouchableOpacity
                style={[
                  styles.logoutButton,
                  {
                    backgroundColor: colors.accentBg,
                    borderColor: colors.accentBorder,
                    marginTop: 10,
                  },
                ]}
                onPress={() => {
                  setProfileModalVisible(false);
                  onReplayGreeting();
                }}
                activeOpacity={0.8}
              >
                <Volume2 size={16} color={colors.accent} />
                <Text style={[styles.logoutButtonText, { color: colors.accent }]}>
                  {language === 'te' ? 'స్వాగత సందేశం వినండి 🎙️' : 'Play Welcome Greeting 🎙️'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.logoutButton,
                {
                  backgroundColor: colors.dangerBg,
                  borderColor: colors.dangerBorder,
                  marginTop: 8,
                },
              ]}
              onPress={async () => {
                setProfileModalVisible(false);
                await logout();
                if (onLogout) onLogout();
              }}
              activeOpacity={0.8}
            >
              <LogOut size={16} color={colors.danger} />
              <Text style={[styles.logoutButtonText, { color: colors.danger }]}>
                {language === 'te' ? 'లాగ్ అవుట్ / Log Out' : 'Log Out'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  voiceModeTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 4,
  },
  voiceModeTopBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emergencyBanner: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emergencyTitle: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  emergencyDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  findShelterBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    height: 42,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  findShelterBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  locationText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c2340',
    borderColor: '#0284c7',
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  langText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    maxWidth: 95,
  },
  profilePillText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  profileCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#111827',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    padding: 24,
    alignItems: 'center',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 2,
    borderColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileAvatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#38bdf8',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 18,
  },
  profileMetaBox: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  profileMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileMetaLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  profileMetaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  logoutButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
  },
  logoutButtonText: {
    color: '#f87171',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollArea: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  shortcutCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertShortcut: {
    backgroundColor: '#201600',
    borderColor: '#b45309',
  },
  advisoryShortcut: {
    backgroundColor: '#002012',
    borderColor: '#059669',
  },
  shortcutText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  voiceSection: {
    marginVertical: 10,
    alignItems: 'center',
  },
  textQueryCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    padding: 6,
    marginBottom: 12,
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchIcon: {
    marginLeft: 8,
  },
  textInputField: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  textClearBtn: {
    padding: 4,
  },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    minWidth: 72,
  },
  askButtonDisabled: {
    backgroundColor: '#1e293b',
    opacity: 0.6,
  },
  askButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  responseCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    marginVertical: 12,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  tempText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c2340',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  replayText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  responseText: {
    color: '#f1f5f9',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  quickSection: {
    marginTop: 12,
  },
  quickSectionTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  transcriptBadge: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#0284c7',
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontSize: 15,
    color: '#f8fafc',
    fontWeight: '600',
  },
  userQueryContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
  },
  userQueryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  userQueryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userQueryText: {
    fontSize: 15,
    color: '#f8fafc',
    fontWeight: '600',
  },
  loadingStateCard: {
    backgroundColor: '#131b2e',
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0284c7',
    marginVertical: 12,
  },
  loadingStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
    textAlign: 'center',
  },
  loadingStateSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  errorStateCard: {
    backgroundColor: '#1c1012',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    marginVertical: 12,
  },
  errorStateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  errorStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f87171',
  },
  errorStateDescription: {
    fontSize: 14,
    color: '#fca5a5',
    lineHeight: 20,
    marginBottom: 4,
  },
  errorStateSubtext: {
    fontSize: 12,
    color: '#f87171',
    opacity: 0.8,
    marginBottom: 12,
  },
  errorRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'flex-start',
  },
  errorRetryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  speakingButton: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
    borderWidth: 1,
  },
  speakingText: {
    color: '#34d49a',
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
    borderWidth: 1,
    borderColor: '#059669',
  },
  gpsBadgeText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  currentWeatherCard: {
    backgroundColor: '#111928',
    borderRadius: 22,
    padding: 18,
    marginVertical: 10,
    borderWidth: 1.5,
    borderColor: '#1e293b',
  },
  currentWeatherTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currentWeatherMainCol: {
    flex: 1,
  },
  weatherLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  currentLocationTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  gpsMiniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 2,
  },
  gpsMiniText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '800',
  },
  currentConditionText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  currentTempLarge: {
    color: '#f8fafc',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
    marginVertical: 4,
  },
  currentFeelsLikeText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  currentWeatherSideCol: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 10,
  },
  weatherIconBubble: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dailyHighLowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c1527',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 6,
  },
  highLowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  highLowDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#334155',
  },
  highValText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
  },
  lowValText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
  },
  currentMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#0c1527',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  metricVal: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  metricSub: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  forecastSectionCard: {
    backgroundColor: '#111928',
    borderRadius: 20,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1.5,
    borderColor: '#1e293b',
  },
  forecastSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  forecastTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  forecastTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  forecastScrollHint: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  hourlyList: {
    gap: 10,
    paddingVertical: 4,
  },
  hourlyItem: {
    width: 72,
    backgroundColor: '#0c1527',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  activeHourlyItem: {
    borderColor: '#0284c7',
    backgroundColor: '#082f49',
  },
  hourlyTime: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  activeHourlyText: {
    color: '#38bdf8',
  },
  hourlyIcon: {
    marginVertical: 4,
  },
  hourlyTemp: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    marginVertical: 2,
  },
  hourlyRainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  hourlyRainText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  dailyList: {
    gap: 8,
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c1527',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  dailyDayCol: {
    width: 80,
  },
  dailyDayName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  dailyDateSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  dailyConditionCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  dailyConditionIcon: {
    width: 26,
    alignItems: 'center',
  },
  dailyConditionName: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  dailyRainCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    width: 44,
    justifyContent: 'center',
  },
  dailyRainVal: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  dailyTempsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 54,
    justifyContent: 'flex-end',
  },
  dailyHighVal: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '800',
  },
  dailyLowVal: {
    color: '#60a5fa',
    fontSize: 13,
    fontWeight: '700',
  },
});

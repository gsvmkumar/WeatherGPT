/**
 * VoiceAssistantScreen — Primary Highlight: Voice-First Weather & Emergency Assistant.
 *
 * Immersive voice interface designed for Indian languages and non-literate accessibility:
 * - Giant glowing microphone visualizer with pulsing ripple animations
 * - Live transcript & spoken responses
 * - Voice command intent routing (Mode, Language, Stop, Replay, Shelters)
 * - Emergency shelter voice integration
 * - One-tap toggle to Classic Mode
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import {
  Mic,
  Volume2,
  Square,
  RotateCcw,
  Sparkles,
  MapPin,
  Globe,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
} from 'lucide-react-native';
import { useMobileStore } from '../store/useMobileStore';
import { WeatherApi } from '../services/api';
import { VoiceService, WELCOME_MESSAGES } from '../services/voice';
import { resolveResponseCommand, detectVoiceCommand } from '../services/voiceCommands';
import { LanguagePickerModal } from './LanguagePickerModal';
import { LocationPickerModal } from './LocationPickerModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { getThemeColors } from '../theme/theme';

interface VoiceAssistantScreenProps {
  onSwitchToClassic: () => void;
  onNavigateShelters: () => void;
  onNavigateAlerts: () => void;
  initialGreetingPending?: boolean;
}

export const VoiceAssistantScreen: React.FC<VoiceAssistantScreenProps> = ({
  onSwitchToClassic,
  onNavigateShelters,
  onNavigateAlerts,
  initialGreetingPending = false,
}) => {
  const {
    location,
    coordinates,
    language,
    locale,
    nativeLanguageName,
    setLanguage,
    voiceStatus,
    setVoiceStatus,
    currentTranscript,
    setCurrentTranscript,
    lastResponse,
    setLastResponse,
    theme,
  } = useMobileStore();

  const colors = getThemeColors(theme);

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pulse animation for mic visualizer
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (voiceStatus === 'listening' || voiceStatus === 'speaking') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.timing(rippleAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      ).start();
    } else {
      pulseAnim.setValue(1);
      rippleAnim.setValue(0);
    }
  }, [voiceStatus]);

  const hasSpokenGreetingRef = useRef(false);

  // Clean up recording timer and voice playback on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
      }
      VoiceService.stop();
    };
  }, []);

  // Dedicated listening function: checks mic permission, prepares hardware, starts recording
  const startListening = async () => {
    try {
      // 1. Ensure TTS is stopped before opening mic to prevent self-capture
      if (VoiceService.getSpeakingState()) {
        VoiceService.stop();
      }

      setErrorMessage(null);

      // 2. Microphone permission verification
      const hasPermission = await VoiceService.checkMicrophonePermission();
      if (!hasPermission) {
        const granted = await VoiceService.requestMicrophonePermission();
        if (!granted) {
          setVoiceStatus('error');
          setErrorMessage(
            language === 'te'
              ? 'మైక్రోఫోన్ అనుమతి అవసరం. క్లాసిక్ మోడ్‌కి మారుతున్నాను.'
              : 'Microphone permission needed. Switching to Classic Mode.'
          );
          setTimeout(() => {
            onSwitchToClassic();
          }, 2000);
          return;
        }
      }

      // 3. Start high-quality microphone recording
      const started = await VoiceService.startRecording();
      if (started) {
        setVoiceStatus('listening');

        if (recordingTimerRef.current) {
          clearTimeout(recordingTimerRef.current);
        }

        // Auto-stop after 8 seconds of speech if user doesn't tap to stop
        recordingTimerRef.current = setTimeout(async () => {
          if (VoiceService.isRecording()) {
            await finishRecordingAndProcess();
          }
        }, 8000);
      } else {
        setVoiceStatus('error');
        setErrorMessage(
          language === 'te'
            ? 'మైక్రోఫోన్ ప్రారంభం కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.'
            : 'Could not activate microphone. Please tap to speak.'
        );
        setTimeout(() => setVoiceStatus('idle'), 2500);
      }
    } catch (e) {
      console.error('[VoiceAssistant] startListening error:', e);
      setVoiceStatus('error');
      setTimeout(() => setVoiceStatus('idle'), 2500);
    }
  };

  // Initial Voice Greeting: speaks personalized greeting -> onDone native event starts listening!
  useEffect(() => {
    if (initialGreetingPending && !hasSpokenGreetingRef.current) {
      hasSpokenGreetingRef.current = true;
      const welcomeObj = WELCOME_MESSAGES[language] || WELCOME_MESSAGES.en;

      // Transition to SPEAKING state (mic muted)
      setVoiceStatus('speaking');
      setCurrentTranscript(welcomeObj.speech);

      VoiceService.speak(
        welcomeObj.speech,
        locale,
        () => {
          // Native TTS onDone: AI finished speaking, cleanly enter LISTENING state!
          startListening();
        },
        (err) => {
          console.warn('[VoiceAssistant] Greeting TTS error, transitioning to listen:', err);
          startListening();
        }
      );
    }
  }, [initialGreetingPending, language, locale]);

  // Handle Voice Button Tap: Listen -> Process -> Speak
  const handleVoicePress = async () => {
    // 1. If speaking, tap stops audio playback immediately
    if (voiceStatus === 'speaking') {
      VoiceService.stop();
      setVoiceStatus('idle');
      return;
    }

    // 2. If listening, tap stops recording and immediately processes query
    if (voiceStatus === 'listening') {
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      await finishRecordingAndProcess();
      return;
    }

    // 3. If idle or error, tap starts listening
    if (voiceStatus === 'idle' || voiceStatus === 'error') {
      await startListening();
    }
  };

  // Stop recording and send audio to backend Gemini agent for transcription and intent resolution
  const finishRecordingAndProcess = async () => {
    try {
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      setErrorMessage(null);
      setVoiceStatus('processing');
      const uri = await VoiceService.stopRecording();
      if (!uri) {
        setVoiceStatus('error');
        setErrorMessage(
          language === 'te'
            ? 'రికార్డింగ్ విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.'
            : 'Recording audio failed. Please try again.'
        );
        setTimeout(() => setVoiceStatus('idle'), 2000);
        return;
      }

      // Send audio to backend for Gemini transcription + dynamic intent understanding
      const res = await WeatherApi.sendAudioQuery(uri, language, location);
      const transcriptText = res.recognized_text || res.message;

      if (transcriptText) {
        setCurrentTranscript(transcriptText);
      }

      // ── Dynamic Intent Understanding & Command Routing ─────────────────────
      // Primary: backend AI-classified intent. Secondary: local semantic check
      const command = resolveResponseCommand(res, language);
      if (command.isCommand) {
        handleVoiceCommand(command);
        return;
      }

      // Standard Weather / AI Response: Speak response -> automatically resume listening!
      setLastResponse(res);
      setVoiceStatus('speaking');

      VoiceService.speak(
        res.clean_speech_text || res.message,
        res.locale || locale,
        () => {
          // Continuous Voice Loop: After AI speaks response, automatically listen for follow-up!
          startListening();
        },
        () => {
          setVoiceStatus('idle');
        }
      );
    } catch (error: any) {
      console.error('Voice Assistant Error:', error);
      setVoiceStatus('error');
      setErrorMessage(
        error?.message ||
          (language === 'te'
            ? 'సర్వర్ కనెక్ట్ కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.'
            : 'Could not connect to the WeatherGPT backend.')
      );
      setTimeout(() => setVoiceStatus('idle'), 3000);
    }
  };

  // Execute detected voice command / UI action
  const handleVoiceCommand = (command: any) => {
    if (command.commandType === 'STOP_SPEECH') {
      VoiceService.stop();
      setVoiceStatus('idle');
      return;
    }

    if (command.commandType === 'REPLAY_SPEECH') {
      if (lastResponse?.clean_speech_text) {
        setVoiceStatus('speaking');
        VoiceService.speak(
          lastResponse.clean_speech_text,
          lastResponse.locale || locale,
          () => startListening(),
          () => setVoiceStatus('idle')
        );
      } else {
        setVoiceStatus('idle');
      }
      return;
    }

    if (command.commandType === 'SWITCH_MODE_CLASSIC') {
      setVoiceStatus('speaking');
      const ackText =
        command.feedbackText ||
        (language === 'te' ? 'క్లాసిక్ మోడ్‌కి మారుతున్నాను.' : 'Switching to Classic Mode.');

      VoiceService.speak(
        ackText,
        locale,
        () => onSwitchToClassic(),
        () => onSwitchToClassic()
      );
      return;
    }

    if (command.commandType === 'SWITCH_MODE_VOICE') {
      setVoiceStatus('speaking');
      const ackText =
        command.feedbackText ||
        (language === 'te'
          ? 'వాయిస్ అసిస్టెంట్ సిద్ధంగా ఉంది. వాతావరణం గురించి ఏదైనా అడగండి.'
          : 'Voice Assistant is active. What would you like to know about the weather?');

      VoiceService.speak(
        ackText,
        locale,
        () => startListening(),
        () => startListening()
      );
      return;
    }

    if (command.commandType === 'SHOW_SAFE_SHELTERS') {
      setVoiceStatus('speaking');
      const ackText =
        command.feedbackText ||
        (language === 'te'
          ? 'సమీపంలోని సురక్షిత ఆశ్రయాల వివరాలు చూపిస్తున్నాను.'
          : 'Showing nearby verified safe emergency shelters.');

      VoiceService.speak(
        ackText,
        locale,
        () => onNavigateShelters(),
        () => onNavigateShelters()
      );
      return;
    }

    if (command.commandType === 'OPEN_LOCATION_PICKER') {
      setLocationModalVisible(true);
      if (command.feedbackText) {
        setVoiceStatus('speaking');
        VoiceService.speak(
          command.feedbackText,
          locale,
          () => setVoiceStatus('idle'),
          () => setVoiceStatus('idle')
        );
      } else {
        setVoiceStatus('idle');
      }
      return;
    }

    if (command.commandType === 'SWITCH_LANGUAGE' && command.payload) {
      const p = command.payload;
      setLanguage(p.code, p.locale, p.nativeName);
      setVoiceStatus('speaking');
      const ackText =
        command.feedbackText ||
        (p.code === 'te' ? 'భాష తెలుగుగా మార్చబడింది.' : 'Language updated.');

      VoiceService.speak(
        ackText,
        p.locale,
        () => startListening(),
        () => startListening()
      );
      return;
    }

    // Default: Return to listening
    setVoiceStatus('idle');
  };

  // Quick prompt chip press
  const handlePromptPress = async (queryText: string) => {
    if (voiceStatus === 'processing' || voiceStatus === 'listening') return;
    try {
      setErrorMessage(null);
      setCurrentTranscript(queryText);
      setVoiceStatus('processing');
      VoiceService.stop();

      const res = await WeatherApi.sendVoiceQuery({
        message: queryText,
        language: language,
        location: location,
      });

      const cmd = resolveResponseCommand(res, language);
      if (cmd.isCommand) {
        handleVoiceCommand(cmd);
        return;
      }

      setLastResponse(res);
      setVoiceStatus('speaking');
      VoiceService.speak(
        res.clean_speech_text || res.message,
        res.locale || locale,
        () => startListening(),
        () => setVoiceStatus('idle')
      );
    } catch (e: any) {
      setVoiceStatus('error');
      setErrorMessage('Could not complete query.');
      setTimeout(() => setVoiceStatus('idle'), 2500);
    }
  };

  // Multilingual quick chips
  const quickChips = [
    {
      label: language === 'te' ? 'ఈరోజు ఎండ / వర్షం?' : language === 'hi' ? 'आज का मौसम?' : "Today's Weather",
      query: language === 'te' ? 'ఈరోజు వాతావరణం ఎలా ఉంది?' : language === 'hi' ? 'आज का मौसम कैसा रहेगा?' : 'What is the weather today?',
    },
    {
      label: language === 'te' ? 'రేపు వర్షం పడుతుందా?' : language === 'hi' ? 'क्या कल बारिश होगी?' : 'Rain Tomorrow?',
      query: language === 'te' ? 'రేపు వర్షం పడే అవకాశం ఉందా?' : language === 'hi' ? 'क्या कल बारिश होगी?' : 'Will it rain tomorrow?',
    },
    {
      label: language === 'te' ? '🛡️ సురక్షిత ఆశ్రయాలు' : language === 'hi' ? '🛡️ सुरक्षित आश्रय' : '🛡️ Safe Shelters',
      query: 'show nearby shelters',
      action: onNavigateShelters,
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Bar with Mode Switcher */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.locationChip, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
          onPress={() => setLocationModalVisible(true)}
          activeOpacity={0.8}
        >
          <MapPin size={16} color={colors.accent} />
          <Text style={[styles.locationChipText, { color: colors.textPrimary }]} numberOfLines={1}>
            {location}
          </Text>
        </TouchableOpacity>

        <View style={styles.topRightGroup}>
          <TouchableOpacity
            style={[styles.langChip, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
            onPress={() => setLanguageModalVisible(true)}
            activeOpacity={0.8}
          >
            <Globe size={14} color={colors.textSecondary} />
            <Text style={[styles.langChipText, { color: colors.textPrimary }]}>{nativeLanguageName}</Text>
          </TouchableOpacity>

          <ThemeToggle variant="compact" />
        </View>
      </View>

      {/* Mode Switch Banner */}
      <View style={styles.modeBanner}>
        <TouchableOpacity
          style={[styles.switchClassicBtn, { backgroundColor: colors.surfaceCard, borderColor: colors.accent }]}
          onPress={onSwitchToClassic}
          activeOpacity={0.8}
        >
          <MessageSquare size={16} color={colors.accent} />
          <Text style={[styles.switchClassicText, { color: colors.accent }]}>
            {language === 'te' ? 'క్లాసిక్ మోడ్ కి మారండి 📱' : 'Switch to Classic Mode 📱'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Error Alert */}
        {errorMessage && (
          <View style={[styles.errorBox, { backgroundColor: '#ef444418', borderColor: '#ef444460' }]}>
            <AlertTriangle size={18} color="#ef4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Live Transcript / Response Section */}
        <View style={styles.dialogueSection}>
          {currentTranscript ? (
            <View
              style={[
                styles.userBubble,
                { backgroundColor: colors.surfaceCard, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.bubbleLabel, { color: colors.accent }]}>
                {language === 'te' ? 'మీరు అడిగినది:' : 'You asked:'}
              </Text>
              <Text style={[styles.userText, { color: colors.textPrimary }]}>
                "{currentTranscript}"
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.promptBubble,
                { backgroundColor: colors.surfaceCard, borderColor: colors.borderSubtle },
              ]}
            >
              <Sparkles size={20} color={colors.accent} />
              <Text style={[styles.promptTitle, { color: colors.textPrimary }]}>
                {language === 'te' ? 'ఏదైనా అడగండి...' : 'Ask me anything about the weather...'}
              </Text>
              <Text style={[styles.promptSubtitle, { color: colors.textSecondary }]}>
                {language === 'te'
                  ? 'వర్షం, ఎండ, వ్యవసాయ సలహాలు, లేదా సమీప రక్షణ ఆశ్రయాల గురించి అడగండి.'
                  : 'Ask about rainfall, forecasts, farm advisories, or nearby emergency shelters.'}
              </Text>
            </View>
          )}

          {/* AI Response Card */}
          {lastResponse && (
            <View
              style={[
                styles.assistantCard,
                { backgroundColor: colors.accentBg, borderColor: colors.accentBorder },
              ]}
            >
              <View style={styles.assistantCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={16} color={colors.accent} />
                  <Text style={[styles.assistantTitle, { color: colors.textPrimary }]}>WeatherGPT AI</Text>
                </View>

                {voiceStatus === 'speaking' ? (
                  <TouchableOpacity
                    style={[styles.playbackBtn, { backgroundColor: '#ef444420' }]}
                    onPress={() => {
                      VoiceService.stop();
                      setVoiceStatus('idle');
                    }}
                  >
                    <Square size={13} color="#ef4444" />
                    <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '700' }}>Stop</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.playbackBtn, { backgroundColor: colors.accentBg }]}
                    onPress={() => {
                      setVoiceStatus('speaking');
                      VoiceService.speak(
                        lastResponse.clean_speech_text,
                        lastResponse.locale || locale,
                        () => setVoiceStatus('idle'),
                        () => setVoiceStatus('idle')
                      );
                    }}
                  >
                    <RotateCcw size={13} color={colors.accent} />
                    <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>Replay</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.assistantText, { color: colors.textPrimary }]}>
                {lastResponse.message}
              </Text>
            </View>
          )}
        </View>

        {/* Giant Glowing Animated Microphone Visualizer */}
        <View style={styles.micCenterSection}>
          {/* Ripple animation circle */}
          {(voiceStatus === 'listening' || voiceStatus === 'speaking') && (
            <Animated.View
              style={[
                styles.rippleRing,
                {
                  borderColor: voiceStatus === 'listening' ? '#ef4444' : colors.accent,
                  transform: [
                    {
                      scale: rippleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.8],
                      }),
                    },
                  ],
                  opacity: rippleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 0],
                  }),
                },
              ]}
            />
          )}

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.giantMicButton,
                {
                  backgroundColor:
                    voiceStatus === 'listening'
                      ? '#ef4444'
                      : voiceStatus === 'speaking'
                      ? '#10b981'
                      : voiceStatus === 'processing'
                      ? colors.warning
                      : colors.accent,
                },
              ]}
              onPress={handleVoicePress}
              activeOpacity={0.85}
            >
              {voiceStatus === 'processing' ? (
                <ActivityIndicator size="large" color="#0f172a" />
              ) : voiceStatus === 'speaking' ? (
                <Volume2 size={44} color="#0f172a" />
              ) : (
                <Mic size={44} color="#0f172a" />
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Status Label */}
          <Text style={[styles.statusLabel, { color: colors.textPrimary }]}>
            {voiceStatus === 'listening'
              ? language === 'te'
                ? 'వింటున్నాను... మాట్లాడండి'
                : 'Listening... Speak now'
              : voiceStatus === 'processing'
              ? language === 'te'
                ? 'ఆలోచిస్తున్నాను...'
                : 'Understanding query...'
              : voiceStatus === 'speaking'
              ? language === 'te'
                ? 'సమాధానం చెబుతున్నాను...'
                : 'Speaking response...'
              : language === 'te'
              ? 'మాట్లాడేందుకు మైక్ నొక్కండి'
              : 'Tap to speak'}
          </Text>
          <Text style={[styles.hintSubtext, { color: colors.textSecondary }]}>
            {language === 'te'
              ? 'వాతావరణం లేదా సురక్షిత ఆశ్రయాల గురించి అడగండి'
              : 'Ask weather questions or "Where is the nearest safe shelter?"'}
          </Text>
        </View>

        {/* Quick Voice Chips */}
        <View style={styles.quickChipsRow}>
          {quickChips.map((c, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.chipBtn,
                { backgroundColor: colors.surfaceCard, borderColor: colors.border },
              ]}
              onPress={() => {
                if (c.action) {
                  c.action();
                } else {
                  handlePromptPress(c.query);
                }
              }}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, { color: colors.textPrimary }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Modals */}
      <LanguagePickerModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />
      <LocationPickerModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    maxWidth: 160,
  },
  locationChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  topRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modeBanner: {
    paddingHorizontal: 16,
    paddingTop: 10,
    alignItems: 'center',
  },
  switchClassicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 8,
  },
  switchClassicText: {
    fontSize: 13,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  dialogueSection: {
    marginTop: 16,
    gap: 12,
  },
  userBubble: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  bubbleLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  userText: {
    fontSize: 15,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  promptBubble: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    alignItems: 'center',
    textAlign: 'center',
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  promptSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  assistantCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  assistantCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assistantTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  playbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  assistantText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  micCenterSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 28,
    position: 'relative',
  },
  rippleRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  giantMicButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  statusLabel: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 16,
  },
  hintSubtext: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  chipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

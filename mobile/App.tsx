/**
 * WeatherGPT Mobile — Entry Point
 * Voice-First, Mobile-First Weather Application for India.
 * Elevates the Multilingual Voice Assistant as the primary highlight with
 * seamless Voice Mode ↔ Classic Mode switching, verified safe shelters, and persistent sessions.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Appearance,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Mic, MessageSquare, CloudSun, Sparkles } from 'lucide-react-native';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { VoiceAssistantScreen } from './src/screens/VoiceAssistantScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { AlertsScreen } from './src/screens/AlertsScreen';
import { AdvisoryScreen } from './src/screens/AdvisoryScreen';
import { SheltersScreen } from './src/screens/SheltersScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { useMobileStore, AuthMode } from './src/store/useMobileStore';
import { StorageService } from './src/services/storage';
import { VoiceService } from './src/services/voice';
import { getThemeColors } from './src/theme/theme';

type ScreenType =
  | 'login'
  | 'register'
  | 'onboarding'
  | 'voice_mode'
  | 'classic_mode'
  | 'alerts'
  | 'advisory'
  | 'shelters'
  | 'history';


const WELCOME_MESSAGES: Record<
  string,
  { speech: string; title: string; subtitle: string; voiceBtn: string; classicBtn: string }
> = {
  te: {
    speech: 'WeatherGPT కి స్వాగతం. నేను Voice Assistant గా కొనసాగనా, లేదా Classic Mode కి వెళ్లాలా?',
    title: 'WeatherGPT కి స్వాగతం! 🎙️',
    subtitle: 'మీ వాతావరణ అనుభవాన్ని ఎంచుకోండి:',
    voiceBtn: '🎙️ Voice Assistant గా కొనసాగండి',
    classicBtn: '📱 Classic Mode ఉపయోగించండి',
  },
  hi: {
    speech: 'WeatherGPT में आपका स्वागत है। क्या मैं Voice Assistant के रूप में जारी रखूँ या Classic Mode में जाऊँ?',
    title: 'WeatherGPT में स्वागत है! 🎙️',
    subtitle: 'अपना मौसम अनुभव चुनें:',
    voiceBtn: '🎙️ Voice Assistant जारी रखें',
    classicBtn: '📱 Classic Mode का उपयोग करें',
  },
  ta: {
    speech: 'WeatherGPT-க்கு வரவேற்கிறோம். நான் உங்கள் Voice Assistant ஆக தொடரவா அல்லது Classic Mode-க்கு செல்ல வேண்டுமா?',
    title: 'WeatherGPT-க்கு வரவேற்கிறோம்! 🎙️',
    subtitle: 'உங்கள் அனுபவத்தைத் தேர்ந்தெடுக்கவும்:',
    voiceBtn: '🎙️ Voice Assistant ஆக தொடரவும்',
    classicBtn: '📱 Classic Mode பயன்படுத்தவும்',
  },
  kn: {
    speech: 'WeatherGPT ಗೆ ಸುಸ್ವಾಗತ. ನಾನು ನಿಮ್ಮ Voice Assistant ಆಗಿ ಮುಂದುವರಿಯಲೇ ಅಥವಾ Classic Mode ಗೆ ಹೋಗಲು ಬಯಸುತ್ತೀರಾ?',
    title: 'WeatherGPT ಗೆ ಸುಸ್ವಾಗತ! 🎙️',
    subtitle: 'ನಿಮ್ಮ ಅನುಭವವನ್ನು ಆರಿಸಿ:',
    voiceBtn: '🎙️ Voice Assistant ಮುಂದುವರಿಸಿ',
    classicBtn: '📱 Classic Mode ಬಳಸಿ',
  },
  ml: {
    speech: 'WeatherGPT-ലേക്ക് സ്വാഗതം. ഞാൻ നിങ്ങളുടെ Voice Assistant ആയി തുടരണോ അതో Classic Mode-ലേക്ക് പോകണോ?',
    title: 'WeatherGPT-ലേക്ക് സ്വാഗതം! 🎙️',
    subtitle: 'നിങ്ങളുടെ മോഡ് തിരഞ്ഞെടുക്കുക:',
    voiceBtn: '🎙️ Voice Assistant ആയി തുടരുക',
    classicBtn: '📱 Classic Mode ഉപയോഗിക്കുക',
  },
  mr: {
    speech: 'WeatherGPT मध्ये आपले स्वागत आहे. मी Voice Assistant म्हणून सुरू ठेवू की आपण Classic Mode वापरू इच्छिता?',
    title: 'WeatherGPT मध्ये स्वागत! 🎙️',
    subtitle: 'आपला अनुभव निवडा:',
    voiceBtn: '🎙️ Voice Assistant सुरू ठेवा',
    classicBtn: '📱 Classic Mode वापरा',
  },
  bn: {
    speech: 'WeatherGPT-তে আপনাকে স্বাগতম। আমি কি আপনার Voice Assistant হিসেবে চালিয়ে যাব নাকি আপনি Classic Mode ব্যবহার করতে চান?',
    title: 'WeatherGPT-তে স্বাগতম! 🎙️',
    subtitle: 'আপনার পছন্দের মোড নির্বাচন করুন:',
    voiceBtn: '🎙️ Voice Assistant হিসেবে চালিয়ে যান',
    classicBtn: '📱 Classic Mode ব্যবহার করুন',
  },
  en: {
    speech: 'Welcome to WeatherGPT. Shall I continue as your Voice Assistant, or would you like to use Classic Mode?',
    title: 'Welcome to WeatherGPT! 🎙️',
    subtitle: 'Choose your preferred experience:',
    voiceBtn: '🎙️ Continue as Voice Assistant',
    classicBtn: '📱 Use Classic Mode',
  },
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('login');
  const [previousScreen, setPreviousScreen] = useState<ScreenType>('voice_mode');
  const [isInitializing, setIsInitializing] = useState(true);
  const [initialGreetingPending, setInitialGreetingPending] = useState(false);

  const { theme, setTheme, setAuth, authMode, setAuthMode, language, locale } = useMobileStore();
  const colors = getThemeColors(theme);

  useEffect(() => {
    restoreSession();
  }, []);

  // Restore authenticated session & theme preference from encrypted device storage on app boot
  const restoreSession = async () => {
    try {
      const [savedToken, savedUser, savedMode, savedTheme] = await Promise.all([
        StorageService.getToken(),
        StorageService.getUser(),
        StorageService.getAuthMode(),
        StorageService.getTheme(),
      ]);

      // 1. Detect saved theme or fallback to device/system theme
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        const systemScheme = Appearance.getColorScheme();
        setTheme(systemScheme === 'light' ? 'light' : 'dark');
      }

      // 2. Restore interaction mode
      if (savedMode) {
        setAuthMode(savedMode);
      }

      // 3. Restore user authentication session
      if (savedToken && savedUser) {
        setAuth(savedToken, savedUser, !!savedUser.is_guest);
        // Returning user: open preferred mode directly
        if (savedMode === 'classic') {
          setCurrentScreen('classic_mode');
        } else {
          setCurrentScreen('voice_mode');
        }
      } else {
        setCurrentScreen('login');
      }
    } catch (e) {
      console.log('Session restore error:', e);
      setCurrentScreen('login');
    } finally {
      setIsInitializing(false);
    }
  };

  // Triggered when new user completes Onboarding: activates Voice Mode with initial voice greeting & auto-listen
  const handleOnboardingComplete = () => {
    setAuthMode('voice');
    setInitialGreetingPending(true);
    setCurrentScreen('voice_mode');
  };

  const navigateTo = (screen: ScreenType) => {
    setPreviousScreen(currentScreen);
    setCurrentScreen(screen);
  };

  if (isInitializing) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colors.statusBar} backgroundColor={colors.statusBg} />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const welcomeContent = WELCOME_MESSAGES[language] || WELCOME_MESSAGES.en;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.statusBg} />

      {/* Screen 1: Mobile Login ("Welcome Back") */}
      {currentScreen === 'login' && (
        <LoginScreen
          onLoggedIn={(isNewUser) => {
            if (isNewUser) {
              navigateTo('onboarding');
            } else {
              navigateTo(authMode === 'classic' ? 'classic_mode' : 'voice_mode');
            }
          }}
          onNavigateRegister={() => {
            navigateTo('register');
          }}
          onContinueGuest={() => {
            handleOnboardingComplete();
          }}
        />
      )}

      {/* Screen 2: Mobile Registration ("Create your WeatherGPT Account") */}
      {currentScreen === 'register' && (
        <RegisterScreen
          onRegistered={() => {
            navigateTo('onboarding');
          }}
          onNavigateLogin={() => {
            navigateTo('login');
          }}
        />
      )}

      {/* Screen 3: Profile Setup Onboarding (Location -> Language -> Notifications) */}
      {currentScreen === 'onboarding' && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}

      {/* Screen 4: Voice Assistant Screen (Primary Highlight — Voice Mode) */}
      {currentScreen === 'voice_mode' && (
        <VoiceAssistantScreen
          onSwitchToClassic={() => {
            setInitialGreetingPending(false);
            setAuthMode('classic');
            navigateTo('classic_mode');
          }}
          onNavigateShelters={() => navigateTo('shelters')}
          onNavigateAlerts={() => navigateTo('alerts')}
          initialGreetingPending={initialGreetingPending}
        />
      )}

      {/* Screen 5: WeatherGPT Home Screen (Classic Mode) */}
      {currentScreen === 'classic_mode' && (
        <HomeScreen
          onSwitchToVoice={() => {
            setInitialGreetingPending(false);
            setAuthMode('voice');
            navigateTo('voice_mode');
          }}
          onNavigateAlerts={() => navigateTo('alerts')}
          onNavigateAdvisory={() => navigateTo('advisory')}
          onNavigateShelters={() => navigateTo('shelters')}
          onNavigateHistory={() => navigateTo('history')}
          onLogout={() => navigateTo('login')}
          onReplayGreeting={handleOnboardingComplete}
        />
      )}

      {/* Screen 6: Severe Weather Alerts */}
      {currentScreen === 'alerts' && (
        <AlertsScreen
          onBack={() => navigateTo(previousScreen || 'classic_mode')}
          onNavigateShelters={() => navigateTo('shelters')}
        />
      )}

      {/* Screen 7: Agricultural Advisories */}
      {currentScreen === 'advisory' && (
        <AdvisoryScreen onBack={() => navigateTo('classic_mode')} />
      )}

      {/* Screen 8: Emergency Safe Shelters & Map */}
      {currentScreen === 'shelters' && (
        <SheltersScreen onBack={() => navigateTo(previousScreen || 'classic_mode')} />
      )}

      {/* Screen 9: 30-Day Historical Weather Analysis */}
      {currentScreen === 'history' && (
        <HistoryScreen onBack={() => navigateTo('classic_mode')} />
      )}
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  modalLogoRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  modalLogoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: -4,
  },
  modeChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  classicChoiceBtn: {
    borderWidth: 1.5,
  },
  modeChoiceBtnTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  modeChoiceBtnDesc: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
});

/**
 * Giant Voice Trigger Button for Rural Accessibility
 * Extra-large 140px touch target with high-contrast animated feedback for:
 * - IDLE: Pulsing blue radar (Tap to speak)
 * - LISTENING: Animated crimson beacon
 * - PROCESSING: Amber rotating halo
 * - SPEAKING: Emerald green audio wave
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Mic, Volume2, Loader2, Square } from 'lucide-react-native';
import { VoiceStatus } from '../store/useMobileStore';

interface Props {
  status: VoiceStatus;
  onPress: () => void;
  language: string;
}

const STATUS_LABELS: Record<string, Record<VoiceStatus, string>> = {
  te: {
    idle: 'మాట్లాడటానికి తాకండి',
    listening: 'వింటోంది... మాట్లాడండి',
    processing: 'సమాధానం సిద్ధం చేస్తోంది...',
    speaking: 'సమాధానం ఇస్తోంది... (ఆపడానికి తాకండి)',
    error: 'మళ్లీ ప్రయత్నించండి',
  },
  en: {
    idle: 'Tap to Speak',
    listening: 'Listening... Speak now',
    processing: 'Processing weather query...',
    speaking: 'Speaking answer... (Tap to stop)',
    error: 'Try again',
  },
  hi: {
    idle: 'बोलने के लिए दबाएं',
    listening: 'सुन रहा है... बोलिए',
    processing: 'मौसम जानकारी तैयार हो रही है...',
    speaking: 'बोल रहा है... (रोकने के लिए दबाएं)',
    error: 'पुनः प्रयास करें',
  },
  ta: {
    idle: 'பேச தொடவும்',
    listening: 'கேட்கிறது... பேசுங்கள்',
    processing: 'தயாராகிறது...',
    speaking: 'பேசுகிறது... (நிறுத்த தொடவும்)',
    error: 'மீண்டும் முயற்சிக்கவும்',
  },
  kn: {
    idle: 'ಮಾತನಾಡಲು ಒತ್ತಿರಿ',
    listening: 'ಕೇಳುತ್ತಿದೆ... ಮಾತನಾಡಿ',
    processing: 'ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ...',
    speaking: 'ಮಾತನಾಡುತ್ತಿದೆ... (ನಿಲ್ಲಿಸಲು ಒತ್ತಿರಿ)',
    error: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
  },
  ml: {
    idle: 'സംസാരിക്കാൻ തൊടുക',
    listening: 'കേൾക്കുന്നു... സംസാരിക്കൂ',
    processing: 'തയ്യാറാക്കുന്നു...',
    speaking: 'പറയുന്നു... (നിർത്താൻ തൊടുക)',
    error: 'വീണ്ടും ശ്രമിക്കുക',
  },
  mr: {
    idle: 'बोलण्यासाठी स्पर्श करा',
    listening: 'ऐकत आहे... बोला',
    processing: 'माहिती तयार होत आहे...',
    speaking: 'उत्तर देत आहे... (थांबवण्यासाठी दाबा)',
    error: 'पुन्हा प्रयत्न करा',
  },
  bn: {
    idle: 'কথা বলতে স্পর্শ করুন',
    listening: 'শুনছে... কথা বলুন',
    processing: 'প্রক্রিয়াকরণ হচ্ছে...',
    speaking: 'উত্তর দিচ্ছে... (থামাতে স্পর্শ করুন)',
    error: 'আবার চেষ্টা করুন',
  },
};

export const VoiceTriggerButton: React.FC<Props> = ({ status, onPress, language }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'listening' || status === 'speaking') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  const getThemeColor = () => {
    switch (status) {
      case 'listening':
        return '#ef4444'; // Red beacon
      case 'processing':
        return '#f59e0b'; // Amber
      case 'speaking':
        return '#10b981'; // Emerald
      case 'error':
        return '#dc2626';
      default:
        return '#0284c7'; // Vibrant Sky Blue
    }
  };

  const activeColor = getThemeColor();
  const langDict = STATUS_LABELS[language] || STATUS_LABELS.en;
  const label = langDict[status] || langDict.idle;

  return (
    <View style={styles.container}>
      {/* Outer Pulse Ring */}
      <Animated.View
        style={[
          styles.outerRing,
          {
            borderColor: activeColor,
            transform: [{ scale: pulseAnim }],
            opacity: status === 'idle' ? 0.3 : 0.8,
          },
        ]}
      />

      {/* Main Touch Target Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[styles.button, { backgroundColor: activeColor }]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {status === 'speaking' ? (
          <Volume2 size={56} color="#ffffff" />
        ) : status === 'processing' ? (
          <Loader2 size={56} color="#ffffff" />
        ) : status === 'listening' ? (
          <Square size={48} color="#ffffff" />
        ) : (
          <Mic size={56} color="#ffffff" />
        )}
      </TouchableOpacity>

      {/* Large readable label underneath for rural users */}
      <Text style={[styles.statusText, { color: activeColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  outerRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 3,
  },
  button: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  statusText: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});

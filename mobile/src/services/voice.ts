/**
 * Voice Hardware Bridge — Text-to-Speech (TTS) and Speech-to-Text (STT) service
 * Configured specifically for 8 Indian language locales.
 * Integrates expo-speech for loud speech synthesis and expo-av for microphone recording.
 */

import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

export const WELCOME_MESSAGES: Record<
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
    speech: 'WeatherGPT-ലേക്ക് സ്വാഗതം. ഞാൻ നിങ്ങളുടെ Voice Assistant ആയി തുടരണോ അതോ Classic Mode-ലേക്ക് പോകണോ?',
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

export class VoiceService {
  private static isSpeaking: boolean = false;
  private static recording: Audio.Recording | null = null;
  private static isRecordingAudio: boolean = false;

  /**
   * Request Android / iOS microphone permission
   */
  static async requestMicrophonePermission(): Promise<boolean> {
    try {
      const response = await Audio.requestPermissionsAsync();
      return response.granted;
    } catch (e) {
      console.error('[VoiceService] Permission request error:', e);
      return false;
    }
  }

  /**
   * Check if microphone permission is currently granted
   */
  static async checkMicrophonePermission(): Promise<boolean> {
    try {
      const response = await Audio.getPermissionsAsync();
      return response.granted;
    } catch {
      return false;
    }
  }

  /**
   * Start recording audio from the device microphone
   */
  static async startRecording(): Promise<boolean> {
    try {
      // 1. Stop any ongoing TTS playback first
      this.stop();

      // 2. Ensure permission
      const hasPermission = await this.requestMicrophonePermission();
      if (!hasPermission) {
        console.warn('[VoiceService] Microphone permission not granted');
        return false;
      }

      // 3. Set audio mode for recording on Android / iOS
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 4. Clean up any previous recording object
      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
        } catch {}
        this.recording = null;
      }

      // 5. Initialize and start high quality recording
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();

      this.recording = newRecording;
      this.isRecordingAudio = true;
      return true;
    } catch (error) {
      console.error('[VoiceService] Failed to start recording:', error);
      this.isRecordingAudio = false;
      this.recording = null;
      return false;
    }
  }

  /**
   * Stop recording and return the local file URI of the audio clip
   */
  static async stopRecording(): Promise<string | null> {
    try {
      this.isRecordingAudio = false;
      if (!this.recording) return null;

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;

      // Reset audio mode back to normal playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      return uri;
    } catch (error) {
      console.error('[VoiceService] Failed to stop recording:', error);
      this.recording = null;
      return null;
    }
  }

  /**
   * Check if microphone is currently recording
   */
  static isRecording(): boolean {
    return this.isRecordingAudio;
  }

  /**
   * Speak response text loudly and clearly using the device's native TTS engine.
   */
  static speak(
    text: string,
    locale: string = 'te-IN',
    onDone?: () => void,
    onError?: (err: any) => void
  ) {
    try {
      this.stop();

      if (!text || !text.trim()) {
        this.isSpeaking = false;
        if (onDone) onDone();
        return;
      }

      this.isSpeaking = true;

      Speech.speak(text, {
        language: locale,
        pitch: 1.0,
        rate: 0.95, // Measured pace for rural comprehension
        onDone: () => {
          this.isSpeaking = false;
          if (onDone) onDone();
        },
        onError: (e) => {
          this.isSpeaking = false;
          if (onError) onError(e);
        },
      });
    } catch (error) {
      this.isSpeaking = false;
      if (onError) onError(error);
    }
  }

  /**
   * Stop any active voice playback immediately.
   */
  static stop() {
    try {
      this.isSpeaking = false;
      Speech.stop();
    } catch (e) {
      // Ignore cleanup error
    }
  }

  /**
   * Check if speech audio is currently playing.
   */
  static getSpeakingState(): boolean {
    return this.isSpeaking;
  }
}

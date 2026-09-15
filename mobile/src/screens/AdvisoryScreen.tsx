/**
 * Mobile Advisory Screen — Voice-enabled agricultural & weather guidance
 * Tailored for farmers and rural users with spoken agronomic advice.
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  Sprout,
  ArrowLeft,
  Volume2,
  Droplets,
  Wind,
  Sun,
  ShieldAlert,
} from 'lucide-react-native';
import { useMobileStore } from '../store/useMobileStore';
import { WeatherApi } from '../services/api';
import { VoiceService } from '../services/voice';
import { getThemeColors } from '../theme/theme';

interface Props {
  onBack: () => void;
}

export const AdvisoryScreen: React.FC<Props> = ({ onBack }) => {
  const { location, language, locale, theme } = useMobileStore();
  const colors = getThemeColors(theme);
  const [loading, setLoading] = useState(true);
  const [advisoryData, setAdvisoryData] = useState<any>(null);

  useEffect(() => {
    fetchAdvisory();
  }, [location, language]);

  const fetchAdvisory = async () => {
    try {
      setLoading(true);
      const data = await WeatherApi.getAdvisories(location, language);
      setAdvisoryData(data);
    } catch (e) {
      console.error('Error fetching advisory:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeakAdvisory = () => {
    if (advisoryData?.ai_explanation) {
      VoiceService.speak(advisoryData.ai_explanation, locale);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {language === 'te' ? 'వ్యవసాయ సలహాలు / Advisory' : 'Farming Advisory'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.success} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* AI Farming Advice Card */}
            <View
              style={[
                styles.mainCard,
                {
                  backgroundColor: colors.successBg,
                  borderColor: colors.successBorder,
                },
              ]}
            >
              <View style={styles.mainHeader}>
                <Sprout size={24} color={colors.success} />
                <Text style={[styles.mainTitle, { color: colors.success }]}>
                  {language === 'te' ? 'రైతులకు సూచనలు / Agronomic Guidance' : 'Agronomic Guidance'}
                </Text>
              </View>

              <Text style={[styles.mainText, { color: colors.textPrimary }]}>
                {advisoryData?.ai_explanation ||
                  'ప్రస్తుత వాతావరణం పంట పనులకు అనుకూలంగా ఉంది.'}
              </Text>

              {/* Voice Readout Button */}
              <TouchableOpacity
                style={[styles.listenBtn, { backgroundColor: colors.success }]}
                onPress={handleSpeakAdvisory}
                activeOpacity={0.8}
              >
                <Volume2 size={20} color="#ffffff" />
                <Text style={styles.listenText}>
                  {language === 'te' ? 'సలహా వినండి / Listen Advisory' : 'Listen Advisory'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Individual Rule Cards */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {language === 'te' ? 'నియమావళి సూచనలు / Recommended Practices:' : 'Recommended Practices:'}
            </Text>
            {advisoryData?.advisories && advisoryData.advisories.length > 0 ? (
              advisoryData.advisories.map((adv: any, idx: number) => (
                <View
                  key={idx}
                  style={[
                    styles.ruleCard,
                    {
                      backgroundColor: colors.surfaceCard,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.ruleCategory, { color: colors.accent }]}>
                    {adv.category.toUpperCase()}
                  </Text>
                  <Text style={[styles.ruleRecommendation, { color: colors.textPrimary }]}>
                    {adv.recommendation}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                No active advisory rules triggered for this location.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 12,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  mainCard: {
    backgroundColor: '#022115',
    borderColor: '#059669',
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  mainTitle: {
    color: '#6ee7b7',
    fontSize: 16,
    fontWeight: '800',
  },
  mainText: {
    color: '#d1fae5',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  listenText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  ruleCard: {
    backgroundColor: '#131b2e',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  ruleCategory: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  ruleRecommendation: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 18,
  },
});

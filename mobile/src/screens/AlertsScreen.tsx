/**
 * Mobile Alerts Screen — Voice-enabled public safety warnings
 * Designed with large high-visibility icons and audio safety briefing.
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
  AlertTriangle,
  ArrowLeft,
  Volume2,
  ShieldCheck,
  Flame,
  CloudRain,
  Wind,
} from 'lucide-react-native';
import { useMobileStore } from '../store/useMobileStore';
import { WeatherApi } from '../services/api';
import { VoiceService } from '../services/voice';
import { getThemeColors } from '../theme/theme';

interface Props {
  onBack: () => void;
  onNavigateShelters?: () => void;
}

export const AlertsScreen: React.FC<Props> = ({ onBack, onNavigateShelters }) => {
  const { location, language, locale, theme } = useMobileStore();
  const colors = getThemeColors(theme);
  const [loading, setLoading] = useState(true);
  const [alertsData, setAlertsData] = useState<any>(null);

  useEffect(() => {
    fetchAlerts();
  }, [location, language]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await WeatherApi.getAlerts(location, language);
      setAlertsData(data);
    } catch (e) {
      console.error('Error fetching alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeakBriefing = () => {
    if (alertsData?.ai_explanation) {
      VoiceService.speak(alertsData.ai_explanation, locale);
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
          {language === 'te' ? 'వాతావరణ హెచ్చరికలు / Alerts' : 'Weather Alerts'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.warning} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Safety Briefing Banner */}
            <View
              style={[
                styles.safetyCard,
                {
                  backgroundColor: colors.warningBg,
                  borderColor: colors.warningBorder,
                },
              ]}
            >
              <View style={styles.safetyHeader}>
                <AlertTriangle size={24} color={colors.warning} />
                <Text style={[styles.safetyTitle, { color: colors.textPrimary }]}>
                  {language === 'te' ? 'భద్రతా బ్రీఫింగ్ / Safety Briefing' : 'Safety Briefing'}
                </Text>
              </View>

              <Text style={[styles.safetyText, { color: colors.textPrimary }]}>
                {alertsData?.ai_explanation ||
                  (language === 'te'
                    ? 'వాతావరణ పరిస్థితులపై పూర్తి సమాచారం విశ్లేషించబడుతోంది.'
                    : 'Weather briefing is analyzing active local conditions.')}
              </Text>

              {/* Action Buttons Row */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                {/* Voice Listen Button */}
                <TouchableOpacity
                  style={[styles.listenBtn, { backgroundColor: colors.warning, flex: 1, marginTop: 0 }]}
                  onPress={handleSpeakBriefing}
                  activeOpacity={0.8}
                >
                  <Volume2 size={18} color="#ffffff" />
                  <Text style={styles.listenText}>
                    {language === 'te' ? 'వినండి' : 'Listen'}
                  </Text>
                </TouchableOpacity>

                {/* Safe Shelter Button */}
                {onNavigateShelters && (
                  <TouchableOpacity
                    style={[styles.listenBtn, { backgroundColor: '#10b981', flex: 1.2, marginTop: 0 }]}
                    onPress={onNavigateShelters}
                    activeOpacity={0.8}
                  >
                    <ShieldCheck size={18} color="#ffffff" />
                    <Text style={styles.listenText}>
                      {language === 'te' ? 'సురక్షిత ఆశ్రయాలు' : 'Safe Shelters'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Individual Alert Cards */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {language === 'te' ? 'చురుకైన హెచ్చరికలు / Active Alerts:' : 'Active Alerts:'}
            </Text>
            {alertsData?.alerts && alertsData.alerts.length > 0 ? (
              alertsData.alerts.map((alt: any, i: number) => (
                <View
                  key={i}
                  style={[
                    styles.alertCard,
                    {
                      backgroundColor: colors.surfaceCard,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.alertHeaderRow}>
                    <Text style={[styles.alertTitle, { color: colors.textPrimary }]}>
                      {alt.title}
                    </Text>
                    <View style={styles.severityBadge}>
                      <Text style={styles.severityText}>{alt.severity.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
                    {alt.description}
                  </Text>
                </View>
              ))
            ) : (
              <View
                style={[
                  styles.allClearCard,
                  {
                    backgroundColor: colors.successBg,
                    borderColor: colors.successBorder,
                  },
                ]}
              >
                <ShieldCheck size={40} color={colors.success} />
                <Text style={[styles.allClearText, { color: colors.textPrimary }]}>
                  {language === 'te'
                    ? 'అన్నీ సురక్షితం! తీవ్రమైన హెచ్చరికలు లేవు.'
                    : 'All clear! No severe weather alerts at this time.'}
                </Text>
              </View>
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
  safetyCard: {
    backgroundColor: '#201600',
    borderColor: '#b45309',
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  safetyTitle: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '800',
  },
  safetyText: {
    color: '#fef3c7',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d97706',
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
  alertCard: {
    backgroundColor: '#131b2e',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  severityBadge: {
    backgroundColor: '#7f1d1d',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '800',
  },
  alertDesc: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
  allClearCard: {
    backgroundColor: '#062016',
    borderColor: '#059669',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  allClearText: {
    color: '#6ee7b7',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});

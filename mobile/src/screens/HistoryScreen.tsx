/**
 * Mobile History Screen — 30-Day Historical Weather Analysis
 * Allows farmers and rural users to review past temperature and rainfall trends.
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
  ArrowLeft,
  Calendar,
  Thermometer,
  CloudRain,
  Wind,
  Volume2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react-native';
import { useMobileStore } from '../store/useMobileStore';
import { WeatherApi, HistoricalWeatherData } from '../services/api';
import { VoiceService } from '../services/voice';
import { getThemeColors } from '../theme/theme';

interface Props {
  onBack: () => void;
}

export const HistoryScreen: React.FC<Props> = ({ onBack }) => {
  const { location, coordinates, language, locale, theme } = useMobileStore();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HistoricalWeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [location]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const end = new Date();
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 29);

      const fmt = (d: Date) => d.toISOString().split('T')[0];

      const res = await WeatherApi.getHistoricalWeather(
        location,
        coordinates?.latitude,
        coordinates?.longitude,
        fmt(start),
        fmt(end)
      );
      setData(res);
    } catch (e: any) {
      console.error('Error fetching history:', e);
      setError('Could not load 30-day historical data.');
    } finally {
      setLoading(false);
    }
  };

  // Compute aggregate statistics
  const historyItems = data?.data || [];
  const avgMaxTemp =
    historyItems.length > 0
      ? Math.round(historyItems.reduce((acc, cur) => acc + cur.temp_max_c, 0) / historyItems.length)
      : 0;
  const avgMinTemp =
    historyItems.length > 0
      ? Math.round(historyItems.reduce((acc, cur) => acc + cur.temp_min_c, 0) / historyItems.length)
      : 0;
  const totalRainMm =
    historyItems.length > 0
      ? Math.round(historyItems.reduce((acc, cur) => acc + cur.precipitation_sum_mm, 0) * 10) / 10
      : 0;
  const rainyDaysCount = historyItems.filter((h) => h.precipitation_sum_mm > 1.0).length;

  const handleSpeakSummary = () => {
    if (!historyItems.length) return;
    const summaryText =
      language === 'te'
        ? `${location} లో గత 30 రోజులలో సగటు గరిష్ట ఉష్ణోగ్రత ${avgMaxTemp} డిగ్రీలు, కనిష్ట ఉష్ణోగ్రత ${avgMinTemp} డిగ్రీలు. మొత్తం వర్షపాతం ${totalRainMm} మిల్లీమీటర్లు, ${rainyDaysCount} వర్షపు రోజులు నమోదయ్యాయి.`
        : language === 'hi'
        ? `${location} में पिछले 30 दिनों में औसत अधिकतम तापमान ${avgMaxTemp} डिग्री, न्यूनतम ${avgMinTemp} डिग्री रहा। कुल वर्षा ${totalRainMm} मिमी दर्ज की गई।`
        : `Over the past 30 days in ${location}, the average high was ${avgMaxTemp}°C and the average low was ${avgMinTemp}°C. Total recorded rainfall was ${totalRainMm} mm across ${rainyDaysCount} rainy days.`;

    VoiceService.speak(summaryText, locale);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.iconButton, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {language === 'te' ? 'వాతావరణ చరిత్ర' : language === 'hi' ? 'मौसम इतिहास' : 'Weather History'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {location} · Last 30 Days
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSpeakSummary}
          disabled={loading || !historyItems.length}
          style={[
            styles.speakButton,
            { backgroundColor: colors.accent, opacity: loading ? 0.5 : 1 },
          ]}
        >
          <Volume2 size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading historical observations...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          <TouchableOpacity
            onPress={fetchHistory}
            style={[styles.retryButton, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Summary Stat Cards */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <View style={styles.statIconRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg High</Text>
                <Thermometer size={14} color="#f97316" />
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{avgMaxTemp}°C</Text>
              <Text style={[styles.statSub, { color: colors.textSecondary }]}>Daytime peak</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <View style={styles.statIconRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Low</Text>
                <Thermometer size={14} color="#3b82f6" />
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{avgMinTemp}°C</Text>
              <Text style={[styles.statSub, { color: colors.textSecondary }]}>Night minimum</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <View style={styles.statIconRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Rain</Text>
                <CloudRain size={14} color="#38bdf8" />
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalRainMm} mm</Text>
              <Text style={[styles.statSub, { color: colors.textSecondary }]}>{rainyDaysCount} wet days</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <View style={styles.statIconRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Data Span</Text>
                <Calendar size={14} color="#a855f7" />
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>30 Days</Text>
              <Text style={[styles.statSub, { color: colors.textSecondary }]}>Open-Meteo</Text>
            </View>
          </View>

          {/* Daily Timeline */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Daily Observations</Text>

          <View style={styles.listContainer}>
            {historyItems.map((item, index) => {
              const dateObj = new Date(item.date);
              const formattedDate = dateObj.toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                weekday: 'short',
              });

              return (
                <View
                  key={item.date}
                  style={[
                    styles.dailyRow,
                    { backgroundColor: colors.surfaceCard, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.dailyLeft}>
                    <Text style={[styles.dailyDate, { color: colors.textPrimary }]}>{formattedDate}</Text>
                    <View style={styles.metricTagsRow}>
                      {item.precipitation_sum_mm > 0 ? (
                        <View style={styles.rainBadge}>
                          <CloudRain size={10} color="#0284c7" />
                          <Text style={styles.rainBadgeText}>{item.precipitation_sum_mm.toFixed(1)} mm</Text>
                        </View>
                      ) : (
                        <Text style={[styles.dryText, { color: colors.textSecondary }]}>Dry</Text>
                      )}
                      <Text style={[styles.windTag, { color: colors.textSecondary }]}>
                        💨 {Math.round(item.wind_speed_max_kmh)} km/h
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dailyRight}>
                    <Text style={[styles.minTempText, { color: colors.textSecondary }]}>
                      {Math.round(item.temp_min_c)}°
                    </Text>
                    <View style={styles.tempBarContainer}>
                      <View style={styles.tempBarFill} />
                    </View>
                    <Text style={[styles.maxTempText, { color: colors.textPrimary }]}>
                      {Math.round(item.temp_max_c)}°C
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  speakButton: {
    padding: 10,
    borderRadius: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statSub: {
    fontSize: 10,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  listContainer: {
    gap: 8,
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  dailyLeft: {
    flex: 1,
  },
  dailyDate: {
    fontSize: 14,
    fontWeight: '700',
  },
  metricTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  rainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rainBadgeText: {
    color: '#0284c7',
    fontSize: 10,
    fontWeight: '700',
  },
  dryText: {
    fontSize: 11,
  },
  windTag: {
    fontSize: 10,
  },
  dailyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 110,
    justifyContent: 'flex-end',
  },
  minTempText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tempBarContainer: {
    width: 44,
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  tempBarFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f59e0b',
  },
  maxTempText: {
    fontSize: 14,
    fontWeight: '800',
    minWidth: 42,
    textAlign: 'right',
  },
});

/**
 * SheltersScreen — Verified Emergency Safe Shelters & In-App Map.
 *
 * Strict Compliance:
 * - NEVER INVENT OR FABRICATE A SHELTER.
 * - Sourced strictly from PostgreSQL database with official authority references (APSDMA, NDMA).
 * - Interactive Vector Map with GPS user pin (📍) and verified shelter markers (🛡️).
 * - Direct turn-by-turn navigation via Google Maps and emergency phone dialer.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G, Rect } from 'react-native-svg';
import {
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Phone,
  Navigation,
  AlertTriangle,
  Volume2,
  Users,
  Building2,
  RefreshCw,
} from 'lucide-react-native';
import { useMobileStore } from '../store/useMobileStore';
import { WeatherApi, ShelterItem, SheltersResponse } from '../services/api';
import { VoiceService } from '../services/voice';
import { ThemeToggle } from '../components/ThemeToggle';
import { getThemeColors } from '../theme/theme';

interface SheltersScreenProps {
  onBack: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_SIZE = Math.min(SCREEN_WIDTH - 32, 340);
const MAP_CENTER = MAP_SIZE / 2;

export const SheltersScreen: React.FC<SheltersScreenProps> = ({ onBack }) => {
  const { location, coordinates, language, locale, theme } = useMobileStore();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [sheltersData, setSheltersData] = useState<SheltersResponse | null>(null);
  const [selectedShelter, setSelectedShelter] = useState<ShelterItem | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const userLat = coordinates?.latitude || 16.5062;
  const userLon = coordinates?.longitude || 80.6480;

  useEffect(() => {
    fetchNearbyShelters();
  }, [userLat, userLon, language]);

  const fetchNearbyShelters = async () => {
    try {
      setLoading(true);
      const res = await WeatherApi.getNearbyShelters(userLat, userLon, 40.0, language);
      setSheltersData(res);
      if (res.shelters.length > 0) {
        setSelectedShelter(res.shelters[0]);
        // Speak safety briefing automatically
        speakAdvisory(res.safety_advisory);
      }
    } catch (e) {
      console.log('Error fetching shelters:', e);
    } finally {
      setLoading(false);
    }
  };

  const speakAdvisory = (text: string) => {
    if (!text) return;
    setIsSpeaking(true);
    VoiceService.speak(
      text,
      locale,
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  };

  const handleCallHelpline = (contact: string) => {
    // Extract first phone number or clean text for tel link
    const phoneMatch = contact.match(/\b\d{3,4}[-]?\d{6,8}\b|\b1070\b|\b112\b|\b1077\b/);
    const phoneNumber = phoneMatch ? phoneMatch[0].replace(/-/g, '') : '112';
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {});
  };

  const handleOpenDirections = (shelter: ShelterItem) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${shelter.latitude},${shelter.longitude}&dirflg=d`,
      android: `google.navigation:q=${shelter.latitude},${shelter.longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude},${shelter.longitude}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude},${shelter.longitude}`);
    });
  };

  // Map coordinate projection for SVG Radar Map
  // Normalizes shelters within 35km radius into MAP_SIZE canvas
  const getMarkerCoordinates = (shelterLat: number, shelterLon: number) => {
    const dLat = shelterLat - userLat;
    const dLon = shelterLon - userLon;
    const maxDegree = 0.35; // ~38 km
    const x = MAP_CENTER + (dLon / maxDegree) * (MAP_CENTER - 28);
    const y = MAP_CENTER - (dLat / maxDegree) * (MAP_CENTER - 28);
    return {
      x: Math.max(20, Math.min(MAP_SIZE - 20, x)),
      y: Math.max(20, Math.min(MAP_SIZE - 20, y)),
    };
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {language === 'te' ? 'సమీప సురక్షిత ఆశ్రయాలు' : 'Nearby Safe Shelters'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.accent }]}>
            {location} (Within 35 km)
          </Text>
        </View>
        <ThemeToggle variant="compact" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {language === 'te' ? 'అధికారిక ఆశ్రయాలను శోధిస్తున్నాం...' : 'Locating verified disaster shelters...'}
            </Text>
          </View>
        ) : (
          <>
            {/* Safety Briefing / Advisory Card */}
            {sheltersData?.safety_advisory && (
              <View
                style={[
                  styles.advisoryCard,
                  {
                    backgroundColor: sheltersData.has_verified_shelters ? colors.surfaceCard : colors.warningBg,
                    borderColor: sheltersData.has_verified_shelters ? colors.border : colors.warningBorder,
                  },
                ]}
              >
                <View style={styles.advisoryTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <ShieldCheck size={22} color={sheltersData.has_verified_shelters ? '#10b981' : colors.warning} />
                    <Text style={[styles.advisoryTitle, { color: colors.textPrimary }]}>
                      {language === 'te' ? 'అత్యవసర రక్షణ సమాచారం' : 'Emergency Safety Advisory'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => speakAdvisory(sheltersData.safety_advisory)}
                    style={[styles.listenBtn, { backgroundColor: colors.accentBg }]}
                  >
                    <Volume2 size={16} color={colors.accent} />
                    <Text style={[styles.listenBtnText, { color: colors.accent }]}>
                      {isSpeaking ? 'Listening...' : 'Listen'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.advisoryBody, { color: colors.textSecondary }]}>
                  {sheltersData.safety_advisory}
                </Text>
              </View>
            )}

            {/* In-App Interactive Vector Map */}
            <View style={[styles.mapContainer, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <View style={styles.mapHeaderRow}>
                <Text style={[styles.mapTitle, { color: colors.textPrimary }]}>
                  {language === 'te' ? 'ఆశ్రయాల మ్యాప్ / Radar View' : 'Shelter Radar Map'}
                </Text>
                <TouchableOpacity onPress={fetchNearbyShelters} style={styles.refreshBtn}>
                  <RefreshCw size={14} color={colors.textMuted} />
                  <Text style={[styles.refreshText, { color: colors.textMuted }]}>Refresh</Text>
                </TouchableOpacity>
              </View>

              <Svg width={MAP_SIZE} height={MAP_SIZE} style={styles.svgMap}>
                {/* Concentric distance rings: 10km, 20km, 30km */}
                <Circle cx={MAP_CENTER} cy={MAP_CENTER} r={MAP_CENTER - 15} stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" fill="none" />
                <Circle cx={MAP_CENTER} cy={MAP_CENTER} r={(MAP_CENTER - 15) * 0.66} stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" fill="none" />
                <Circle cx={MAP_CENTER} cy={MAP_CENTER} r={(MAP_CENTER - 15) * 0.33} stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" fill="none" />

                {/* Crosshairs */}
                <Line x1={MAP_CENTER} y1="10" x2={MAP_CENTER} y2={MAP_SIZE - 10} stroke={colors.borderSubtle || colors.border} strokeWidth="1" />
                <Line x1="10" y1={MAP_CENTER} x2={MAP_SIZE - 10} y2={MAP_CENTER} stroke={colors.borderSubtle || colors.border} strokeWidth="1" />

                {/* Distance markers */}
                <SvgText x={MAP_CENTER + 6} y={MAP_CENTER - (MAP_CENTER - 15) * 0.33 + 12} fill={colors.textMuted} fontSize="10">10 km</SvgText>
                <SvgText x={MAP_CENTER + 6} y={MAP_CENTER - (MAP_CENTER - 15) * 0.66 + 12} fill={colors.textMuted} fontSize="10">20 km</SvgText>
                <SvgText x={MAP_CENTER + 6} y="22" fill={colors.textMuted} fontSize="10">35 km</SvgText>

                {/* Center User Location Pin (📍) */}
                <Circle cx={MAP_CENTER} cy={MAP_CENTER} r="10" fill="#38bdf830" />
                <Circle cx={MAP_CENTER} cy={MAP_CENTER} r="5" fill="#0284c7" />
                <SvgText x={MAP_CENTER} y={MAP_CENTER + 18} fill="#0284c7" fontSize="11" fontWeight="bold" textAnchor="middle">
                  You
                </SvgText>

                {/* Verified Shelter Markers (🛡️) */}
                {sheltersData?.shelters.map((s, index) => {
                  const { x, y } = getMarkerCoordinates(s.latitude, s.longitude);
                  const isSelected = selectedShelter?.id === s.id;
                  return (
                    <G key={s.id} onPress={() => setSelectedShelter(s)}>
                      {isSelected && (
                        <Circle cx={x} cy={y} r="18" fill="#10b98130" stroke="#10b981" strokeWidth="1.5" />
                      )}
                      <Circle
                        cx={x}
                        cy={y}
                        r="11"
                        fill={isSelected ? '#10b981' : '#059669'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <SvgText
                        x={x}
                        y={y + 4}
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {index + 1}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>

              <View style={styles.mapLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#0284c7' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Your Location</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Verified Shelter (Tap to select)</Text>
                </View>
              </View>
            </View>

            {/* Selected Shelter Highlight Card */}
            {selectedShelter && (
              <View
                style={[
                  styles.highlightCard,
                  {
                    backgroundColor: colors.surfaceCard,
                    borderColor: colors.accent,
                  },
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.verifiedBadge}>
                    <ShieldCheck size={14} color="#10b981" />
                    <Text style={styles.verifiedBadgeText}>Official Verified Shelter</Text>
                  </View>
                  <View style={[styles.distanceBadge, { backgroundColor: colors.accentBg }]}>
                    <Text style={[styles.distanceBadgeText, { color: colors.accent }]}>
                      {selectedShelter.distance_km} km away
                    </Text>
                  </View>
                </View>

                <Text style={[styles.shelterName, { color: colors.textPrimary }]}>
                  {selectedShelter.name}
                </Text>

                <View style={styles.infoRow}>
                  <Building2 size={16} color={colors.textSecondary} />
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    {selectedShelter.facility_type}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <MapPin size={16} color={colors.textSecondary} />
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    {selectedShelter.address}
                  </Text>
                </View>

                {selectedShelter.capacity && (
                  <View style={styles.infoRow}>
                    <Users size={16} color={colors.textSecondary} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                      Capacity: ~{selectedShelter.capacity} people
                    </Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <ShieldCheck size={16} color={colors.textSecondary} />
                  <Text style={[styles.infoTextMuted, { color: colors.textMuted }]}>
                    Source: {selectedShelter.source} ({selectedShelter.source_reference})
                  </Text>
                </View>

                {/* Direct Action Buttons */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.callBtn]}
                    onPress={() => handleCallHelpline(selectedShelter.contact_information)}
                    activeOpacity={0.8}
                  >
                    <Phone size={16} color="#ffffff" />
                    <Text style={styles.callBtnText}>Call Helpline</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.directionsBtn, { backgroundColor: colors.accent }]}
                    onPress={() => handleOpenDirections(selectedShelter)}
                    activeOpacity={0.85}
                  >
                    <Navigation size={16} color="#0f172a" />
                    <Text style={styles.directionsBtnText}>Get Directions</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* List of All Nearby Shelters */}
            <View style={styles.listSection}>
              <Text style={[styles.listSectionTitle, { color: colors.textPrimary }]}>
                {language === 'te'
                  ? `అన్ని ఆశ్రయాల జాబితా (${sheltersData?.count || 0})`
                  : `All Nearby Shelters (${sheltersData?.count || 0})`}
              </Text>

              {sheltersData?.shelters.length === 0 ? (
                <View style={[styles.emptyBox, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
                  <AlertTriangle size={36} color={colors.warning} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    No Verified Shelters Found Nearby
                  </Text>
                  <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                    No verified emergency shelters were found within 35 km of your location. Please contact emergency services (112 or 1070) for immediate evacuation assistance.
                  </Text>
                  <TouchableOpacity
                    style={[styles.callBtn, { marginTop: 14 }]}
                    onPress={() => Linking.openURL('tel:1070')}
                  >
                    <Phone size={16} color="#ffffff" />
                    <Text style={styles.callBtnText}>Call Disaster Helpline 1070</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                sheltersData?.shelters.map((s, idx) => {
                  const isSelected = selectedShelter?.id === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.shelterItemCard,
                        {
                          backgroundColor: colors.surfaceCard,
                          borderColor: isSelected ? colors.accent : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedShelter(s)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.itemIndexCircle}>
                        <Text style={styles.itemIndexText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{s.name}</Text>
                        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{s.facility_type}</Text>
                        <Text style={[styles.itemAddress, { color: colors.textMuted }]}>{s.address}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <Text style={[styles.itemDistance, { color: colors.accent }]}>{s.distance_km} km</Text>
                        <TouchableOpacity
                          style={[styles.itemNavBtn, { backgroundColor: colors.accentBg }]}
                          onPress={() => handleOpenDirections(s)}
                        >
                          <Navigation size={14} color={colors.accent} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  loadingBox: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  advisoryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  advisoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  advisoryTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  advisoryBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  listenBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mapContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 10,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  mapTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '600',
  },
  svgMap: {
    marginVertical: 4,
  },
  mapLegendRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  highlightCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b98118',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  verifiedBadgeText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '800',
  },
  distanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distanceBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  shelterName: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  infoTextMuted: {
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  callBtn: {
    backgroundColor: '#dc2626',
  },
  callBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  directionsBtn: {},
  directionsBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  listSection: {
    gap: 12,
  },
  listSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  shelterItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  itemIndexCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10b98125',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemIndexText: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemSubtitle: {
    fontSize: 12,
  },
  itemAddress: {
    fontSize: 11,
  },
  itemDistance: {
    fontSize: 13,
    fontWeight: '800',
  },
  itemNavBtn: {
    padding: 6,
    borderRadius: 6,
  },
});

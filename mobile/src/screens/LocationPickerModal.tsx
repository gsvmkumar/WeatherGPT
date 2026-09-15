/**
 * Visual Location Picker Modal
 * Allows searching any city/town in India or selecting from popular regional presets.
 * Designed with large touch targets and high contrast for mobile usability.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { MapPin, Search, X, Check, Building, LocateFixed } from 'lucide-react-native';
import { useMobileStore } from '../store/useMobileStore';
import { WeatherApi, LocationSearchResult } from '../services/api';
import { LocationService } from '../services/location';
import { getThemeColors } from '../theme/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onLocationSelected?: (locationName: string) => void;
}

// Popular regional presets for instant 1-tap selection without typing
const POPULAR_CITIES = [
  { name: 'Vijayawada', state: 'Andhra Pradesh', isDefault: true },
  { name: 'Guntur', state: 'Andhra Pradesh' },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { name: 'Tirupati', state: 'Andhra Pradesh' },
  { name: 'Amaravati', state: 'Andhra Pradesh' },
  { name: 'Rajahmundry', state: 'Andhra Pradesh' },
  { name: 'Kurnool', state: 'Andhra Pradesh' },
  { name: 'Hyderabad', state: 'Telangana' },
  { name: 'Bengaluru', state: 'Karnataka' },
  { name: 'Chennai', state: 'Tamil Nadu' },
  { name: 'Delhi', state: 'National Capital' },
  { name: 'Mumbai', state: 'Maharashtra' },
  { name: 'Kolkata', state: 'West Bengal' },
  { name: 'Pune', state: 'Maharashtra' },
];

export const LocationPickerModal: React.FC<Props> = ({
  visible,
  onClose,
  onLocationSelected,
}) => {
  const { location, setLocation, userId, theme } = useMobileStore();
  const colors = getThemeColors(theme);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Trigger search when query changes (debounced 400ms)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await WeatherApi.searchLocations(searchQuery.trim());
        setSearchResults(results);
        setHasSearched(true);
      } catch (e) {
        console.log('Location search error:', e);
        setSearchResults([]);
        setHasSearched(true);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle GPS location detection
  const handleUseGps = async () => {
    setIsDetectingGps(true);
    setGpsError(null);
    try {
      const result = await LocationService.detectCurrentCity();
      if (!result) {
        setGpsError('Could not detect GPS location. Please check location permissions.');
        return;
      }

      setLocation(result.cityName, {
        latitude: result.latitude,
        longitude: result.longitude,
      }, true);

      if (onLocationSelected) {
        onLocationSelected(result.cityName);
      }

      if (userId) {
        try {
          await WeatherApi.saveLocation(
            userId,
            result.cityName,
            result.latitude,
            result.longitude,
            true
          );
        } catch (e) {
          console.log('Error saving GPS location to profile:', e);
        }
      }

      onClose();
    } catch (e: any) {
      setGpsError(e?.message || 'Error detecting location.');
    } finally {
      setIsDetectingGps(false);
    }
  };

  const handleSelectLocation = async (
    name: string,
    latitude?: number,
    longitude?: number
  ) => {
    const coords =
      latitude !== undefined && longitude !== undefined
        ? { latitude, longitude }
        : null;

    setLocation(name, coords, false);

    if (onLocationSelected) {
      onLocationSelected(name);
    }

    if (userId && latitude !== undefined && longitude !== undefined) {
      try {
        await WeatherApi.saveLocation(
          userId,
          name,
          latitude,
          longitude,
          true
        );
      } catch (e) {
        console.log('Error saving location to profile:', e);
      }
    }

    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerTitleRow}>
            <MapPin size={24} color={colors.accent} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              స్థానాన్ని ఎంచుకోండి / Select City
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* GPS Quick Action Button */}
        <TouchableOpacity
          style={[
            styles.gpsButton,
            {
              backgroundColor: colors.surfaceCard,
              borderColor: colors.accentBorder,
            },
          ]}
          onPress={handleUseGps}
          disabled={isDetectingGps}
          activeOpacity={0.8}
        >
          <View style={[styles.gpsIconContainer, { backgroundColor: colors.accentBg }]}>
            {isDetectingGps ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <LocateFixed size={22} color={colors.accent} />
            )}
          </View>
          <View style={styles.gpsTextContainer}>
            <Text style={[styles.gpsTitle, { color: colors.textPrimary }]}>
              {isDetectingGps ? 'ప్రస్తుత స్థానాన్ని గుర్తిస్తోంది...' : 'ప్రస్తుత పరికరం స్థానం (GPS)'}
            </Text>
            <Text style={[styles.gpsSubtitle, { color: colors.textSecondary }]}>
              {isDetectingGps ? 'Detecting device GPS location...' : 'Use Current Device Location'}
            </Text>
          </View>
        </TouchableOpacity>

        {gpsError && (
          <View style={[styles.gpsErrorBox, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}>
            <Text style={[styles.gpsErrorText, { color: colors.danger }]}>{gpsError}</Text>
          </View>
        )}

        {/* Search Box */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: colors.surfaceCard,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.inputText }]}
            placeholder="నగరం లేదా గ్రామం పేరు రాయండి (e.g. Guntur, Delhi)..."
            placeholderTextColor={colors.inputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Active Search Results */}
          {isSearching && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                వెతుకుతోంది / Searching locations...
              </Text>
            </View>
          )}

          {!isSearching && hasSearched && searchResults.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                శోధన ఫలితాలు / Search Results:
              </Text>
              {searchResults.map((item, index) => {
                const isSelected = location.toLowerCase() === item.name.toLowerCase();
                return (
                  <TouchableOpacity
                    key={`${item.name}-${index}`}
                    style={[
                      styles.resultCard,
                      {
                        backgroundColor: colors.surfaceCard,
                        borderColor: colors.border,
                      },
                      isSelected && [
                        styles.selectedResultCard,
                        {
                          borderColor: colors.accent,
                          backgroundColor: colors.accentBg,
                        },
                      ],
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectLocation(item.name, item.latitude, item.longitude)}
                  >
                    <View style={styles.resultInfo}>
                      <Text
                        style={[
                          styles.cityName,
                          { color: colors.textPrimary },
                          isSelected && { color: colors.accent },
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={[styles.stateName, { color: colors.textMuted }]}>
                        {item.state ? `${item.state}, ` : ''}{item.country}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
                        <Check size={18} color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {!isSearching && hasSearched && searchResults.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                ఫలితాలు దొరకలేదు / No matching cities found.
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                కింద ఉన్న నగరాల నుండి ఎంచుకోండి:
              </Text>
            </View>
          )}

          {/* Popular Cities Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              ప్రసిద్ధ నగరాలు / Popular Cities:
            </Text>
            <View style={styles.popularGrid}>
              {POPULAR_CITIES.map((city) => {
                const isSelected = location.toLowerCase() === city.name.toLowerCase();
                return (
                  <TouchableOpacity
                    key={city.name}
                    style={[
                      styles.cityChip,
                      {
                        backgroundColor: colors.surfaceCard,
                        borderColor: colors.border,
                      },
                      isSelected && [
                        styles.selectedCityChip,
                        {
                          borderColor: colors.accent,
                          backgroundColor: colors.accentBg,
                        },
                      ],
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectLocation(city.name)}
                  >
                    <Building size={16} color={isSelected ? colors.accent : colors.textMuted} />
                    <View>
                      <Text
                        style={[
                          styles.chipCityText,
                          { color: colors.textPrimary },
                          isSelected && { color: colors.accent },
                        ]}
                      >
                        {city.name}
                      </Text>
                      <Text style={[styles.chipStateText, { color: colors.textMuted }]}>
                        {city.state}
                      </Text>
                    </View>
                    {isSelected && <Check size={16} color={colors.accent} style={{ marginLeft: 4 }} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
  },
  closeBtn: {
    padding: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    paddingHorizontal: 14,
    marginVertical: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#f8fafc',
    fontSize: 15,
  },
  clearBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#1e293b',
  },
  selectedResultCard: {
    borderColor: '#0284c7',
    backgroundColor: '#0c2340',
  },
  resultInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  selectedCityName: {
    color: '#38bdf8',
  },
  stateName: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  emptyText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1e293b',
    gap: 8,
  },
  selectedCityChip: {
    borderColor: '#0284c7',
    backgroundColor: '#0c2340',
  },
  chipCityText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  selectedChipText: {
    color: '#38bdf8',
  },
  chipStateText: {
    fontSize: 11,
    color: '#64748b',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c2340',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#0284c7',
    padding: 14,
    marginTop: 12,
    marginBottom: 4,
    gap: 12,
  },
  gpsIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0369a1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsTextContainer: {
    flex: 1,
  },
  gpsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#38bdf8',
  },
  gpsSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  gpsErrorBox: {
    backgroundColor: '#450a0a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 10,
    marginTop: 6,
  },
  gpsErrorText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '500',
  },
});

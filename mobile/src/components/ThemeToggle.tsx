/**
 * ThemeToggle Component — Accessible Light / Dark Mode Switch
 * Supports a full-width segmented switch for Settings / Profile modals
 * and a compact quick-toggle button for navigation top bars.
 * Designed with large touch targets (>= 48px) and high contrast for rural / low-literacy accessibility.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useMobileStore } from '../store/useMobileStore';
import { getThemeColors, ThemeMode } from '../theme/theme';

interface ThemeToggleProps {
  variant?: 'switch' | 'compact';
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'switch',
  showLabel = true,
}) => {
  const { theme, setTheme, toggleTheme, language } = useMobileStore();
  const colors = getThemeColors(theme);

  const isLight = theme === 'light';
  const isDark = theme === 'dark';

  // Quick compact toggle for header / top bar
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[
          styles.compactBtn,
          {
            backgroundColor: colors.surfaceCard,
            borderColor: colors.borderSubtle,
          },
        ]}
        onPress={toggleTheme}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={
          isLight
            ? 'Switch to Dark theme (చీకటి థీమ్)'
            : 'Switch to Light theme (వెలుతురు థీమ్)'
        }
      >
        {isLight ? (
          <Sun size={18} color="#d97706" />
        ) : (
          <Moon size={18} color="#38bdf8" />
        )}
      </TouchableOpacity>
    );
  }

  // Full segmented switch for Settings & Profile screens
  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {language === 'te' ? 'యాప్ థీమ్' : 'App Theme'}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            {isLight ? '☀️ Light' : '🌙 Dark'}
          </Text>
        </View>
      )}

      {/* Segmented Switch Control: ☀️ Light  ←→  🌙 Dark */}
      <View
        style={[
          styles.switchTrack,
          {
            backgroundColor: colors.surfaceHighlight,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        {/* Light Option Button */}
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            isLight && [
              styles.activeSegment,
              {
                backgroundColor: colors.surfaceCard,
                borderColor: '#0284c7',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              },
            ],
          ]}
          onPress={() => setTheme('light')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: isLight }}
          accessibilityLabel="Light theme (వెలుతురు)"
        >
          <Sun
            size={20}
            color={isLight ? '#d97706' : colors.textMuted}
            style={styles.icon}
          />
          <View style={styles.textColumn}>
            <Text
              style={[
                styles.segmentLabel,
                {
                  color: isLight ? colors.textPrimary : colors.textMuted,
                  fontWeight: isLight ? '700' : '500',
                },
              ]}
            >
              Light
            </Text>
            <Text
              style={[
                styles.nativeSubtext,
                { color: isLight ? colors.textSecondary : colors.textMuted },
              ]}
            >
              {language === 'te' ? 'వెలుతురు' : 'Bright'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Dark Option Button */}
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            isDark && [
              styles.activeSegment,
              {
                backgroundColor: colors.surfaceCard,
                borderColor: '#38bdf8',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              },
            ],
          ]}
          onPress={() => setTheme('dark')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ selected: isDark }}
          accessibilityLabel="Dark theme (చీకటి)"
        >
          <Moon
            size={20}
            color={isDark ? '#38bdf8' : colors.textMuted}
            style={styles.icon}
          />
          <View style={styles.textColumn}>
            <Text
              style={[
                styles.segmentLabel,
                {
                  color: isDark ? colors.textPrimary : colors.textMuted,
                  fontWeight: isDark ? '700' : '500',
                },
              ]}
            >
              Dark
            </Text>
            <Text
              style={[
                styles.nativeSubtext,
                { color: isDark ? colors.textSecondary : colors.textMuted },
              ]}
            >
              {language === 'te' ? 'చీకటి' : 'Dim'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  switchTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 56,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  activeSegment: {
    borderWidth: 1.5,
  },
  icon: {
    marginRight: 8,
  },
  textColumn: {
    alignItems: 'flex-start',
  },
  segmentLabel: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
  nativeSubtext: {
    fontSize: 10,
    marginTop: 1,
  },
  compactBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

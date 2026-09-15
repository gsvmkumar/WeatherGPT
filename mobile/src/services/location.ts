/**
 * Location Service — Handles GPS location access and reverse-geocoding
 * for automatic weather updates based on the user's physical device position.
 */

import * as Location from 'expo-location';
import { WeatherApi, LocationSearchResult } from './api';

export interface DeviceCoordinates {
  latitude: number;
  longitude: number;
}

export class LocationService {
  /**
   * Request device foreground location permissions
   */
  static async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.warn('[LocationService] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Check if location permission is currently granted
   */
  static async checkPermission(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Fetch current GPS coordinates from the device
   */
  static async getCurrentCoordinates(): Promise<DeviceCoordinates | null> {
    try {
      const granted = await this.requestPermission();
      if (!granted) {
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch (error) {
      console.warn('[LocationService] Failed to acquire current position:', error);
      return null;
    }
  }

  /**
   * Acquire GPS position and reverse-geocode to a city/town name
   * Uses backend /api/locations/reverse with fallback to Expo local geocoder.
   */
  static async detectCurrentCity(): Promise<{
    cityName: string;
    latitude: number;
    longitude: number;
    displayName?: string;
  } | null> {
    const coords = await this.getCurrentCoordinates();
    if (!coords) return null;

    try {
      // 1. Try backend reverse geocoder first
      const backendResult = await WeatherApi.reverseGeocode(coords.latitude, coords.longitude);
      if (backendResult && backendResult.name && backendResult.name !== 'Unknown') {
        return {
          cityName: backendResult.name,
          latitude: coords.latitude,
          longitude: coords.longitude,
          displayName: backendResult.display_name,
        };
      }
    } catch {
      // Fallback below
    }

    try {
      // 2. Fallback to Expo device geocoder
      const localAddresses = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (localAddresses && localAddresses.length > 0) {
        const addr = localAddresses[0];
        const cityName = addr.city || addr.subregion || addr.region || 'Current Location';
        return {
          cityName,
          latitude: coords.latitude,
          longitude: coords.longitude,
          displayName: `${cityName}, ${addr.region || ''}`,
        };
      }
    } catch (err) {
      console.warn('[LocationService] Reverse geocode fallback failed:', err);
    }

    return {
      cityName: `${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`,
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  }
}

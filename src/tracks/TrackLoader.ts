/**
 * TrackLoader: Loads track data from JSON files.
 * Provides both static loading from embedded data and dynamic loading from files.
 * 
 * Uses Vite's glob import to automatically load all tracks from data/tracks folder.
 */

import type { TrackData } from './types';

// Import all track JSON files from data/tracks folder
// Vite's glob import automatically bundles all matching files
import portoAzzurroData from '../../data/tracks/porto-azzurro.json';
import velocitaData from '../../data/tracks/velocita.json';
import bergheimData from '../../data/tracks/bergheim.json';
import brazilData from '../../data/tracks/brazil.json';

/** Map of available tracks by ID (auto-populated from data/tracks folder) */
const EMBEDDED_TRACKS: Record<string, TrackData> = {
  'porto-azzurro': portoAzzurroData as TrackData,
  'velocita': velocitaData as TrackData,
  'bergheim': bergheimData as TrackData,
  'brazil': brazilData as TrackData,
};

/**
 * Loads track data from embedded or external sources.
 */
export class TrackLoader {
  private tracksCache: Map<string, TrackData> = new Map();

  constructor() {
    // Pre-populate cache with embedded tracks
    for (const [id, data] of Object.entries(EMBEDDED_TRACKS)) {
      this.tracksCache.set(id, data);
    }
  }

  /**
   * Get a track by ID.
   * @param trackId - The track identifier
   * @throws If track is not found
   */
  getTrack(trackId: string): TrackData {
    const track = this.tracksCache.get(trackId);
    if (!track) {
      throw new Error(`Track "${trackId}" not found. Available: ${this.getAvailableTrackIds().join(', ')}`);
    }
    return track;
  }

  /**
   * Check if a track exists.
   */
  hasTrack(trackId: string): boolean {
    return this.tracksCache.has(trackId);
  }

  /**
   * Get list of all available track IDs.
   */
  getAvailableTrackIds(): string[] {
    return Array.from(this.tracksCache.keys());
  }

  /**
   * Get all available tracks.
   */
  getAllTracks(): TrackData[] {
    return Array.from(this.tracksCache.values());
  }

  /**
   * Get track metadata for UI display.
   */
  getTrackInfo(trackId: string): {
    id: string;
    name: string;
    country: string;
    lengthMeters: number;
    characteristics: string;
  } {
    const track = this.getTrack(trackId);
    return {
      id: track.id,
      name: track.name,
      country: track.country,
      lengthMeters: track.lengthMeters,
      characteristics: track.characteristics || '',
    };
  }

  /**
   * Load a track from a JSON URL (for external/custom tracks).
   * @param url - URL to the JSON track file
   */
  async loadFromUrl(url: string): Promise<TrackData> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load track from ${url}: ${response.statusText}`);
    }
    
    const data = await response.json() as TrackData;
    
    // Validate required fields
    this.validateTrackData(data);
    
    // Cache the loaded track
    this.tracksCache.set(data.id, data);
    
    return data;
  }

  /**
   * Register a custom track (for programmatically created tracks).
   */
  registerTrack(track: TrackData): void {
    this.validateTrackData(track);
    this.tracksCache.set(track.id, track);
  }

  /**
   * Validate track data has required fields for spline-based format.
   */
  private validateTrackData(data: TrackData): void {
    const required = ['id', 'name', 'trackWidth', 'controlPoints', 'startFinish'];
    for (const field of required) {
      if (!(field in data)) {
        throw new Error(`Invalid track data: missing required field "${field}"`);
      }
    }
    
    if (!Array.isArray(data.controlPoints) || data.controlPoints.length < 3) {
      throw new Error('Invalid track data: controlPoints must be an array with at least 3 points');
    }

    // Validate each control point has x and y
    for (let i = 0; i < data.controlPoints.length; i++) {
      const cp = data.controlPoints[i];
      if (typeof cp.x !== 'number' || typeof cp.y !== 'number') {
        throw new Error(`Invalid track data: control point ${i} must have numeric x and y`);
      }
    }
  }
}

/**
 * Default track loader instance.
 */
export const defaultTrackLoader = new TrackLoader();

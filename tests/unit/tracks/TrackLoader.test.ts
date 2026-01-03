import { describe, it, expect, beforeEach } from 'vitest';
import { TrackLoader } from '@tracks/TrackLoader';

describe('TrackLoader', () => {
  let trackLoader: TrackLoader;

  beforeEach(() => {
    trackLoader = new TrackLoader();
  });

  describe('embedded tracks', () => {
    it('should have porto-azzurro loaded', () => {
      expect(trackLoader.hasTrack('porto-azzurro')).toBe(true);
    });

    it('should have velocita loaded', () => {
      expect(trackLoader.hasTrack('velocita')).toBe(true);
    });

    it('should have bergheim loaded', () => {
      expect(trackLoader.hasTrack('bergheim')).toBe(true);
    });

    it('should list all available track IDs', () => {
      const ids = trackLoader.getAvailableTrackIds();
      
      expect(ids).toContain('porto-azzurro');
      expect(ids).toContain('velocita');
      expect(ids).toContain('bergheim');
      expect(ids.length).toBe(3);
    });
  });

  describe('getTrack()', () => {
    it('should return track data for valid ID', () => {
      const track = trackLoader.getTrack('bergheim');
      
      expect(track.id).toBe('bergheim');
      expect(track.name).toBe('Bergheim Ring');
      expect(track.country).toBe('Austria');
      expect(track.controlPoints.length).toBeGreaterThan(0);
    });

    it('should throw for invalid track ID', () => {
      expect(() => trackLoader.getTrack('nonexistent')).toThrow('Track "nonexistent" not found');
    });
  });

  describe('getTrackInfo()', () => {
    it('should return track metadata', () => {
      const info = trackLoader.getTrackInfo('porto-azzurro');
      
      expect(info.id).toBe('porto-azzurro');
      expect(info.name).toBe('Porto Azzurro Street Circuit');
      expect(info.country).toBe('Italy');
      expect(info.lengthMeters).toBeGreaterThan(0);
      expect(info.characteristics).toContain('street circuit');
    });
  });

  describe('getAllTracks()', () => {
    it('should return all track data', () => {
      const tracks = trackLoader.getAllTracks();
      
      expect(tracks.length).toBe(3);
      expect(tracks.some(t => t.id === 'porto-azzurro')).toBe(true);
      expect(tracks.some(t => t.id === 'velocita')).toBe(true);
      expect(tracks.some(t => t.id === 'bergheim')).toBe(true);
    });
  });

  describe('registerTrack()', () => {
    it('should register a custom track', () => {
      const customTrack = {
        id: 'custom-track',
        name: 'Custom Circuit',
        country: 'Custom Land',
        lengthMeters: 5000,
        raceLaps: 50,
        trackWidth: 65,
        controlPoints: [
          { x: 0, y: 0, sector: 1 as const },
          { x: 100, y: 0, sector: 1 as const },
          { x: 100, y: 100, sector: 2 as const },
          { x: 0, y: 100, sector: 3 as const },
        ],
        startFinish: { controlPointIndex: 0 },
      };

      trackLoader.registerTrack(customTrack);
      
      expect(trackLoader.hasTrack('custom-track')).toBe(true);
      expect(trackLoader.getTrack('custom-track').name).toBe('Custom Circuit');
    });

    it('should throw for invalid track data - missing controlPoints', () => {
      const invalidTrack = {
        id: 'invalid',
        name: 'Invalid',
        // Missing required fields
      };

      expect(() => trackLoader.registerTrack(invalidTrack as any)).toThrow('missing required field');
    });

    it('should throw for track with less than 3 control points', () => {
      const invalidTrack = {
        id: 'invalid',
        name: 'Invalid',
        country: 'Test',
        lengthMeters: 1000,
        raceLaps: 10,
        trackWidth: 60,
        controlPoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        startFinish: { controlPointIndex: 0 },
      };

      expect(() => trackLoader.registerTrack(invalidTrack as any)).toThrow('at least 3 points');
    });
  });

  describe('track data validation', () => {
    it('should have valid porto-azzurro data', () => {
      const track = trackLoader.getTrack('porto-azzurro');
      
      expect(track.trackWidth).toBeGreaterThan(0);
      expect(track.controlPoints.length).toBeGreaterThan(10); // Monaco-style has many corners
      expect(track.startFinish).toBeDefined();
      
      // Should have barrier runoff (Monaco-style street circuit)
      const barrierPoints = track.controlPoints.filter(cp => cp.runoff === 'barrier');
      expect(barrierPoints.length).toBeGreaterThan(0);
      
      // Should have kerbs
      const kerbPoints = track.controlPoints.filter(cp => cp.kerbs);
      expect(kerbPoints.length).toBeGreaterThan(0);
    });

    it('should have valid velocita data', () => {
      const track = trackLoader.getTrack('velocita');
      
      expect(track.trackWidth).toBeGreaterThan(0);
      expect(track.controlPoints.length).toBeGreaterThan(10);
      
      // Monza-style should have DRS zones
      const drsPoints = track.controlPoints.filter(cp => cp.drs);
      expect(drsPoints.length).toBeGreaterThan(0);
      
      // Should have gravel runoff
      const gravelPoints = track.controlPoints.filter(cp => cp.runoff === 'gravel');
      expect(gravelPoints.length).toBeGreaterThan(0);
    });

    it('should have valid bergheim data', () => {
      const track = trackLoader.getTrack('bergheim');
      
      expect(track.trackWidth).toBeGreaterThan(0);
      expect(track.controlPoints.length).toBeGreaterThan(15); // Spa-style is long
      
      // Should have DRS zones
      const drsPoints = track.controlPoints.filter(cp => cp.drs);
      expect(drsPoints.length).toBeGreaterThan(0);
      
      // Should have kerbs
      const kerbPoints = track.controlPoints.filter(cp => cp.kerbs);
      expect(kerbPoints.length).toBeGreaterThan(0);
    });

    it('should have three sectors in all tracks', () => {
      const tracks = trackLoader.getAllTracks();
      
      for (const track of tracks) {
        const sectors = new Set(track.controlPoints.map(cp => cp.sector).filter(Boolean));
        expect(sectors.size).toBeGreaterThanOrEqual(3);
      }
    });

    it('should have kerbs on corners in all tracks', () => {
      const tracks = trackLoader.getAllTracks();
      
      for (const track of tracks) {
        const kerbPoints = track.controlPoints.filter(cp => cp.kerbs);
        expect(kerbPoints.length).toBeGreaterThan(0);
      }
    });
  });
});

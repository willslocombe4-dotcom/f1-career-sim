import { describe, it, expect, beforeEach } from 'vitest';
import { TrackBuilder } from '@tracks/TrackBuilder';
import type { TrackData } from '@tracks/types';

describe('TrackBuilder', () => {
  let trackBuilder: TrackBuilder;

  beforeEach(() => {
    trackBuilder = new TrackBuilder(10);
  });

  describe('build()', () => {
    it('should build a simple oval track', () => {
      const trackData: TrackData = {
        id: 'test-oval',
        name: 'Test Oval',
        country: 'Test',
        lengthMeters: 1000,
        raceLaps: 10,
        trackWidth: 60,
        controlPoints: [
          { x: 0, y: 0, sector: 1 },
          { x: 100, y: 0, sector: 1 },
          { x: 150, y: 50, sector: 1 },
          { x: 100, y: 100, sector: 2 },
          { x: 0, y: 100, sector: 2 },
          { x: -50, y: 50, sector: 3 },
        ],
        startFinish: { controlPointIndex: 0 },
      };

      const computed = trackBuilder.build(trackData);

      expect(computed.source).toBe(trackData);
      expect(computed.path.length).toBeGreaterThan(0);
      expect(computed.outerBoundary.length).toBeGreaterThan(0);
      expect(computed.innerBoundary.length).toBeGreaterThan(0);
      expect(computed.racingLine.length).toBeGreaterThan(0);
    });

    it('should create smooth curves through control points', () => {
      const trackData: TrackData = {
        id: 'test-smooth',
        name: 'Test Smooth',
        country: 'Test',
        lengthMeters: 500,
        raceLaps: 20,
        trackWidth: 60,
        controlPoints: [
          { x: 0, y: 0, sector: 1 },
          { x: 100, y: 0, sector: 1 },
          { x: 100, y: 100, sector: 1 },
          { x: 0, y: 100, sector: 1 },
        ],
        startFinish: { controlPointIndex: 0 },
      };

      const computed = trackBuilder.build(trackData);

      // Path should have many more points than control points
      expect(computed.path.length).toBeGreaterThan(trackData.controlPoints.length * 5);
      
      // Path should pass near each control point
      for (const cp of trackData.controlPoints) {
        const nearestDist = Math.min(
          ...computed.path.map(p => 
            Math.sqrt((p.position.x - cp.x) ** 2 + (p.position.y - cp.y) ** 2)
          )
        );
        expect(nearestDist).toBeLessThan(5); // Should be very close to control point
      }
    });

    it('should handle kerbs on control points', () => {
      const trackData: TrackData = {
        id: 'test-kerbs',
        name: 'Test Kerbs',
        country: 'Test',
        lengthMeters: 500,
        raceLaps: 20,
        trackWidth: 60,
        controlPoints: [
          { x: 0, y: 0, sector: 1 },
          { x: 100, y: 0, kerbs: true, sector: 1 },
          { x: 150, y: 50, kerbs: true, sector: 1 },
          { x: 100, y: 100, sector: 1 },
          { x: 0, y: 100, sector: 1 },
          { x: -50, y: 50, sector: 1 },
        ],
        startFinish: { controlPointIndex: 0 },
      };

      const computed = trackBuilder.build(trackData);

      // Should have generated kerbs
      expect(computed.kerbs.length).toBeGreaterThan(0);
      
      // Each kerb should have valid polygon points
      for (const kerb of computed.kerbs) {
        expect(kerb.points.length).toBeGreaterThan(3);
      }
    });

    it('should compute boundaries with correct width', () => {
      const trackWidth = 80;
      const trackData: TrackData = {
        id: 'test-width',
        name: 'Test Width',
        country: 'Test',
        lengthMeters: 500,
        raceLaps: 20,
        trackWidth,
        controlPoints: [
          { x: 0, y: 0, sector: 1 },
          { x: 200, y: 0, sector: 1 },
          { x: 200, y: 100, sector: 1 },
          { x: 0, y: 100, sector: 1 },
        ],
        startFinish: { controlPointIndex: 0 },
      };

      const computed = trackBuilder.build(trackData);

      // Check that boundaries are offset by half track width from center
      const centerPoint = computed.path[0];
      const outerPoint = computed.outerBoundary[0];
      const innerPoint = computed.innerBoundary[0];

      const outerDist = Math.sqrt(
        (outerPoint.x - centerPoint.position.x) ** 2 +
        (outerPoint.y - centerPoint.position.y) ** 2
      );
      const innerDist = Math.sqrt(
        (innerPoint.x - centerPoint.position.x) ** 2 +
        (innerPoint.y - centerPoint.position.y) ** 2
      );

      expect(outerDist).toBeCloseTo(trackWidth / 2, 0);
      expect(innerDist).toBeCloseTo(trackWidth / 2, 0);
    });

    it('should generate racing line with speed factors', () => {
      const trackData: TrackData = {
        id: 'test-racing-line',
        name: 'Test Racing Line',
        country: 'Test',
        lengthMeters: 1000,
        raceLaps: 10,
        trackWidth: 60,
        controlPoints: [
          { x: 0, y: 0, sector: 1 },
          { x: 200, y: 0, sector: 1 },
          { x: 250, y: 50, sector: 1 },
          { x: 200, y: 100, sector: 1 },
          { x: 0, y: 100, sector: 2 },
          { x: -50, y: 50, sector: 2 },
        ],
        startFinish: { controlPointIndex: 0 },
      };

      const computed = trackBuilder.build(trackData);

      // Check racing line has speed factors in valid range
      for (const point of computed.racingLine) {
        expect(point.speedFactor).toBeGreaterThanOrEqual(0);
        expect(point.speedFactor).toBeLessThanOrEqual(1);
      }
    });

    it('should track DRS zones from control points', () => {
      const trackData: TrackData = {
        id: 'test-drs',
        name: 'Test DRS',
        country: 'Test',
        lengthMeters: 800,
        raceLaps: 15,
        trackWidth: 70,
        controlPoints: [
          { x: 0, y: 0, drs: true, sector: 1 },
          { x: 200, y: 0, drs: true, sector: 1 },
          { x: 250, y: 50, sector: 1 },
          { x: 200, y: 100, sector: 2 },
          { x: 0, y: 100, sector: 2 },
          { x: -50, y: 50, sector: 2 },
        ],
        startFinish: { controlPointIndex: 0 },
      };

      const computed = trackBuilder.build(trackData);

      const drsPoints = computed.path.filter(p => p.inDrsZone);
      const nonDrsPoints = computed.path.filter(p => !p.inDrsZone);
      
      expect(drsPoints.length).toBeGreaterThan(0);
      expect(nonDrsPoints.length).toBeGreaterThan(0);
    });

    it('should track sectors from control points', () => {
      const trackData: TrackData = {
        id: 'test-sectors',
        name: 'Test Sectors',
        country: 'Test',
        lengthMeters: 600,
        raceLaps: 12,
        trackWidth: 60,
        controlPoints: [
          { x: 0, y: 0, sector: 1 },
          { x: 100, y: 0, sector: 1 },
          { x: 150, y: 50, sector: 2 },
          { x: 100, y: 100, sector: 2 },
          { x: 0, y: 100, sector: 3 },
          { x: -50, y: 50, sector: 3 },
        ],
        startFinish: { controlPointIndex: 0 },
      };

      const computed = trackBuilder.build(trackData);

      const sector1Points = computed.path.filter(p => p.sector === 1);
      const sector2Points = computed.path.filter(p => p.sector === 2);
      const sector3Points = computed.path.filter(p => p.sector === 3);
      
      expect(sector1Points.length).toBeGreaterThan(0);
      expect(sector2Points.length).toBeGreaterThan(0);
      expect(sector3Points.length).toBeGreaterThan(0);
    });

    it('should throw error for less than 3 control points', () => {
      const trackData: TrackData = {
        id: 'test-invalid',
        name: 'Test Invalid',
        country: 'Test',
        lengthMeters: 100,
        raceLaps: 10,
        trackWidth: 60,
        controlPoints: [
          { x: 0, y: 0, sector: 1 },
          { x: 100, y: 0, sector: 1 },
        ],
        startFinish: { controlPointIndex: 0 },
      };

      expect(() => trackBuilder.build(trackData)).toThrow('at least 3 control points');
    });

    it('should handle variable track width', () => {
      const trackData: TrackData = {
        id: 'test-variable-width',
        name: 'Test Variable Width',
        country: 'Test',
        lengthMeters: 500,
        raceLaps: 20,
        trackWidth: 60,
        controlPoints: [
          { x: 0, y: 0, width: 80, sector: 1 },
          { x: 100, y: 0, width: 80, sector: 1 },
          { x: 150, y: 50, width: 50, sector: 1 },
          { x: 100, y: 100, width: 50, sector: 1 },
          { x: 0, y: 100, width: 60, sector: 1 },
          { x: -50, y: 50, width: 60, sector: 1 },
        ],
        startFinish: { controlPointIndex: 0 },
      };

      const computed = trackBuilder.build(trackData);

      // Track should have varying widths
      const widths = computed.path.map(p => p.width);
      const uniqueWidths = new Set(widths);
      
      // Should have multiple different widths (interpolated)
      expect(uniqueWidths.size).toBeGreaterThan(1);
    });
  });
});

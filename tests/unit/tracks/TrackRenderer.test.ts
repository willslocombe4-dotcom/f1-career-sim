import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrackRenderer } from '@tracks/TrackRenderer';
import { TrackBuilder } from '@tracks/TrackBuilder';
import type { TrackData, ComputedTrack } from '@tracks/types';

// Mock PixiJS
vi.mock('pixi.js', () => ({
  Container: vi.fn().mockImplementation(() => ({
    addChild: vi.fn(),
    removeChild: vi.fn(),
    children: [],
    label: '',
  })),
  Graphics: vi.fn().mockImplementation(() => ({
    rect: vi.fn().mockReturnThis(),
    roundRect: vi.fn().mockReturnThis(),
    ellipse: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    closePath: vi.fn().mockReturnThis(),
    fill: vi.fn().mockReturnThis(),
    stroke: vi.fn().mockReturnThis(),
  })),
}));

describe('TrackRenderer', () => {
  let trackRenderer: TrackRenderer;
  let computedTrack: ComputedTrack;

  beforeEach(() => {
    vi.clearAllMocks();
    trackRenderer = new TrackRenderer();

    // Create a simple computed track for testing using spline control points
    const trackData: TrackData = {
      id: 'test-track',
      name: 'Test Track',
      country: 'Test',
      lengthMeters: 1000,
      raceLaps: 10,
      trackWidth: 60,
      controlPoints: [
        { x: 0, y: 0, sector: 1 },
        { x: 200, y: 0, kerbs: true, sector: 1 },
        { x: 250, y: 50, kerbs: true, sector: 1 },
        { x: 200, y: 100, sector: 2 },
        { x: 0, y: 100, kerbs: true, sector: 2 },
        { x: -50, y: 50, kerbs: true, sector: 2 },
      ],
      startFinish: { controlPointIndex: 0 },
    };

    const builder = new TrackBuilder(10);
    computedTrack = builder.build(trackData);
  });

  describe('render()', () => {
    it('should return a container', () => {
      const container = trackRenderer.render(computedTrack);
      
      expect(container).toBeDefined();
      expect(container.addChild).toHaveBeenCalled();
    });

    it('should set container label with track ID', () => {
      const container = trackRenderer.render(computedTrack);
      
      expect(container.label).toBe('track-test-track');
    });

    it('should add multiple layers to container', () => {
      const container = trackRenderer.render(computedTrack);
      
      // Should add: grass, runoff, asphalt, kerbs, markings, racingLine
      expect(container.addChild).toHaveBeenCalled();
    });
  });

  describe('options', () => {
    it('should accept custom render options', () => {
      const customRenderer = new TrackRenderer({
        showRacingLine: false,
        showKerbs: false,
        asphaltColor: 0x444444,
      });

      const container = customRenderer.render(computedTrack);
      expect(container).toBeDefined();
    });

    it('should update options with setOptions', () => {
      trackRenderer.setOptions({ showRacingLine: false });
      
      const container = trackRenderer.render(computedTrack);
      expect(container).toBeDefined();
    });

    it('should use default options if none provided', () => {
      const defaultRenderer = new TrackRenderer();
      const container = defaultRenderer.render(computedTrack);
      
      expect(container).toBeDefined();
    });
  });

  describe('computed track handling', () => {
    it('should handle track without kerbs', () => {
      const trackWithNoKerbs: TrackData = {
        id: 'no-kerbs',
        name: 'No Kerbs',
        country: 'Test',
        lengthMeters: 500,
        raceLaps: 10,
        trackWidth: 60,
        controlPoints: [
          { x: 0, y: 0, sector: 1 },
          { x: 100, y: 0, sector: 1 },
          { x: 100, y: 100, sector: 1 },
          { x: 0, y: 100, sector: 1 },
        ],
        startFinish: { controlPointIndex: 0 },
      };

      const builder = new TrackBuilder(10);
      const computed = builder.build(trackWithNoKerbs);
      
      expect(computed.kerbs.length).toBe(0);
      
      const container = trackRenderer.render(computed);
      expect(container).toBeDefined();
    });

    it('should handle complex track with many control points', () => {
      const complexTrackData: TrackData = {
        id: 'complex',
        name: 'Complex',
        country: 'Test',
        lengthMeters: 5000,
        raceLaps: 30,
        trackWidth: 70,
        controlPoints: [
          { x: 0, y: 0, sector: 1, drs: true },
          { x: 200, y: 0, sector: 1, drs: true },
          { x: 280, y: 40, sector: 1, kerbs: true },
          { x: 300, y: 120, sector: 1 },
          { x: 260, y: 200, sector: 1, kerbs: true, runoff: 'gravel' },
          { x: 180, y: 260, sector: 2 },
          { x: 100, y: 280, sector: 2, kerbs: true },
          { x: 20, y: 260, sector: 2 },
          { x: -40, y: 200, sector: 2, kerbs: true, runoff: 'tarmac' },
          { x: -60, y: 120, sector: 3 },
          { x: -40, y: 60, sector: 3, kerbs: true },
        ],
        startFinish: { controlPointIndex: 0 },
      };

      const builder = new TrackBuilder(15);
      const computed = builder.build(complexTrackData);
      
      expect(computed.path.length).toBeGreaterThan(100);
      
      const container = trackRenderer.render(computed);
      expect(container).toBeDefined();
    });

    it('should handle track with barrier runoff', () => {
      const barrierTrack: TrackData = {
        id: 'barrier-track',
        name: 'Barrier Track',
        country: 'Test',
        lengthMeters: 1000,
        raceLaps: 20,
        trackWidth: 55,
        controlPoints: [
          { x: 0, y: 0, sector: 1, runoff: 'barrier' },
          { x: 100, y: 0, sector: 1, runoff: 'barrier' },
          { x: 150, y: 50, sector: 1, runoff: 'barrier', kerbs: true },
          { x: 100, y: 100, sector: 2, runoff: 'barrier' },
          { x: 0, y: 100, sector: 2, runoff: 'barrier', kerbs: true },
          { x: -50, y: 50, sector: 3, runoff: 'barrier' },
        ],
        startFinish: { controlPointIndex: 0 },
      };

      const builder = new TrackBuilder(10);
      const computed = builder.build(barrierTrack);
      
      const container = trackRenderer.render(computed);
      expect(container).toBeDefined();
    });
  });
});
